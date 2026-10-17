import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { postVerifiedPayment, postVerifiedSubscriptionPayment } from "@/lib/payment-ledger";

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: unknown;
    id?: unknown;
    amount?: unknown;
    currency?: unknown;
    status?: unknown;
    subscription_code?: unknown;
    email_token?: unknown;
    customer?: { email?: unknown };
    paid_at?: unknown;
    subscription?: {
      subscription_code?: unknown;
      email_token?: unknown;
      status?: unknown;
    };
    transaction?: {
      id?: unknown;
      reference?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
      paid_at?: unknown;
    };
    period_start?: unknown;
    period_end?: unknown;
  };
};

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Paystack webhook signing is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha512", secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    return NextResponse.json({ error: "Invalid Paystack signature." }, { status: 401 });
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Invalid Paystack signature." }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Webhook payload is not valid JSON." }, { status: 400 });
  }
  const data = event.data ?? {};
  if (event.event === "subscription.create") {
    const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
    const emailToken = data.email_token ?? data.subscription?.email_token;
    const customerEmail = data.customer?.email;
    if (typeof subscriptionCode !== "string" || typeof emailToken !== "string" || typeof customerEmail !== "string") {
      return NextResponse.json({ error: "Subscription details are missing from the provider event." }, { status: 400 });
    }
    await getSql()`
      update public.membership_subscriptions
      set paystack_subscription_code = ${subscriptionCode},
        paystack_email_token = ${emailToken},
        updated_at = now()
      where user_id = (select id from public.app_users where email = ${customerEmail})
    `;
    return NextResponse.json({ received: true });
  }

  if (event.event === "subscription.disable" || event.event === "subscription.enable") {
    const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
    if (typeof subscriptionCode !== "string") {
      return NextResponse.json({ error: "Subscription code is missing from the provider event." }, { status: 400 });
    }
    const enabled = event.event === "subscription.enable";
    await getSql()`
      update public.membership_subscriptions
      set auto_renew = ${enabled},
        status = case
          when current_period_end <= now() then 'expired'
          when ${enabled} then 'active'
          else 'non_renewing'
        end,
        updated_at = now()
      where paystack_subscription_code = ${subscriptionCode}
    `;
    return NextResponse.json({ received: true });
  }

  if (event.event === "invoice.payment_success") {
    const transaction = data.transaction;
    const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
    if (
      typeof subscriptionCode !== "string" ||
      typeof transaction?.id !== "number" ||
      !Number.isSafeInteger(transaction.id) ||
      typeof transaction.reference !== "string" ||
      typeof transaction.amount !== "number" ||
      !Number.isSafeInteger(transaction.amount) ||
      transaction.currency !== "NGN" ||
      transaction.status !== "success"
    ) {
      return NextResponse.json({ error: "Recurring payment details are missing or invalid." }, { status: 400 });
    }
    const result = await postVerifiedSubscriptionPayment({
      eventId: `paystack-invoice:${transaction.id}`,
      reference: transaction.reference,
      transactionId: String(transaction.id),
      amountMinor: transaction.amount,
      subscriptionCode,
      paidAt: typeof transaction.paid_at === "string" ? transaction.paid_at : undefined,
      periodStart: typeof data.period_start === "string" ? data.period_start : undefined,
      periodEnd: typeof data.period_end === "string" ? data.period_end : undefined,
    });
    return NextResponse.json({ received: true, result });
  }

  if (event.event === "invoice.payment_failed") {
    const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
    if (typeof subscriptionCode !== "string") {
      return NextResponse.json({ error: "Subscription code is missing from the provider event." }, { status: 400 });
    }
    await getSql()`
      update public.membership_subscriptions
      set status = 'past_due', updated_at = now()
      where paystack_subscription_code = ${subscriptionCode}
        and current_period_end > now()
    `;
    return NextResponse.json({ received: true });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const { reference, id, amount, currency, status } = data;
  if (
    typeof reference !== "string" ||
    typeof id !== "number" ||
    !Number.isSafeInteger(id) ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    currency !== "NGN" ||
    status !== "success"
  ) {
    return NextResponse.json({ error: "Successful charge payload is missing valid transaction details." }, { status: 400 });
  }

  const subscriptionCode = data.subscription_code ?? data.subscription?.subscription_code;
  if (reference.startsWith("NEC-SUB-") || reference.startsWith("NEC-MEM-") || typeof subscriptionCode === "string") {
    const result = await postVerifiedSubscriptionPayment({
      eventId: `paystack:${id}`,
      reference,
      transactionId: String(id),
      amountMinor: amount,
      paidAt: typeof data.paid_at === "string" ? data.paid_at : undefined,
      subscriptionCode: typeof subscriptionCode === "string"
        ? subscriptionCode
        : undefined,
    });
    return NextResponse.json({ received: true, result });
  }

  const result = await postVerifiedPayment({
    eventId: `paystack:${id}`,
    reference,
    transactionId: String(id),
    amountMinor: amount,
  });

  return NextResponse.json({ received: true, result });
}
