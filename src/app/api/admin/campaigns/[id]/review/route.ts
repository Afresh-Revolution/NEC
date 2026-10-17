import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid campaign identifier." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as {
    decision?: unknown;
    reason?: unknown;
  } | null;
  const decision = body?.decision;
  const reason = body?.reason;
  if (
    (decision !== "under_review" && decision !== "eligible" && decision !== "ineligible") ||
    typeof reason !== "string" || reason.trim().length < 5 || reason.length > 1000
  ) {
    return NextResponse.json({ error: "Choose an eligibility decision and provide a reason." }, { status: 400 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with election review access." }, { status: 401 });
  if (!await userHasPermission(user.id, "elections.review")) {
    return NextResponse.json({ error: "You are not authorised to review election campaigns." }, { status: 403 });
  }
  const [campaign] = await getSql()<{
    id: string;
  }[]>`
    update public.management_campaigns
    set status = ${decision}, review_note = ${reason.trim()}
    where id = ${id} and status in ('submitted', 'under_review')
    returning id
  `;
  if (!campaign) return NextResponse.json({ error: "Campaign not found or no longer awaiting review." }, { status: 409 });
  await getSql()`
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (${user.id}, ${`management_campaign.${decision}`}, 'management_campaign', ${id},
      ${JSON.stringify({ reason: reason.trim() })}::jsonb)
  `;
  return NextResponse.json({ success: true });
}
