import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

const validDecisions = new Set(["approved", "needs_information", "declined"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid event identifier." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as {
    decision?: unknown;
    reason?: unknown;
  } | null;
  if (
    typeof body?.decision !== "string" ||
    !validDecisions.has(body.decision) ||
    typeof body.reason !== "string" ||
    body.reason.trim().length < 5 ||
    body.reason.length > 1000
  ) {
    return NextResponse.json(
      { error: "Choose a supported decision and provide a reason of at least five characters." },
      { status: 400 },
    );
  }
  const decision = body.decision;
  const reason = body.reason.trim();

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in with an authorised administrator account." }, { status: 401 });
  }
  const canReviewNational = await userHasPermission(user.id, "events.review.national");
  const canReviewState = await userHasPermission(user.id, "events.review.state");
  if (!canReviewNational && !canReviewState) {
    return NextResponse.json({ error: "You do not have permission to review events." }, { status: 403 });
  }

  try {
    await getSql().begin(async (transaction) => {
      const [event] = await transaction<{
        id: string;
        state_code: string | null;
        created_by: string;
        status: string;
      }[]>`
        select id, state_code, created_by, status
        from public.events
        where id = ${id}
        for update
      `;
      if (!event) throw new Error("EVENT_NOT_FOUND");
      if (event.created_by === user.id) throw new Error("SELF_REVIEW");
      if (event.status !== "submitted") throw new Error("EVENT_NOT_PENDING");

      if (!canReviewNational) {
        const [scope] = await transaction<{ allowed: boolean }[]>`
          select exists (
            select 1
            from public.user_role_assignments assignment
            join public.chapters chapter on chapter.id = assignment.chapter_id
            where assignment.user_id = ${user.id}
              and chapter.state_code = ${event.state_code}
          ) as allowed
        `;
        if (!scope.allowed) throw new Error("EVENT_OUT_OF_SCOPE");
      }

      const nextStatus = decision === "approved"
        ? "approved"
        : decision === "declined"
          ? "declined"
          : "needs_information";
      const isPublic = decision === "approved";
      await transaction`
        insert into public.event_reviews (event_id, reviewer_user_id, decision, reason)
        values (${id}, ${user.id}, ${decision}, ${reason})
      `;
      await transaction`
        update public.events
        set status = ${nextStatus}, is_public = ${isPublic}, updated_at = now()
        where id = ${id}
      `;
      await transaction`
        insert into public.notifications (user_id, notification_type, title, body)
        values (
          ${event.created_by},
          'event_review',
          'Your event proposal was reviewed',
          ${`Decision: ${decision.replaceAll("_", " ")}. ${reason}`}
        )
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (
          ${user.id},
          'event.reviewed',
          'event',
          ${id},
          ${JSON.stringify({ decision, reason })}::jsonb
        )
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const knownErrors: Record<string, { message: string; status: number }> = {
      EVENT_NOT_FOUND: { message: "Event not found.", status: 404 },
      SELF_REVIEW: { message: "You cannot review an event you submitted.", status: 403 },
      EVENT_NOT_PENDING: { message: "This event is no longer awaiting review.", status: 409 },
      EVENT_OUT_OF_SCOPE: { message: "This event is outside your assigned chapter scope.", status: 403 },
    };
    const known = knownErrors[code];
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    throw error;
  }

  return NextResponse.json({ success: true });
}
