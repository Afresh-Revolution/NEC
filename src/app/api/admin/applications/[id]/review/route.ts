import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

const validDecisions = new Set(["approved", "needs_information", "rejected"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid application identifier." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as {
    decision?: unknown;
    reason?: unknown;
  } | null;
  const decision = body?.decision;
  const reason = body?.reason;
  if (
    typeof decision !== "string" ||
    !validDecisions.has(decision) ||
    typeof reason !== "string" ||
    reason.trim().length < 5 ||
    reason.length > 1000
  ) {
    return NextResponse.json({ error: "A supported decision and a reason of at least five characters are required." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with an authorised administrator account." }, { status: 401 });
  if (!(await userHasPermission(user.id, "applications.review"))) {
    return NextResponse.json({ error: "You do not have permission to review applications." }, { status: 403 });
  }

  try {
    await getSql().begin(async (transaction) => {
      const [application] = await transaction<{ id: string; user_id: string; status: string }[]>`
        select id, user_id, status
        from public.membership_applications
        where id = ${id}
        for update
      `;
      if (!application) throw new Error("APPLICATION_NOT_FOUND");
      if (application.user_id === user.id) throw new Error("SELF_REVIEW");
      if (!["submitted", "needs_information"].includes(application.status)) {
        throw new Error("APPLICATION_ALREADY_DECIDED");
      }
      if (decision === "approved") {
        const [subscription] = await transaction<{ active: boolean }[]>`
          select exists (
            select 1 from public.membership_subscriptions
            where application_id = ${id}
              and status in ('active', 'non_renewing')
              and current_period_end > now()
          ) as active
        `;
        if (!subscription.active) throw new Error("ACTIVE_SUBSCRIPTION_REQUIRED");
      }

      await transaction`
        update public.membership_applications
        set status = ${decision}, reviewed_at = now(), reviewed_by = ${user.id},
            review_reason = ${reason.trim()}, updated_at = now()
        where id = ${id}
      `;

      if (decision === "approved") {
        const memberNumber = `NEC-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        await transaction`
          insert into public.memberships (application_id, user_id, member_number, status)
          values (${id}, ${application.user_id}, ${memberNumber}, 'active')
        `;
        await transaction`
          insert into public.user_role_assignments (user_id, role_id, assigned_by)
          select ${application.user_id}, id, ${user.id}
          from public.roles where role_code = 'member'
          on conflict do nothing
        `;
      }

      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (
          ${user.id},
          'application.reviewed',
          'membership_application',
          ${id},
          ${JSON.stringify({ decision, reason: reason.trim() })}::jsonb
        )
      `;
      await transaction`
        insert into public.email_outbox (recipient, template, payload, dedupe_key)
        select account.email, 'application_update',
          ${JSON.stringify({ decision, reason: reason.trim() })}::jsonb,
          ${`application-update:${id}:${decision}`}
        from public.app_users account
        where account.id = ${application.user_id}
        on conflict (dedupe_key) do nothing
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, { message: string; status: number }> = {
      APPLICATION_NOT_FOUND: { message: "Application not found.", status: 404 },
      SELF_REVIEW: { message: "Administrators cannot review their own application.", status: 403 },
      APPLICATION_ALREADY_DECIDED: { message: "This application has already been decided.", status: 409 },
      ACTIVE_SUBSCRIPTION_REQUIRED: { message: "Membership cannot be approved without a current verified annual membership fee.", status: 409 },
    };
    const known = messages[code];
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    throw error;
  }

  return NextResponse.json({ success: true });
}
