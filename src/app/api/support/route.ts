import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in before contacting member support." }, { status: 401 });
  const body = await request.json().catch(() => null) as { subject?: unknown; details?: unknown } | null;
  if (
    typeof body?.subject !== "string" ||
    body.subject.trim().length < 3 ||
    body.subject.trim().length > 120 ||
    typeof body.details !== "string" ||
    body.details.trim().length < 10 ||
    body.details.trim().length > 3000
  ) {
    return NextResponse.json({ error: "Enter a subject and a message between 10 and 3,000 characters." }, { status: 400 });
  }
  const subject = body.subject.trim();
  const details = body.details.trim();
  const ticket = await getSql().begin(async (transaction) => {
    const [created] = await transaction<{ id: string }[]>`
      insert into public.support_tickets (user_id, subject, details)
      values (${user.id}, ${subject}, ${details})
      returning id
    `;
    await transaction`
      insert into public.email_outbox (recipient, template, payload, dedupe_key)
      values (
        ${user.email},
        'support_acknowledgement',
        ${JSON.stringify({ ticketId: created.id, subject })}::jsonb,
        ${`support-ack:${created.id}`}
      )
      on conflict (dedupe_key) do nothing
    `;
    return created;
  });
  return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 });
}
