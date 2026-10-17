import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    email?: unknown;
    password?: unknown;
  } | null;
  if (
    typeof body?.email !== "string" ||
    typeof body.password !== "string" ||
    body.email.length > 254 ||
    body.password.length > 128
  ) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const [user] = await getSql()<{ id: string; password_hash: string; is_active: boolean }[]>`
    select id, password_hash, is_active
    from public.app_users
    where lower(email) = ${email}
    limit 1
  `;
  const validPassword = user
    ? await bcrypt.compare(body.password, user.password_hash)
    : await bcrypt.compare(
        body.password,
        "$2b$12$C6UzMDM.H6dfI/f/IKcEe.6W5z2U7YjG0Z1aAgb6iN2l7i7a4a5uS",
      );
  if (!user || !user.is_active || !validPassword) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await createUserSession(user.id);
  return NextResponse.json({ success: true });
}
