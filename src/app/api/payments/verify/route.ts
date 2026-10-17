import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { postVerifiedPayment, postVerifiedSubscriptionPayment } from "@/lib/payment-ledger";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to verify your payment." }, { status: 401 });
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Paystack payment verification is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { reference?: unknown } | null;
  if (typeof body?.reference !== "string" || !/^NEC-(?:SUB-|MEM-)?[\da-f-]{36}$/i.test(body.reference)) {
    return NextResponse.json({ error: "A valid Paystack payment reference is required." }, { status: 400 });
  }

  const [intent] = await getSql()<{
    user_id: string;
    provider_reference: string;
    amount_minor: number;
    plan_code: "monthly" | "yearly" | null;
  }[]>`
    select user_id, provider_reference, amount_minor, plan_code
    from public.payment_intents
    where provider_reference = ${body.reference} and provider = 'paystack'
  `;
  if (!intent || intent.user_id !== user.id) {
    return NextResponse.json({ error: "Payment reference not found for this account." }, { status: 404 });
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(intent.provider_reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json({ error: "Unable to contact Paystack for verification." }, { status: 502 });
  }

  const providerBody = await providerResponse.json().catch(() => null) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      reference?: string;
      id?: number | string;
      amount?: number;
      currency?: string;
    };
  } | null;
  if (!providerResponse.ok || !providerBody?.status || !providerBody.data) {
    return NextResponse.json({ error: `Paystack verification failed: ${providerBody?.message ?? `HTTP ${providerResponse.status}`}` }, { status: 502 });
  }
  if (
    providerBody.data.status !== "success" ||
    providerBody.data.reference !== intent.provider_reference ||
    providerBody.data.amount !== intent.amount_minor ||
    providerBody.data.currency !== "NGN" ||
    providerBody.data.id === undefined
  ) {
    return NextResponse.json({ status: providerBody.data.status ?? "pending", message: "Paystack has not verified this payment as successful." }, { status: 409 });
  }

  const result = intent.plan_code
    ? await postVerifiedSubscriptionPayment({
        eventId: `verify:${providerBody.data.id}`,
        reference: intent.provider_reference,
        transactionId: String(providerBody.data.id),
        amountMinor: Number(intent.amount_minor),
      })
    : await postVerifiedPayment({
        eventId: `verify:${providerBody.data.id}`,
        reference: intent.provider_reference,
        transactionId: String(providerBody.data.id),
        amountMinor: Number(intent.amount_minor),
      });

  return NextResponse.json({ status: "succeeded", result });
}
