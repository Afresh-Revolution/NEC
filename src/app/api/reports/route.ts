import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

function minorUnits(value: unknown): number | null | undefined {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value);
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) return undefined;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) ? minor : undefined;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with report-publishing access." }, { status: 401 });
  if (!await userHasPermission(user.id, "reports.publish.national")) {
    return NextResponse.json({ error: "You are not authorised to publish cooperative reports." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    reportType?: unknown;
    reportYear?: unknown;
    reportQuarter?: unknown;
    title?: unknown;
    summary?: unknown;
    profits?: unknown;
    losses?: unknown;
    reserves?: unknown;
    opportunities?: unknown;
  } | null;
  const reportType = body?.reportType;
  const reportYear = Number(body?.reportYear);
  const reportQuarter = body?.reportQuarter === "" || body?.reportQuarter === undefined
    ? null
    : Number(body.reportQuarter);
  const profitsMinor = minorUnits(body?.profits);
  const lossesMinor = minorUnits(body?.losses);
  const reservesMinor = minorUnits(body?.reserves);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const opportunities = typeof body?.opportunities === "string" ? body.opportunities.trim() : "";
  const currentYear = new Date().getFullYear();
  if (
    (reportType !== "quarterly" && reportType !== "annual") ||
    !Number.isInteger(reportYear) || reportYear < 2020 ||
    (reportType === "annual" ? reportYear >= currentYear : reportYear > currentYear) ||
    (reportType === "quarterly"
      ? !Number.isInteger(reportQuarter) || reportQuarter! < 1 || reportQuarter! > 4
      : reportQuarter !== null) ||
    title.length < 5 || title.length > 180 ||
    summary.length < 20 || summary.length > 10000 ||
    profitsMinor === undefined || lossesMinor === undefined || reservesMinor === undefined ||
    opportunities.length > 5000
  ) {
    return NextResponse.json({ error: "Complete the report with valid dates, financial figures and summary." }, { status: 400 });
  }
  if (reportType === "quarterly" && reportQuarter !== null) {
    const quarterEnd = new Date(Date.UTC(reportYear, reportQuarter * 3, 1));
    if (quarterEnd.getTime() > Date.now()) {
      return NextResponse.json({ error: "A quarterly report can only be published after its quarter has ended." }, { status: 400 });
    }
  }

  const report = await getSql().begin(async (transaction) => {
    const [createdReport] = await transaction<{
      id: string;
    }[]>`
      insert into public.cooperative_reports (
        report_type, report_year, report_quarter, title, summary,
        profits_minor, losses_minor, reserve_minor, opportunities,
        published, published_by, published_at
      )
      values (
        ${reportType}, ${reportYear}, ${reportQuarter}, ${title}, ${summary},
        ${profitsMinor}, ${lossesMinor}, ${reservesMinor}, ${opportunities || null},
        true, ${user.id}, now()
      )
      on conflict (report_type, report_year, (coalesce(report_quarter, 0))) do update set
        title = excluded.title,
        summary = excluded.summary,
        profits_minor = excluded.profits_minor,
        losses_minor = excluded.losses_minor,
        reserve_minor = excluded.reserve_minor,
        opportunities = excluded.opportunities,
        published_by = excluded.published_by,
        published_at = now()
      where not public.cooperative_reports.published
      returning id
    `;
    if (!createdReport) return null;
    if (reportType === "annual" && profitsMinor !== null) {
      await transaction`
        with balances as (
          select account.id as user_id,
            coalesce(contributions.amount_minor, 0) + coalesce(rollovers.amount_minor, 0) as eligible_balance
          from public.app_users account
          left join lateral (
            select sum(contribution.amount_minor) as amount_minor
            from public.member_contributions contribution
            where contribution.user_id = account.id
              and contribution.contribution_year = ${reportYear}
              and contribution.status = 'verified'
          ) contributions on true
          left join lateral (
            select sum(rollover.contribution_balance_minor + rollover.bonus_minor) as amount_minor
            from public.member_rollovers rollover
            where rollover.user_id = account.id
              and rollover.target_year = ${reportYear}
              and rollover.status = 'active'
          ) rollovers on true
        ),
        total as (select coalesce(sum(eligible_balance), 0) as amount from balances),
        distribution as (
          select floor(greatest(${profitsMinor}::numeric - coalesce(${lossesMinor}, 0)::numeric, 0) * 0.70) as amount
        )
        insert into public.annual_profit_shares (
          report_id, user_id, eligible_balance_minor,
          allocated_profit_minor, distribution_rate_bps
        )
        select ${createdReport.id}, balances.user_id, balances.eligible_balance,
          case when total.amount > 0
            then floor(distribution.amount * balances.eligible_balance / total.amount)
            else 0
          end,
          7000
        from balances
        cross join total
        cross join distribution
        where balances.eligible_balance > 0
      `;
    }
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (${user.id}, 'cooperative_report.published', 'cooperative_report', ${createdReport.id},
        ${JSON.stringify({ reportType, reportYear, reportQuarter })}::jsonb)
    `;
    return createdReport;
  });
  if (!report) {
    return NextResponse.json({ error: "That report period has already been published and cannot be overwritten." }, { status: 409 });
  }
  return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
}
