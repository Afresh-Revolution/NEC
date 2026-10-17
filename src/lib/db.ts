import "server-only";

import postgres from "postgres";

const globalForPostgres = globalThis as typeof globalThis & {
  necSql?: ReturnType<typeof postgres>;
};

export function getSql() {
  if (globalForPostgres.necSql) return globalForPostgres.necSql;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for database access.");

  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
    prepare: false,
  });
  if (process.env.NODE_ENV !== "production") globalForPostgres.necSql = client;
  return client;
}
