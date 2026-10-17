import bcrypt from "bcryptjs";
import postgres from "postgres";
import { createInterface } from "node:readline/promises";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in .env or .env.local.");
}

async function promptForPassword(label: string) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal to enter the password securely.");
  }

  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let password = "";
  try {
    await new Promise<void>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        for (const character of chunk.toString("utf8")) {
          if (character === "\u0003") {
            process.stdin.off("data", onData);
            reject(new Error("Admin setup cancelled."));
            return;
          }
          if (character === "\r" || character === "\n") {
            process.stdin.off("data", onData);
            process.stdout.write("\n");
            resolve();
            return;
          }
          if (character === "\u007f" || character === "\b") {
            if (password.length) {
              password = password.slice(0, -1);
              process.stdout.write("\b \b");
            }
          } else if (character >= " ") {
            password += character;
            process.stdout.write("*");
          }
        }
      };
      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  return password;
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
let email: string;
try {
  email = (await prompt.question("Administrator email: ")).trim().toLowerCase();
} finally {
  prompt.close();
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Enter a valid administrator email address.");
}

const password = await promptForPassword("Admin password (min. 8 characters): ");
const confirmation = await promptForPassword("Confirm password: ");
if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
if (password !== confirmation) throw new Error("Passwords do not match. No changes were made.");

const passwordHash = await bcrypt.hash(password, 12);
const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  ssl: "require",
  prepare: false,
});

try {
  const result = await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(2026101701)`;

    const [adminRole] = await transaction`
      select id from public.roles where role_code = 'super_admin'
    `;
    if (!adminRole) throw new Error("Admin role is missing. Run database migrations first.");

    const [existingSuperAdmin] = await transaction`
      select user_row.id, user_row.email
      from public.app_users user_row
      join public.user_role_assignments assignment on assignment.user_id = user_row.id
      join public.roles role on role.id = assignment.role_id
      where role.role_code = 'super_admin'
      limit 1
    `;
    const [adminCount] = await transaction<{ count: number }[]>`
      select count(*)::int as count
      from public.user_role_assignments assignment
      join public.roles role on role.id = assignment.role_id
      where role.role_code = 'super_admin'
    `;
    if (adminCount.count > 1) {
      throw new Error("Multiple super-admin accounts exist. Resolve them before changing the admin login.");
    }
    const [emailOwner] = await transaction`
      select id from public.app_users where lower(email) = ${email}
    `;

    if (existingSuperAdmin && emailOwner && emailOwner.id !== existingSuperAdmin.id) {
      throw new Error("That email is already used by a different account.");
    }

    if (existingSuperAdmin) {
      await transaction`
        delete from public.app_sessions where user_id = ${existingSuperAdmin.id}
      `;
      await transaction`
        update public.app_users
        set email = ${email}, password_hash = ${passwordHash}, is_active = true, updated_at = now()
        where id = ${existingSuperAdmin.id}
      `;
      await transaction`
        insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        values (${existingSuperAdmin.id}, 'admin.credentials_updated', 'user',
          ${existingSuperAdmin.id}, '{"role":"super_admin","auth":"database"}'::jsonb)
      `;
      return "updated";
    }

    const [user] = emailOwner
      ? await transaction<{ id: string }[]>`
          update public.app_users
          set password_hash = ${passwordHash}, is_active = true, email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
          where id = ${emailOwner.id}
          returning id
        `
      : await transaction<{ id: string }[]>`
          insert into public.app_users (email, password_hash, full_name, email_verified_at)
          values (${email}, ${passwordHash}, 'NEC Naija Administrator', now())
          returning id
        `;

    await transaction`
      delete from public.app_sessions where user_id = ${user.id}
    `;
    await transaction`
      insert into public.user_role_assignments (user_id, role_id)
      values (${user.id}, ${adminRole.id})
      on conflict do nothing
    `;
    await transaction`
      insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
      values (${user.id}, 'admin.account_created', 'user', ${user.id}, '{"role":"super_admin","auth":"database"}'::jsonb)
    `;
    return emailOwner ? "updated" : "created";
  });

  console.info(
    result === "created"
      ? `Admin account created for ${email}.`
      : `Admin login updated for ${email}.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
