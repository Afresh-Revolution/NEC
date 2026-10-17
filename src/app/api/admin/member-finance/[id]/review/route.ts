import { NextResponse } from "next/server";
import { getAuthenticatedUser, userHasPermission } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid request identifier." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as {
    type?: unknown;
    decision?: unknown;
    reason?: unknown;
  } | null;
  const type = body?.type;
  const decision = body?.decision;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (
    (type !== "loan_request" && type !== "annual_request") ||
    (decision !== "under_review" && decision !== "needs_information" && decision !== "approved" && decision !== "declined") ||
    reason.length < 5 || reason.length > 1000 ||
    (type === "annual_request" && (decision === "needs_information" || decision === "approved"))
  ) {
    return NextResponse.json({ error: "Choose an allowed review action and provide a reason." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in with review access." }, { status: 401 });
  const permission = type === "loan_request" ? "loans.review" : "reports.view.national";
  if (!await userHasPermission(user.id, permission)) {
    return NextResponse.json({ error: "You are not authorised to review this request." }, { status: 403 });
  }

  const sql = getSql();
  let updated = false;
  if (type === "loan_request") {
    const [application] = await sql<{ user_id: string }[]>`
      select user_id from public.member_loan_applications where id = ${id}
    `;
    if (!application) {
      return NextResponse.json({ error: "The loan request was not found." }, { status: 404 });
    }
    if (application.user_id === user.id) {
      return NextResponse.json({ error: "You cannot review your own loan application." }, { status: 403 });
    }
    const [row] = await sql<{ id: string }[]>`
      update public.member_loan_applications
      set status = ${decision}, review_note = ${reason},
        reviewed_by = ${user.id}, reviewed_at = now()
      where id = ${id} and status in ('submitted', 'under_review')
      returning id
    `;
    updated = Boolean(row);
  } else {
    const [row] = await sql<{ id: string }[]>`
      update public.annual_member_requests
      set status = ${decision}, updated_at = now()
      where id = ${id} and status in ('submitted', 'under_review')
      returning id
    `;
    updated = Boolean(row);
  }
  if (!updated) {
    return NextResponse.json({ error: "The request was not found or is no longer awaiting review." }, { status: 409 });
  }
  await sql`
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (${user.id}, ${`${type}.${decision}`}, ${type}, ${id},
      ${JSON.stringify({ reason })}::jsonb)
  `;
  return NextResponse.json({ success: true });
}
