import "server-only";

import { getSql } from "./db";

export async function postVerifiedPayment(input: {
  eventId: string;
  reference: string;
  transactionId: string;
  amountMinor: number;
}) {
  return getSql().begin(async (transaction) => {
    const [event] = await transaction<{ id: string }[]>`
      insert into public.payment_webhook_events
        (provider, provider_event_id, event_type, payload)
      values ('paystack', ${input.eventId}, 'charge.success',
        ${JSON.stringify({ reference: input.reference })}::jsonb)
      on conflict (provider, provider_event_id) do nothing
      returning id
    `;
    if (!event) return "duplicate_event";

    const [intent] = await transaction<{
      id: string;
      user_id: string;
      amount_minor: number;
      status: string;
    }[]>`
      select id, user_id, amount_minor, status
      from public.payment_intents
      where provider_reference = ${input.reference}
        and provider = 'paystack' and not is_demo
      for update
    `;
    if (!intent) throw new Error("Payment reference was not found.");
    if (Number(intent.amount_minor) !== input.amountMinor) {
      throw new Error("Verified amount does not match the payment intent.");
    }
    if (intent.status === "succeeded") {
      await transaction`
        update public.payment_webhook_events set processed_at = now()
        where id = ${event.id}
      `;
      return "already_processed";
    }

    const [entry] = await transaction<{ id: string }[]>`
      insert into public.journal_entries
        (source_type, source_id, description)
      values ('payment', ${intent.id}, 'Verified Paystack membership registration payment')
      on conflict (source_type, source_id) do nothing
      returning id
    `;
    if (entry) {
      const [accounts] = await transaction<{ clearing: string; revenue: string }[]>`
        select
          (select id from public.ledger_accounts where account_code = '1000-PAYSTACK-CLEARING') as clearing,
          (select id from public.ledger_accounts where account_code = '4000-MEMBERSHIP-FEES') as revenue
      `;
      if (!accounts?.clearing || !accounts.revenue) {
        throw new Error("Payment ledger accounts are not configured.");
      }
      await transaction`
        insert into public.journal_lines
          (journal_entry_id, ledger_account_id, side, amount_minor)
        values
          (${entry.id}, ${accounts.clearing}, 'debit', ${input.amountMinor}),
          (${entry.id}, ${accounts.revenue}, 'credit', ${input.amountMinor})
      `;
    }

    await transaction`
      update public.payment_intents
      set status = 'succeeded', provider_transaction_id = ${input.transactionId},
          paid_at = coalesce(paid_at, now()), updated_at = now()
      where id = ${intent.id}
    `;
    await transaction`
      update public.payment_webhook_events set processed_at = now()
      where id = ${event.id}
    `;
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (
        ${intent.user_id}, 'payment.verified', 'payment_intent', ${intent.id},
        ${JSON.stringify({ provider: "paystack", amount_minor: input.amountMinor })}::jsonb
      )
    `;
    return "processed";
  });
}

export async function postVerifiedSubscriptionPayment(input: {
  eventId: string;
  reference: string;
  transactionId: string;
  amountMinor: number;
  subscriptionCode?: string;
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  return getSql().begin(async (transaction) => {
    const [event] = await transaction<{ id: string }[]>`
      insert into public.payment_webhook_events
        (provider, provider_event_id, event_type, payload)
      values ('paystack', ${input.eventId}, 'membership.subscription.payment',
        ${JSON.stringify({ reference: input.reference })}::jsonb)
      on conflict (provider, provider_event_id) do nothing
      returning id
    `;
    if (!event) return "duplicate_event";

    const [intent] = await transaction<{
      id: string;
      user_id: string;
      application_id: string;
      plan_code: "monthly" | "yearly";
      amount_minor: number;
    }[]>`
      select id, user_id, application_id, plan_code, amount_minor
      from public.payment_intents
      where provider_reference = ${input.reference}
        and provider = 'paystack' and plan_code is not null
      for update
    `;

    const [subscription] = intent
      ? await transaction<{
          id: string;
          user_id: string;
          application_id: string;
          plan_code: "monthly" | "yearly";
          amount_minor: number;
          auto_renew: boolean;
          current_period_end: string | null;
        }[]>`
          select id, user_id, application_id, plan_code, amount_minor,
            auto_renew, current_period_end
          from public.membership_subscriptions
          where user_id = ${intent.user_id}
          for update
        `
      : input.subscriptionCode
        ? await transaction<{
            id: string;
            user_id: string;
            application_id: string;
            plan_code: "monthly" | "yearly";
            amount_minor: number;
            auto_renew: boolean;
            current_period_end: string | null;
          }[]>`
            select id, user_id, application_id, plan_code, amount_minor,
              auto_renew, current_period_end
            from public.membership_subscriptions
            where paystack_subscription_code = ${input.subscriptionCode}
            for update
          `
        : [];
    if (!subscription) throw new Error("Membership subscription was not found for the verified payment.");
    if (intent && intent.plan_code !== subscription.plan_code) {
      throw new Error("Payment plan does not match the member subscription.");
    }
    if (Number(subscription.amount_minor) !== input.amountMinor) {
      throw new Error("Verified amount does not match the membership subscription.");
    }

    const [payment] = await transaction<{ id: string }[]>`
      insert into public.membership_subscription_payments
        (subscription_id, provider_transaction_id, provider_reference, amount_minor, paid_at)
      values (
        ${subscription.id},
        ${input.transactionId},
        ${input.reference},
        ${input.amountMinor},
        ${input.paidAt ?? new Date().toISOString()}
      )
      on conflict (provider_transaction_id) do nothing
      returning id
    `;
    if (!payment) {
      await transaction`
        update public.payment_webhook_events set processed_at = now() where id = ${event.id}
      `;
      return "already_processed";
    }

    const [entry] = await transaction<{ id: string }[]>`
      insert into public.journal_entries (source_type, source_id, description)
      values ('subscription_payment', ${payment.id}, 'Verified membership subscription payment')
      on conflict (source_type, source_id) do nothing
      returning id
    `;
    if (entry) {
      const [accounts] = await transaction<{ clearing: string; revenue: string }[]>`
        select
          (select id from public.ledger_accounts where account_code = '1000-PAYSTACK-CLEARING') as clearing,
          (select id from public.ledger_accounts where account_code = '4000-MEMBERSHIP-FEES') as revenue
      `;
      if (!accounts?.clearing || !accounts.revenue) {
        throw new Error("Payment ledger accounts are not configured.");
      }
      await transaction`
        insert into public.journal_lines (journal_entry_id, ledger_account_id, side, amount_minor)
        values
          (${entry.id}, ${accounts.clearing}, 'debit', ${input.amountMinor}),
          (${entry.id}, ${accounts.revenue}, 'credit', ${input.amountMinor})
      `;
    }

    const paidAt = input.paidAt ?? new Date().toISOString();
    await transaction`
      update public.membership_subscriptions
      set status = case when auto_renew then 'active' else 'non_renewing' end,
        current_period_start = coalesce(
          ${input.periodStart ?? null}::timestamptz,
          current_period_end,
          ${paidAt}::timestamptz
        ),
        current_period_end = coalesce(
          ${input.periodEnd ?? null}::timestamptz,
          case
            when current_period_end is null or current_period_end <= ${paidAt}::timestamptz
              then ${paidAt}::timestamptz
            else current_period_end
          end + case when plan_code = 'monthly' then interval '1 month' else interval '1 year' end
        ),
        updated_at = now()
      where id = ${subscription.id}
    `;
    if (intent) {
      await transaction`
        update public.payment_intents
        set status = 'succeeded', provider_transaction_id = ${input.transactionId},
          paid_at = ${paidAt}::timestamptz, updated_at = now()
        where id = ${intent.id}
      `;
    }
    const [account] = await transaction<{ email: string; plan_code: string; current_period_end: string }[]>`
      select account.email, subscription.plan_code, subscription.current_period_end
      from public.membership_subscriptions subscription
      join public.app_users account on account.id = subscription.user_id
      where subscription.id = ${subscription.id}
    `;
    if (account) {
      await transaction`
        insert into public.email_outbox (recipient, template, payload, dedupe_key)
        values (
          ${account.email},
          'subscription_receipt',
          ${JSON.stringify({
            plan: account.plan_code,
            amountMinor: input.amountMinor,
            periodEnd: account.current_period_end,
          })}::jsonb,
          ${`subscription-receipt:${input.transactionId}`}
        )
        on conflict (dedupe_key) do nothing
      `;
    }
    await transaction`
      update public.payment_webhook_events set processed_at = now() where id = ${event.id}
    `;
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (
        ${subscription.user_id},
        'subscription.payment_verified',
        'membership_subscription',
        ${subscription.id},
        ${JSON.stringify({ plan: subscription.plan_code, amount_minor: input.amountMinor })}::jsonb
      )
    `;
    return "processed";
  });
}

