import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your campaign statements." }, { status: 401 });
  const campaigns = await getSql()<{
    id: string;
    position: string;
    chapter_state_code: string | null;
    election_year: number;
    statement: string;
    status: string;
    review_note: string | null;
    created_at: string;
  }[]>`
    select id, position, chapter_state_code, election_year, statement,
      status, review_note, created_at::text
    from public.management_campaigns
    where user_id = ${user.id}
    order by election_year desc, created_at desc
  `;
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit a campaign statement." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    position?: unknown;
    chapterStateCode?: unknown;
    electionYear?: unknown;
    statement?: unknown;
  } | null;
  if (
    typeof body?.position !== "string" ||
    typeof body.electionYear !== "string" ||
    typeof body.statement !== "string" ||
    (body.chapterStateCode !== undefined && typeof body.chapterStateCode !== "string")
  ) {
    return NextResponse.json({ error: "Complete the campaign statement fields." }, { status: 400 });
  }
  const position = body.position.trim();
  const statement = body.statement.trim();
  const electionYear = Number(body.electionYear);
  const chapterStateCode = typeof body.chapterStateCode === "string" && body.chapterStateCode.trim()
    ? body.chapterStateCode.trim()
    : null;
  const currentYear = new Date().getFullYear();
  if (
    position.length < 2 || position.length > 120 ||
    statement.length < 20 || statement.length > 3000 ||
    !Number.isInteger(electionYear) || electionYear < currentYear || electionYear > currentYear + 2 ||
    (chapterStateCode !== null && !/^[A-Z]{2,3}$/.test(chapterStateCode))
  ) {
    return NextResponse.json({ error: "Check the position, statement, state code and election year." }, { status: 400 });
  }
  const [member] = await getSql()<{ user_id: string }[]>`
    select membership.user_id
    from public.memberships membership
    join public.membership_subscriptions fee on fee.user_id = membership.user_id
    where membership.user_id = ${user.id}
      and membership.status = 'active'
      and fee.status in ('active', 'non_renewing')
      and fee.current_period_end > now()
  `;
  if (!member) {
    return NextResponse.json({ error: "Election campaigns are available to active members." }, { status: 403 });
  }
  if (chapterStateCode) {
    const [chapter] = await getSql()<{ state_code: string }[]>`
      select state_code from public.chapters where state_code = ${chapterStateCode} and is_active
    `;
    if (!chapter) return NextResponse.json({ error: "Choose an active state chapter." }, { status: 400 });
  }
  const [campaign] = await getSql()<{
    id: string;
  }[]>`
    insert into public.management_campaigns
      (user_id, position, chapter_state_code, election_year, statement)
    values (${user.id}, ${position}, ${chapterStateCode}, ${electionYear}, ${statement})
    returning id
  `;
  await getSql()`
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (${user.id}, 'management_campaign.submitted', 'management_campaign', ${campaign.id},
      ${JSON.stringify({ position, chapterStateCode, electionYear })}::jsonb)
  `;
  return NextResponse.json({ success: true, campaignId: campaign.id }, { status: 201 });
}
