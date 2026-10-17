import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit an event proposal." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    title?: unknown;
    category?: unknown;
    description?: unknown;
    startsAt?: unknown;
    venue?: unknown;
    stateCode?: unknown;
  } | null;
  if (
    typeof body?.title !== "string" ||
    typeof body.category !== "string" ||
    typeof body.description !== "string" ||
    typeof body.startsAt !== "string" ||
    typeof body.venue !== "string" ||
    typeof body.stateCode !== "string"
  ) {
    return NextResponse.json({ error: "Complete all event proposal fields." }, { status: 400 });
  }
  const title = body.title.trim();
  const category = body.category.trim();
  const description = body.description.trim();
  const venue = body.venue.trim();
  const startsAt = new Date(body.startsAt);
  const earliestDate = new Date();
  earliestDate.setMonth(earliestDate.getMonth() + 3);
  if (
    title.length < 3 || title.length > 160 ||
    category.length < 2 || category.length > 80 ||
    description.length < 20 || description.length > 4000 ||
    venue.length < 2 || venue.length > 240 ||
    !Number.isFinite(startsAt.getTime()) || startsAt < earliestDate ||
    !/^[A-Z]{2,3}$/.test(body.stateCode)
  ) {
    return NextResponse.json({
      error: "Check the event details. Proposals must be submitted at least three months before the event date.",
    }, { status: 400 });
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
    return NextResponse.json({ error: "Event proposals are available to active members." }, { status: 403 });
  }
  const [chapter] = await getSql()<{ state_code: string }[]>`
    select state_code from public.chapters where state_code = ${body.stateCode} and is_active
  `;
  if (!chapter) {
    return NextResponse.json({ error: "Choose an active state chapter." }, { status: 400 });
  }
  const [conflicts] = await getSql()<{ count: number }[]>`
    select count(*)::int as count
    from public.events existing
    where existing.state_code = ${chapter.state_code}
      and existing.status in ('submitted', 'needs_information', 'approved')
      and existing.starts_at between ${startsAt.toISOString()}::timestamptz - interval '7 days'
        and ${startsAt.toISOString()}::timestamptz + interval '7 days'
  `;
  const [event] = await getSql()<{
    id: string;
    review_target_at: string;
  }[]>`
    insert into public.events
      (title, category, description, starts_at, state_code, venue, status, created_by, review_target_at)
    values (${title}, ${category}, ${description}, ${startsAt.toISOString()},
      ${chapter.state_code}, ${venue}, 'submitted', ${user.id}, now() + interval '14 days')
    returning id, review_target_at::text
  `;
  await getSql()`
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (${user.id}, 'event.proposed', 'event', ${event.id},
      ${JSON.stringify({ title, stateCode: chapter.state_code, startsAt: startsAt.toISOString() })}::jsonb)
  `;
  return NextResponse.json({
    success: true,
    eventId: event.id,
    expectedReviewBy: event.review_target_at,
    potentialConflicts: conflicts.count,
  }, { status: 201 });
}
