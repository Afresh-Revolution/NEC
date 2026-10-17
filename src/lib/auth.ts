import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSql } from "./db";

const sessionCookieName = "nec_session";
const sessionDurationSeconds = 60 * 60 * 24 * 14;

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
};

function digestSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);
  await getSql()`
    insert into public.app_sessions (user_id, token_hash, expires_at)
    values (${userId}, ${digestSessionToken(token)}, ${expiresAt})
  `;

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAuthenticatedUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const [session] = await getSql()<AppUser[]>`
    select u.id, u.email, u.full_name
    from public.app_sessions s
    join public.app_users u on u.id = s.user_id
    where s.token_hash = ${digestSessionToken(token)}
      and s.expires_at > now()
      and u.is_active
    limit 1
  `;
  return session ?? null;
}

export async function userHasPermission(userId: string, permission: string) {
  const [result] = await getSql()<{ allowed: boolean }[]>`
    select exists (
      select 1
      from public.user_role_assignments assignment
      join public.roles role on role.id = assignment.role_id
      left join public.role_permissions role_permission on role_permission.role_id = role.id
      left join public.permissions permission_row on permission_row.id = role_permission.permission_id
      where assignment.user_id = ${userId}
        and (role.role_code = 'super_admin' or permission_row.permission_code = ${permission})
    ) as allowed
  `;
  return result.allowed;
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await getSql()`
      delete from public.app_sessions
      where token_hash = ${digestSessionToken(token)}
    `;
  }
  cookieStore.delete(sessionCookieName);
}
