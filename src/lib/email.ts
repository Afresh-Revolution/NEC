import "server-only";

import { getSql } from "@/lib/db";

export type EmailTemplate =
  | "welcome"
  | "application_update"
  | "subscription_receipt"
  | "subscription_expiry"
  | "support_acknowledgement";

type EmailContent = { subject: string; title: string; body: string; action?: string; href?: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function contentFor(template: EmailTemplate, payload: Record<string, unknown>): EmailContent {
  const name = typeof payload.name === "string" ? payload.name : "there";
  if (template === "welcome") {
    return {
      subject: "Welcome to NEC Naija",
      title: `Welcome, ${name}.`,
      body: "Your account and membership application are ready. Sign in to follow your application and explore the member space.",
      action: "Visit your member space",
      href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://necnaija.com"}/login`,
    };
  }
  if (template === "application_update") {
    const decision = typeof payload.decision === "string" ? payload.decision.replaceAll("_", " ") : "updated";
    const reason = typeof payload.reason === "string" ? payload.reason : "Sign in to view the latest information.";
    return {
      subject: "An update on your NEC Naija application",
      title: "Your application has been updated.",
      body: `Status: ${decision}. ${reason}`,
      action: "View your application",
      href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://necnaija.com"}/dashboard`,
    };
  }
  if (template === "subscription_receipt") {
    const amountMinor = typeof payload.amountMinor === "number" ? payload.amountMinor : 0;
    const amount = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amountMinor / 100);
    const expires = typeof payload.periodEnd === "string"
      ? new Date(payload.periodEnd).toLocaleDateString("en-NG", { dateStyle: "long" })
      : "shown in your member space";
    return {
      subject: "Your NEC Naija membership payment receipt",
      title: "Payment confirmed.",
      body: `We received your ${amount} annual membership fee. Your current membership period ends ${expires}.`,
      action: "View membership",
      href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://necnaija.com"}/dashboard`,
    };
  }
  if (template === "subscription_expiry") {
    const expires = typeof payload.periodEnd === "string"
      ? new Date(payload.periodEnd).toLocaleDateString("en-NG", { dateStyle: "long" })
      : "soon";
    return {
      subject: "Your NEC Naija membership period is ending soon",
      title: "A membership reminder.",
      body: `Your current membership period ends on ${expires}. Sign in to renew your annual membership fee.`,
      action: "Renew membership",
      href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://necnaija.com"}/dashboard`,
    };
  }
  const ticketId = typeof payload.ticketId === "string" ? payload.ticketId : "your request";
  const subject = typeof payload.subject === "string" ? payload.subject : "Support request";
  return {
    subject: "We received your message",
    title: "Your note is with our team.",
    body: `We have received “${subject}” (${ticketId}). NEC Naija support will follow up as soon as possible.`,
    action: "Visit your member space",
    href: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://necnaija.com"}/dashboard`,
  };
}

function renderEmail(content: EmailContent) {
  const title = escapeHtml(content.title);
  const body = escapeHtml(content.body);
  const action = content.action && content.href
    ? `<a href="${escapeHtml(content.href)}" style="display:inline-block;padding:14px 22px;background:#171a17;color:#f3f0e8;text-decoration:none;font-weight:600">${escapeHtml(content.action)}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f0e8;font-family:Arial,sans-serif;color:#171a17"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f0e8;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#faf8f2;border:1px solid #dedbd0"><tr><td style="padding:24px 32px;background:#171a17;color:#dfc88f;font-size:13px;letter-spacing:3px;font-weight:bold">NEC NAIJA <span style="float:right;color:#f3f0e8;font-size:10px;font-weight:normal">STRONGER TOGETHER</span></td></tr><tr><td style="padding:36px 32px"><p style="margin:0 0 14px;color:#65704b;font-size:11px;letter-spacing:2px">YOUR CREATIVE COMMUNITY</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:32px;line-height:1.2;font-weight:normal">${title}</h1><p style="margin:0 0 28px;color:#4f554b;font-size:16px;line-height:1.7">${body}</p>${action}</td></tr><tr><td style="padding:18px 32px;border-top:1px solid #e2e0d7;color:#777b72;font-size:12px;line-height:1.6">NEC Naija · A place to belong. A reason to build.<br>Need help? Reply to this email or contact hello@necnaija.com.</td></tr></table></td></tr></table></body></html>`;
}

export async function enqueueEmail(input: {
  recipient: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
  dedupeKey: string;
}) {
  await getSql()`
    insert into public.email_outbox (recipient, template, payload, dedupe_key)
    values (
      ${input.recipient},
      ${input.template},
      ${JSON.stringify(input.payload)}::jsonb,
      ${input.dedupeKey}
    )
    on conflict (dedupe_key) do nothing
  `;
}

export async function sendEmail(input: {
  recipient: string;
  template: EmailTemplate;
  payload: Record<string, unknown>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) throw new Error("Resend email delivery is not configured.");

  const content = contentFor(input.template, input.payload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: content.subject,
      html: renderEmail(content),
      text: `${content.title}\n\n${content.body}${content.href ? `\n\n${content.action}: ${content.href}` : ""}`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Resend rejected an email with HTTP ${response.status}.`);
  }
}
