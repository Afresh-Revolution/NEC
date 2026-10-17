import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL in .env or .env.local.");

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  ssl: "require",
  prepare: false,
});

try {
  await sql`
    create table if not exists public.app_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;

  await sql.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(2026101702)`;
    for (const name of migrationFiles) {
      const contents = await readFile(join(migrationsDirectory, name), "utf8");
      const checksum = createHash("sha256").update(contents).digest("hex");
      const [applied] = await transaction`
        select checksum from public.app_migrations where name = ${name}
      `;

      if (applied) {
        if (applied.checksum !== checksum) {
          throw new Error(
            `Applied migration ${name} was modified. Create a new migration instead of editing an applied migration.`,
          );
        }
        console.info(`Already applied: ${name}`);
        continue;
      }

      await transaction.unsafe(contents);
      await transaction`
        insert into public.app_migrations (name, checksum)
        values (${name}, ${checksum})
      `;
      console.info(`Applied: ${name}`);
    }
  });
} finally {
  await sql.end({ timeout: 5 });
}
