import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid contribution identifier." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as {
    decision?: unknown;
    reason?: unknown;
  } | null;
  const decision = body?.decision;
  const reasonValue = body?.reason;
  if (
    (decision !== "verified" && decision !== "rejected") ||
    typeof reasonValue !== "string" || reasonValue.trim().length < 5 || reasonValue.length > 1000
  ) {
    return NextResponse.json({ error: "Choose verify or reject and include a review reason." }, { status: 400 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with contribution review access." }, { status: 401 });
  const permitted = await userHasPermission(user.id, "contributions.review") ||
    await userHasPermission(user.id, "payments.reconcile");
  if (!permitted) return NextResponse.json({ error: "You are not authorised to review contributions." }, { status: 403 });

  await getSql().begin(async (transaction) => {
    const [contribution] = await transaction<{
      user_id: string;
      amount_minor: string;
      status: string;
    }[]>`
      select user_id, amount_minor::text, status
      from public.member_contributions
      where id = ${id}
      for update
    `;
    if (!contribution) throw new Error("CONTRIBUTION_NOT_FOUND");
    if (contribution.status !== "pending") throw new Error("CONTRIBUTION_NOT_PENDING");
    const reason = reasonValue.trim();
    if (decision === "verified") {
      const [entry] = await transaction<{ id: string }[]>`
        insert into public.journal_entries (source_type, source_id, description)
        values ('member_contribution', ${id}, 'Reconciled member cooperative contribution')
        returning id
      `;
      const [accounts] = await transaction<{ deposits: string; contributions: string }[]>`
        select
          (select id from public.ledger_accounts where account_code = '1010-MEMBER-CONTRIBUTIONS-CLEARING') as deposits,
          (select id from public.ledger_accounts where account_code = '2100-MEMBER-CONTRIBUTIONS') as contributions
      `;
      if (!accounts?.deposits || !accounts.contributions) {
        throw new Error("Contribution ledger accounts are not configured.");
      }
      await transaction`
        insert into public.journal_lines (journal_entry_id, ledger_account_id, side, amount_minor)
        values
          (${entry.id}, ${accounts.deposits}, 'debit', ${Number(contribution.amount_minor)}),
          (${entry.id}, ${accounts.contributions}, 'credit', ${Number(contribution.amount_minor)})
      `;
    }
    await transaction`
      update public.member_contributions
      set status = ${decision}, verified_by = ${decision === "verified" ? user.id : null},
        verified_at = case when ${decision === "verified"} then now() else null end,
        review_note = ${reason}
      where id = ${id}
    `;
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (${user.id}, ${`contribution.${decision}`}, 'member_contribution', ${id},
        ${JSON.stringify({ reason, amountMinor: contribution.amount_minor })}::jsonb)
    `;
  });
  return NextResponse.json({ success: true });
}
