import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validStatuses = new Set(["open", "in_progress", "resolved", "closed"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid support ticket identifier." }, { status: 400 });
  const body = await request.json().catch(() => null) as { status?: unknown; reason?: unknown } | null;
  if (
    typeof body?.status !== "string" || !validStatuses.has(body.status) ||
    typeof body.reason !== "string" || body.reason.trim().length < 5 || body.reason.length > 1000
  ) {
    return NextResponse.json({ error: "Choose a supported status and provide a reason of at least five characters." }, { status: 400 });
  }
  const status = body.status;
  const reason = body.reason.trim();

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in as an administrator." }, { status: 401 });
  if (!(await userHasPermission(user.id, "support.review"))) {
    return NextResponse.json({ error: "You do not have permission to review support tickets." }, { status: 403 });
  }

  try {
    await getSql().begin(async (transaction) => {
      const [ticket] = await transaction<{ id: string; status: string }[]>`
        select id, status from public.support_tickets where id = ${id} for update
      `;
      if (!ticket) throw new Error("TICKET_NOT_FOUND");

      await transaction`
        update public.support_tickets
        set status = ${status}, updated_at = now()
        where id = ${id}
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (
          ${user.id},
          'support.ticket_status_updated',
          'support_ticket',
          ${id},
          ${JSON.stringify({ previous_status: ticket.status, status, reason })}::jsonb
        )
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TICKET_NOT_FOUND") {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
