import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth";
import { getSql } from "@/lib/db";

type Registration = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  profession?: unknown;
  homeState?: unknown;
  termsAccepted?: unknown;
  privacyAccepted?: unknown;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Registration | null;
  if (
    typeof body?.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    typeof body.profession !== "string" ||
    typeof body.homeState !== "string" ||
    body.termsAccepted !== true ||
    body.privacyAccepted !== true
  ) {
    return NextResponse.json({ error: "Complete all required fields and accept both policies." }, { status: 400 });
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const profession = body.profession.trim();
  const homeState = body.homeState.trim();
  if (
    name.length < 2 || name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    body.password.length < 12 || body.password.length > 128 ||
    profession.length < 1 || profession.length > 120 ||
    homeState.length < 1 || homeState.length > 100
  ) {
    return NextResponse.json({ error: "One or more submitted fields are invalid." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const userId = randomUUID();
  await getSql().begin(async (transaction) => {
    const [createdUser] = await transaction<{ id: string }[]>`
      insert into public.app_users (id, email, password_hash, full_name)
      values (${userId}, ${email}, ${passwordHash}, ${name})
      on conflict do nothing
      returning id
    `;
    if (!createdUser) throw new Error("An account already exists for this email address.");

    await transaction`
      insert into public.profiles (user_id, email, full_name, profession, home_state)
      values (${userId}, ${email}, ${name}, ${profession}, ${homeState})
    `;
    await transaction`
      insert into public.user_role_assignments (user_id, role_id)
      select ${userId}, id from public.roles where role_code = 'applicant'
    `;
    await transaction`
      insert into public.user_consents (user_id, policy_code, policy_version)
      select ${userId}, policy_code, version
      from public.policy_versions
      where is_current and policy_code in ('membership_terms', 'privacy_notice')
    `;
    await transaction`
      insert into public.membership_applications (user_id, professional_category, home_state)
      values (${userId}, ${profession}, ${homeState})
    `;
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      select ${userId}, 'application.submitted', 'membership_application', id,
        '{"source":"web_signup","auth":"database"}'::jsonb
      from public.membership_applications where user_id = ${userId}
    `;
    await transaction`
      insert into public.email_outbox (recipient, template, payload, dedupe_key)
      values (
        ${email},
        'welcome',
        ${JSON.stringify({ name: name.split(" ")[0] })}::jsonb,
        ${`welcome:${userId}`}
      )
      on conflict (dedupe_key) do nothing
    `;
  });

  await createUserSession(userId);
  return NextResponse.json({ success: true }, { status: 201 });
}
