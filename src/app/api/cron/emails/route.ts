import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { sendEmail, type EmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "This scheduled task is not authorised." }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
  }

  await getSql()`
    insert into public.email_reminders (user_id, template, period_end)
    select subscription.user_id, 'subscription_expiry', subscription.current_period_end::date
    from public.membership_subscriptions subscription
    where subscription.status in ('active', 'non_renewing')
      and subscription.current_period_end >= now() + interval '6 days'
      and subscription.current_period_end < now() + interval '8 days'
    on conflict (user_id, template, period_end) do nothing
  `;
  await getSql()`
    insert into public.email_outbox (recipient, template, payload, dedupe_key)
    select account.email, 'subscription_expiry',
      jsonb_build_object('periodEnd', subscription.current_period_end),
      'subscription-expiry:' || subscription.user_id::text || ':' || subscription.current_period_end::date::text
    from public.membership_subscriptions subscription
    join public.app_users account on account.id = subscription.user_id
    join public.email_reminders reminder
      on reminder.user_id = subscription.user_id
      and reminder.period_end = subscription.current_period_end::date
      and reminder.template = 'subscription_expiry'
    where subscription.status in ('active', 'non_renewing')
      and reminder.created_at > now() - interval '2 minutes'
    on conflict (dedupe_key) do nothing
  `;

  const pending = await getSql().begin(async (transaction) => {
    const rows = await transaction<{
      id: string;
      recipient: string;
      template: EmailTemplate;
      payload: Record<string, unknown>;
    }[]>`
      select id, recipient, template, payload
      from public.email_outbox
      where sent_at is null
        and attempts < 5
        and (locked_at is null or locked_at < now() - interval '10 minutes')
      order by created_at
      limit 25
      for update skip locked
    `;
    if (rows.length > 0) {
      await transaction`
        update public.email_outbox
        set attempts = attempts + 1, locked_at = now()
        where id in ${transaction(rows.map((row) => row.id))}
      `;
    }
    return rows;
  });

  let sent = 0;
  let failed = 0;
  for (const email of pending) {
    try {
      await sendEmail({ recipient: email.recipient, template: email.template, payload: email.payload });
      await getSql()`
        update public.email_outbox
        set sent_at = now(), last_error = null, locked_at = null
        where id = ${email.id}
      `;
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed.";
      console.error(`Email delivery failed for outbox item ${email.id}: ${message}`);
      await getSql()`
        update public.email_outbox
        set last_error = ${message}, locked_at = null
        where id = ${email.id}
      `;
      failed += 1;
    }
  }
  return NextResponse.json({ sent, failed, remaining: pending.length - sent - failed });
}
