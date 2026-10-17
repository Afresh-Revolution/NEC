import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid repayment identifier." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as {
    decision?: unknown;
    reason?: unknown;
  } | null;
  const decision = body?.decision;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if ((decision !== "verified" && decision !== "rejected") || reason.length < 5 || reason.length > 1000) {
    return NextResponse.json({ error: "Choose verify or reject and include a review reason." }, { status: 400 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with loan review access." }, { status: 401 });
  if (!await userHasPermission(user.id, "loans.review")) {
    return NextResponse.json({ error: "You are not authorised to review loan repayments." }, { status: 403 });
  }

  const sql = getSql();
  try {
    await sql.begin(async (transaction) => {
      const [repayment] = await transaction<{
        loan_id: string;
        user_id: string;
        amount_minor: string;
        status: string;
      }[]>`
        select loan_id, user_id, amount_minor::text, status
        from public.member_loan_repayments
        where id = ${id}
        for update
      `;
      if (!repayment) throw new Error("REPAYMENT_NOT_FOUND");
      if (repayment.status !== "pending") throw new Error("REPAYMENT_NOT_PENDING");
      if (repayment.user_id === user.id) throw new Error("REPAYMENT_SELF_REVIEW");
      const [loan] = await transaction<{
        outstanding_minor: string;
        status: string;
      }[]>`
        select outstanding_minor::text, status
        from public.member_loans
        where id = ${repayment.loan_id}
        for update
      `;
      if (!loan) throw new Error("LOAN_NOT_FOUND");
      if (decision === "verified") {
        const amountMinor = Number(repayment.amount_minor);
        if (!["active", "defaulted"].includes(loan.status) || amountMinor > Number(loan.outstanding_minor)) {
          throw new Error("REPAYMENT_EXCEEDS_BALANCE");
        }
        const [accounts] = await transaction<{ cash: string; receivable: string }[]>`
          select
            (select id from public.ledger_accounts where account_code = '1020-COOPERATIVE-CASH') as cash,
            (select id from public.ledger_accounts where account_code = '1200-LOANS-RECEIVABLE') as receivable
        `;
        if (!accounts?.cash || !accounts.receivable) throw new Error("Loan ledger accounts are not configured.");
        const [entry] = await transaction<{ id: string }[]>`
          insert into public.journal_entries (source_type, source_id, description)
          values ('loan_repayment', ${id}, 'Reconciled member loan repayment')
          returning id
        `;
        await transaction`
          insert into public.journal_lines (journal_entry_id, ledger_account_id, side, amount_minor)
          values
            (${entry.id}, ${accounts.cash}, 'debit', ${amountMinor}),
            (${entry.id}, ${accounts.receivable}, 'credit', ${amountMinor})
        `;
        await transaction`
          update public.member_loans
          set outstanding_minor = outstanding_minor - ${amountMinor},
            status = case when outstanding_minor - ${amountMinor} = 0 then 'repaid' else status end
          where id = ${repayment.loan_id}
        `;
      }
      await transaction`
        update public.member_loan_repayments
        set status = ${decision}, review_note = ${reason},
          verified_by = case when ${decision} = 'verified' then ${user.id} else null end,
          verified_at = case when ${decision} = 'verified' then now() else null end
        where id = ${id}
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (${user.id}, ${`loan_repayment.${decision}`}, 'member_loan_repayment', ${id},
          ${JSON.stringify({ reason, loanId: repayment.loan_id, amountMinor: repayment.amount_minor })}::jsonb)
      `;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, { message: string; status: number }> = {
      REPAYMENT_NOT_FOUND: { message: "Repayment record not found.", status: 404 },
      REPAYMENT_NOT_PENDING: { message: "This repayment has already been reviewed.", status: 409 },
      REPAYMENT_SELF_REVIEW: { message: "You cannot review your own repayment.", status: 403 },
      LOAN_NOT_FOUND: { message: "The associated loan could not be found.", status: 409 },
      REPAYMENT_EXCEEDS_BALANCE: { message: "The verified repayment exceeds the remaining loan balance.", status: 409 },
    };
    if (known[code]) return NextResponse.json({ error: known[code].message }, { status: known[code].status });
    throw error;
  }
  return NextResponse.json({ success: true });
}
