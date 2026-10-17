import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { getAnnualMembershipFee } from "@/lib/membership-plans";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in before paying your membership fee." }, { status: 401 });
  if (process.env.PAYMENTS_ENABLED !== "true" || !process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Online membership payments are not available yet." }, { status: 503 });
  }

  const [livePayments] = await getSql()<{ enabled: boolean }[]>`
    select enabled from public.feature_flags where flag_code = 'live_payments'
  `;
  if (!livePayments?.enabled) {
    return NextResponse.json({ error: "Membership checkout is temporarily unavailable." }, { status: 503 });
  }

  const [application] = await getSql()<{ id: string; status: string }[]>`
    select id, status from public.membership_applications where user_id = ${user.id}
  `;
  if (!application || !["submitted", "approved"].includes(application.status)) {
    return NextResponse.json({ error: "Submit a membership application before paying the annual fee." }, { status: 409 });
  }

  const fee = getAnnualMembershipFee();
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredAppUrl) {
    return NextResponse.json({ error: "Online membership payments are not configured yet." }, { status: 503 });
  }
  let appUrl: URL;
  try {
    appUrl = new URL(configuredAppUrl);
  } catch {
    return NextResponse.json({ error: "The application URL must be an absolute URL." }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" && appUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Secure payment callbacks require an HTTPS application URL." }, { status: 503 });
  }

  let pending: {
    id: string;
    provider_reference: string;
    authorization_url: string | null;
    plan_code: string | null;
    amount_minor: string;
  };
  try {
    pending = await getSql().begin(async (transaction) => {
      const [existingMembership] = await transaction<{
        status: string;
        current_period_end: string | null;
      }[]>`
        select status, current_period_end
        from public.membership_subscriptions
        where user_id = ${user.id}
        for update
      `;
      if (
        existingMembership &&
        ["active", "non_renewing"].includes(existingMembership.status) &&
        existingMembership.current_period_end &&
        new Date(existingMembership.current_period_end).getTime() > Date.now()
      ) {
        throw new Error("MEMBERSHIP_ACTIVE");
      }

      const [existingIntent] = await transaction<{
        id: string;
        provider_reference: string;
        authorization_url: string | null;
        plan_code: string | null;
        amount_minor: string;
      }[]>`
        select id, provider_reference, authorization_url, plan_code, amount_minor::text
        from public.payment_intents
        where application_id = ${application.id}
          and provider = 'paystack' and status = 'pending'
        order by created_at desc
        limit 1
        for update
      `;
      if (existingIntent) {
        if (existingIntent.plan_code !== "yearly" || Number(existingIntent.amount_minor) !== fee.amountMinor) {
          throw new Error("LEGACY_CHECKOUT_PENDING");
        }
        return existingIntent;
      }

      const reference = `NEC-MEM-${randomUUID()}`;
      const [intent] = await transaction<{
        id: string;
        provider_reference: string;
        authorization_url: string | null;
        plan_code: string | null;
        amount_minor: string;
      }[]>`
        insert into public.payment_intents
          (user_id, application_id, provider, provider_reference, amount_minor, plan_code)
        values (${user.id}, ${application.id}, 'paystack', ${reference}, ${fee.amountMinor}, 'yearly')
        returning id, provider_reference, authorization_url, plan_code, amount_minor::text
      `;
      await transaction`
        insert into public.membership_subscriptions
          (user_id, application_id, plan_code, amount_minor, status, auto_renew)
        values (${user.id}, ${application.id}, 'yearly', ${fee.amountMinor}, 'pending', false)
        on conflict (user_id) do update set
          application_id = excluded.application_id,
          plan_code = excluded.plan_code,
          amount_minor = excluded.amount_minor,
          status = 'pending',
          auto_renew = false,
          paystack_subscription_code = null,
          paystack_email_token = null,
          current_period_start = null,
          current_period_end = null,
          updated_at = now()
      `;
      return intent;
    });
  } catch (error) {
    if (error instanceof Error && ["MEMBERSHIP_ACTIVE", "LEGACY_CHECKOUT_PENDING"].includes(error.message)) {
      const message = error.message === "MEMBERSHIP_ACTIVE"
        ? "Your annual membership is already active."
        : "A previous payment attempt is still pending. Contact member support before starting a new annual-fee checkout.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    throw error;
  }
  if (pending.authorization_url) {
    return NextResponse.json({ authorizationUrl: pending.authorization_url });
  }

  let response: Response;
  try {
    response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: fee.amountMinor,
        currency: "NGN",
        reference: pending.provider_reference,
        callback_url: new URL("/payments/return", appUrl).toString(),
        metadata: { application_id: application.id, payment_type: "annual_membership_fee" },
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Unable to contact the payment provider. Please try again." }, { status: 502 });
  }
  const result = await response.json().catch(() => null) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string };
  } | null;
  const authorizationUrl = result?.data?.authorization_url;
  if (!response.ok || !result?.status || !authorizationUrl) {
    return NextResponse.json(
      { error: `The payment provider could not start checkout: ${result?.message ?? `HTTP ${response.status}`}` },
      { status: 502 },
    );
  }
  await getSql()`
    update public.payment_intents set authorization_url = ${authorizationUrl}
    where id = ${pending.id}
  `;
  return NextResponse.json({ authorizationUrl });
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Annual membership fees are paid manually at renewal; automatic renewal is not used." },
    { status: 410 },
  );
}
