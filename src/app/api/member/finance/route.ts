import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

const monthlyContributionMinor = 1_000_000;

async function getActiveMember(userId: string) {
  const [member] = await getSql()<{ user_id: string }[]>`
    select membership.user_id
    from public.memberships membership
    join public.membership_subscriptions fee on fee.user_id = membership.user_id
    where membership.user_id = ${userId}
      and membership.status = 'active'
      and fee.status in ('active', 'non_renewing')
      and fee.current_period_end > now()
  `;
  return member ?? null;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to view cooperative financial records." }, { status: 401 });

  const sql = getSql();
  const [contributions, annualRequests, loanApplications, annualReports, loans, repayments] = await Promise.all([
    sql<{
      id: string;
      contribution_type: string;
      amount_minor: string;
      contribution_year: number;
      contribution_month: number | null;
      payment_reference: string;
      status: string;
      created_at: string;
    }[]>`
      select id, contribution_type, amount_minor::text, contribution_year,
        contribution_month, payment_reference, status, created_at
      from public.member_contributions
      where user_id = ${user.id}
      order by contribution_year desc, contribution_month desc nulls last, created_at desc
      limit 100
    `,
    sql<{
      id: string;
      report_year: number;
      request_type: string;
      contribution_balance_minor: string;
      rollover_bonus_minor: string;
      allocated_profit_minor: string;
      status: string;
      created_at: string;
    }[]>`
      select id, report_year, request_type, contribution_balance_minor::text,
        rollover_bonus_minor::text, allocated_profit_minor::text, status, created_at
      from public.annual_member_requests
      where user_id = ${user.id}
      order by report_year desc
    `,
    sql<{
      id: string;
      amount_minor: string;
      project_name: string;
      requested_repayment_year: number;
      status: string;
      created_at: string;
    }[]>`
      select id, amount_minor::text, project_name, requested_repayment_year, status, created_at
      from public.member_loan_applications
      where user_id = ${user.id}
      order by created_at desc
    `,
    sql<{ report_year: number }[]>`
      select report_year
      from public.cooperative_reports
      where report_type = 'annual' and published
      order by report_year desc
    `,
    sql<{
      id: string;
      principal_minor: string;
      outstanding_minor: string;
      repayment_terms: string;
      due_at: string;
      status: string;
    }[]>`
      select id, principal_minor::text, outstanding_minor::text,
        repayment_terms, due_at::text, status
      from public.member_loans
      where user_id = ${user.id}
      order by issued_at desc
    `,
    sql<{
      id: string;
      loan_id: string;
      amount_minor: string;
      payment_reference: string;
      status: string;
      created_at: string;
    }[]>`
      select id, loan_id, amount_minor::text, payment_reference, status, created_at::text
      from public.member_loan_repayments
      where user_id = ${user.id}
      order by created_at desc
    `,
  ]);
  return NextResponse.json({ contributions, annualRequests, loanApplications, annualReports, loans, repayments });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a cooperative request." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "Choose a valid request type." }, { status: 400 });
  }
  const activeMember = await getActiveMember(user.id);
  if (!activeMember && body.type !== "loan_repayment") {
    return NextResponse.json({ error: "This cooperative service is available to active members." }, { status: 403 });
  }

  if (body.type === "contribution") {
    const amountMinor = Number(body.amountMinor);
    const contributionType = body.contributionType;
    const paymentReference = typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
    const year = Number(body.year);
    const month = body.month === undefined || body.month === "" ? null : Number(body.month);
    if (
      (contributionType !== "monthly" && contributionType !== "additional") ||
      !Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 100_000_000_000 ||
      !Number.isInteger(year) || year < 2020 || year > new Date().getFullYear() ||
      (contributionType === "monthly" && (
        amountMinor !== monthlyContributionMinor || !Number.isInteger(month) || month! < 1 || month! > 12
      )) ||
      (contributionType === "additional" && month !== null) ||
      paymentReference.length < 3 || paymentReference.length > 160
    ) {
      return NextResponse.json({ error: "Enter a valid contribution amount, period and payment reference." }, { status: 400 });
    }
    const [entry] = await getSql()<{
      id: string;
      status: string;
    }[]>`
      insert into public.member_contributions
        (user_id, contribution_type, amount_minor, contribution_year,
          contribution_month, payment_reference)
      values (${user.id}, ${contributionType}, ${amountMinor}, ${year}, ${month}, ${paymentReference})
      on conflict (user_id, payment_reference) do nothing
      returning id, status
    `;
    if (!entry) {
      return NextResponse.json({ error: "That payment reference has already been submitted." }, { status: 409 });
    }
    await getSql()`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (${user.id}, 'contribution.submitted', 'member_contribution', ${entry.id},
        ${JSON.stringify({ contributionType, amountMinor, year, month })}::jsonb)
    `;
    return NextResponse.json({ success: true, contribution: entry }, { status: 201 });
  }

  if (body.type === "annual_request") {
    const reportYear = Number(body.reportYear);
    const requestType = body.requestType;
    if (
      !Number.isInteger(reportYear) || reportYear < 2020 || reportYear > new Date().getFullYear() ||
      (requestType !== "profits_only" && requestType !== "profits_and_contributions")
    ) {
      return NextResponse.json({ error: "Choose a valid annual report and request option." }, { status: 400 });
    }
    const [report] = await getSql()<{
      id: string;
      profits_minor: string | null;
    }[]>`
      select id, profits_minor::text from public.cooperative_reports
      where report_type = 'annual' and report_year = ${reportYear} and published
    `;
    if (!report || report.profits_minor === null) {
      return NextResponse.json({ error: "An annual report with declared profits must be published before requests open for that year." }, { status: 409 });
    }
    const [annualRequest, balanceMinor, rolloverBonusMinor, hasShareSnapshot] = await getSql().begin(async (transaction) => {
      const [memberShare] = await transaction<{
        eligible_balance_minor: string;
        allocated_profit_minor: string;
      }[]>`
        select eligible_balance_minor::text, allocated_profit_minor::text
        from public.annual_profit_shares share
        where report_id = ${report.id} and user_id = ${user.id}
        for update
      `;
      if (!memberShare) return [null, "0", "0", false] as const;
      const memberAmount = BigInt(memberShare.eligible_balance_minor);
      const rolloverBonus = requestType === "profits_only" ? memberAmount / BigInt(10) : BigInt(0);
      const [createdRequest] = await transaction<{
        id: string;
        status: string;
        allocated_profit_minor: string;
      }[]>`
        insert into public.annual_member_requests
          (user_id, report_year, request_type, contribution_balance_minor,
            rollover_bonus_minor, allocated_profit_minor, distribution_rate_bps)
        values (
          ${user.id}, ${reportYear}, ${requestType}, ${memberAmount.toString()},
          ${rolloverBonus.toString()}, ${memberShare.allocated_profit_minor}, 7000
        )
        on conflict (user_id, report_year) do nothing
        returning id, status, allocated_profit_minor::text
      `;
      if (!createdRequest) return [null, memberAmount.toString(), rolloverBonus.toString(), true] as const;
      if (requestType === "profits_only") {
        await transaction`
          insert into public.member_rollovers
            (user_id, source_year, target_year, contribution_balance_minor, bonus_minor)
          values (${user.id}, ${reportYear}, ${reportYear + 1}, ${memberAmount.toString()}, ${rolloverBonus.toString()})
        `;
      }
      return [createdRequest, memberAmount.toString(), rolloverBonus.toString(), true] as const;
    });
    if (!annualRequest) {
      if (!hasShareSnapshot) {
        return NextResponse.json({ error: "No verified contribution balance was included in the published annual allocation." }, { status: 409 });
      }
      return NextResponse.json({ error: "You have already submitted a request for this annual report." }, { status: 409 });
    }
    await getSql()`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (${user.id}, 'annual_request.submitted', 'annual_member_request', ${annualRequest.id},
        ${JSON.stringify({ reportYear, requestType, balanceMinor, rolloverBonusMinor })}::jsonb)
    `;
    return NextResponse.json({
      success: true,
      request: annualRequest,
      contributionBalanceMinor: balanceMinor,
      rolloverBonusMinor,
      allocatedProfitMinor: annualRequest.allocated_profit_minor,
    }, { status: 201 });
  }

  if (body.type === "loan_request") {
    const amountMinor = Number(body.amountMinor);
    const projectName = typeof body.projectName === "string" ? body.projectName.trim() : "";
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
    const repaymentYear = Number(body.repaymentYear);
    const currentYear = new Date().getFullYear();
    if (
      !Number.isSafeInteger(amountMinor) || amountMinor < 10_000 || amountMinor > 100_000_000_000 ||
      projectName.length < 2 || projectName.length > 160 ||
      purpose.length < 20 || purpose.length > 3000 ||
      !Number.isInteger(repaymentYear) || repaymentYear < currentYear || repaymentYear > currentYear + 5
    ) {
      return NextResponse.json({ error: "Enter a valid project, request amount, purpose and repayment year." }, { status: 400 });
    }
    const [loan] = await getSql()<{
      id: string;
      status: string;
    }[]>`
      insert into public.member_loan_applications
        (user_id, amount_minor, purpose, project_name, requested_repayment_year)
      values (${user.id}, ${amountMinor}, ${purpose}, ${projectName}, ${repaymentYear})
      returning id, status
    `;
    await getSql()`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (${user.id}, 'loan_application.submitted', 'member_loan_application', ${loan.id},
        ${JSON.stringify({ amountMinor, repaymentYear })}::jsonb)
    `;
    return NextResponse.json({ success: true, request: loan }, { status: 201 });
  }

  if (body.type === "loan_repayment") {
    const loanId = typeof body.loanId === "string" ? body.loanId : "";
    const amountMinor = Number(body.amountMinor);
    const paymentReference = typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(loanId) ||
      !Number.isSafeInteger(amountMinor) || amountMinor < 100 ||
      paymentReference.length < 3 || paymentReference.length > 160
    ) {
      return NextResponse.json({ error: "Enter a valid repayment amount and payment reference." }, { status: 400 });
    }
    const [repayment, repaymentReason] = await getSql().begin(async (transaction) => {
      const [loan] = await transaction<{
        id: string;
        outstanding_minor: string;
        status: string;
      }[]>`
        select id, outstanding_minor::text, status
        from public.member_loans
        where id = ${loanId} and user_id = ${user.id}
        for update
      `;
      if (!loan) return [null, "LOAN_NOT_FOUND"] as const;
      if (!["active", "defaulted"].includes(loan.status)) return [null, "LOAN_NOT_REPAYABLE"] as const;
      const [pending] = await transaction<{ amount_minor: string }[]>`
        select coalesce(sum(amount_minor), 0)::text as amount_minor
        from public.member_loan_repayments
        where loan_id = ${loan.id} and status = 'pending'
      `;
      if (amountMinor + Number(pending.amount_minor) > Number(loan.outstanding_minor)) {
        return [null, "REPAYMENT_EXCEEDS_BALANCE"] as const;
      }
      const [created] = await transaction<{ id: string; status: string }[]>`
        insert into public.member_loan_repayments (loan_id, user_id, amount_minor, payment_reference)
        values (${loan.id}, ${user.id}, ${amountMinor}, ${paymentReference})
        on conflict (loan_id, payment_reference) do nothing
        returning id, status
      `;
      if (created) {
        await transaction`
          insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
          values (${user.id}, 'loan_repayment.submitted', 'member_loan_repayment', ${created.id},
            ${JSON.stringify({ loanId, amountMinor })}::jsonb)
        `;
      }
      return [created ?? null, created ? "CREATED" : "DUPLICATE_REFERENCE"] as const;
    });
    if (!repayment) {
      const errors: Record<string, { message: string; status: number }> = {
        LOAN_NOT_FOUND: { message: "Loan not found for this account.", status: 404 },
        LOAN_NOT_REPAYABLE: { message: "This loan is not accepting repayments.", status: 409 },
        REPAYMENT_EXCEEDS_BALANCE: { message: "Repayment amount cannot exceed the remaining balance.", status: 400 },
        DUPLICATE_REFERENCE: { message: "That repayment reference has already been submitted.", status: 409 },
      };
      const known = errors[repaymentReason];
      if (!known) throw new Error("Unexpected loan repayment submission state.");
      return NextResponse.json({ error: known.message }, { status: known.status });
    }
    return NextResponse.json({ success: true, repayment }, { status: 201 });
  }

  return NextResponse.json({ error: "Choose a supported request type." }, { status: 400 });
}