export async function postDemoPayment(input: {
  userId: string;
  applicationId: string;
  reference: string;
  amountMinor: number;
}) {
  return getSql().begin(async (transaction) => {
    const [intent] = await transaction<{ id: string; status: string }[]>`
      insert into public.payment_intents
        (user_id, application_id, provider, provider_reference, amount_minor, is_demo)
      values (${input.userId}, ${input.applicationId}, 'demo', ${input.reference},
        ${input.amountMinor}, true)
      returning id, status
    `;
    const [entry] = await transaction<{ id: string }[]>`
      insert into public.journal_entries
        (source_type, source_id, description, is_demo)
      values ('demo_payment', ${intent.id},
        'Development-only simulated membership payment', true)
      returning id
    `;
    const [accounts] = await transaction<{ clearing: string; revenue: string }[]>`
      select
        (select id from public.ledger_accounts where account_code = '1090-DEMO-CLEARING') as clearing,
        (select id from public.ledger_accounts where account_code = '4090-DEMO-FEES') as revenue
    `;
    if (!accounts?.clearing || !accounts.revenue) {
      throw new Error("Demo payment ledger accounts are not configured.");
    }
    await transaction`
      insert into public.journal_lines
        (journal_entry_id, ledger_account_id, side, amount_minor)
      values
        (${entry.id}, ${accounts.clearing}, 'debit', ${input.amountMinor}),
        (${entry.id}, ${accounts.revenue}, 'credit', ${input.amountMinor})
    `;
    await transaction`
      update public.payment_intents
      set status = 'succeeded', paid_at = now(), updated_at = now()
      where id = ${intent.id}
    `;
    await transaction`
      insert into public.payment_webhook_events
        (provider, provider_event_id, event_type, payload, processed_at)
      values ('demo', ${input.reference}, 'demo.charge.success',
        '{"simulated":true}'::jsonb, now())
    `;
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (
        ${input.userId}, 'payment.demo_completed', 'payment_intent', ${intent.id},
        ${JSON.stringify({ amount_minor: input.amountMinor, is_demo: true })}::jsonb
      )
    `;
    return "processed";
  });
}
