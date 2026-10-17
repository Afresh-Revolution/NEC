import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid loan application identifier." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as {
    amountMinor?: unknown;
    repaymentTerms?: unknown;
    disbursementReference?: unknown;
    dueAt?: unknown;
  } | null;
  const amountMinor = Number(body?.amountMinor);
  const repaymentTerms = typeof body?.repaymentTerms === "string" ? body.repaymentTerms.trim() : "";
  const disbursementReference = typeof body?.disbursementReference === "string" ? body.disbursementReference.trim() : "";
  const dueAt = typeof body?.dueAt === "string" ? body.dueAt : "";
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueAt) ? new Date(`${dueAt}T00:00:00Z`) : null;
  if (
    !Number.isSafeInteger(amountMinor) || amountMinor < 10_000 ||
    repaymentTerms.length < 10 || repaymentTerms.length > 2000 ||
    disbursementReference.length < 3 || disbursementReference.length > 160 ||
    !dueDate || Number.isNaN(dueDate.getTime()) ||
    dueDate.toISOString().slice(0, 10) !== dueAt ||
    dueAt <= new Date().toISOString().slice(0, 10) ||
    dueDate.getUTCMonth() === 11
  ) {
    return NextResponse.json({ error: "Enter valid issuance amount, disbursement reference, repayment terms and a due date before December." }, { status: 400 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with loan-issuance access." }, { status: 401 });
  if (!await userHasPermission(user.id, "loans.review")) {
    return NextResponse.json({ error: "You are not authorised to record loan issuance." }, { status: 403 });
  }

  const sql = getSql();
  try {
    const loan = await sql.begin(async (transaction) => {
      const [application] = await transaction<{
        user_id: string;
        amount_minor: string;
        requested_repayment_year: number;
        status: string;
      }[]>`
        select user_id, amount_minor::text, requested_repayment_year, status
        from public.member_loan_applications
        where id = ${id}
        for update
      `;
      if (!application) throw new Error("LOAN_APPLICATION_NOT_FOUND");
      if (application.user_id === user.id) throw new Error("LOAN_SELF_ISSUANCE");
      if (application.status !== "approved") throw new Error("LOAN_NOT_APPROVED");
      if (Number(application.amount_minor) < amountMinor) throw new Error("LOAN_AMOUNT_EXCEEDS_REQUEST");
      if (dueDate.getUTCFullYear() !== application.requested_repayment_year) {
        throw new Error("LOAN_DUE_YEAR_MISMATCH");
      }
      const [existing] = await transaction<{ id: string }[]>`
        select id from public.member_loans where application_id = ${id}
      `;
      if (existing) throw new Error("LOAN_ALREADY_ISSUED");
      const [issued] = await transaction<{ id: string }[]>`
        insert into public.member_loans (
          application_id, user_id, principal_minor, outstanding_minor,
          repayment_terms, disbursement_reference, due_at, issued_by
        )
        values (
          ${id}, ${application.user_id}, ${amountMinor}, ${amountMinor},
          ${repaymentTerms}, ${disbursementReference}, ${dueAt}, ${user.id}
        )
        returning id
      `;
      const [accounts] = await transaction<{ cash: string; receivable: string }[]>`
        select
          (select id from public.ledger_accounts where account_code = '1020-COOPERATIVE-CASH') as cash,
          (select id from public.ledger_accounts where account_code = '1200-LOANS-RECEIVABLE') as receivable
      `;
      if (!accounts?.cash || !accounts.receivable) throw new Error("Loan ledger accounts are not configured.");
      const [entry] = await transaction<{ id: string }[]>`
        insert into public.journal_entries (source_type, source_id, description)
        values ('loan_disbursement', ${issued.id}, 'Recorded member loan disbursement')
        returning id
      `;
      await transaction`
        insert into public.journal_lines (journal_entry_id, ledger_account_id, side, amount_minor)
        values
          (${entry.id}, ${accounts.receivable}, 'debit', ${amountMinor}),
          (${entry.id}, ${accounts.cash}, 'credit', ${amountMinor})
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (${user.id}, 'loan.issued', 'member_loan', ${issued.id},
          ${JSON.stringify({ applicationId: id, amountMinor, dueAt, disbursementReference })}::jsonb)
      `;
      return issued;
    });
    return NextResponse.json({ success: true, loanId: loan.id }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const knownErrors: Record<string, { message: string; status: number }> = {
      LOAN_APPLICATION_NOT_FOUND: { message: "Loan application not found.", status: 404 },
      LOAN_SELF_ISSUANCE: { message: "You cannot record issuance for your own loan application.", status: 403 },
      LOAN_NOT_APPROVED: { message: "The loan application must be approved before issuance is recorded.", status: 409 },
      LOAN_AMOUNT_EXCEEDS_REQUEST: { message: "The issued amount cannot exceed the requested amount.", status: 400 },
      LOAN_DUE_YEAR_MISMATCH: { message: "The due date must be in the agreed repayment year.", status: 400 },
      LOAN_ALREADY_ISSUED: { message: "A loan has already been issued for this application.", status: 409 },
    };
    const known = knownErrors[code];
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    throw error;
  }
}
