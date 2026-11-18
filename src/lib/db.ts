import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type DbGlobals = {
  __swhPgPool?: pg.Pool;
  __swhPglite?: Promise<PGlite>;
};

const g = globalThis as typeof globalThis & DbGlobals;

export function isUsingPostgres(): boolean {
  return databaseUrl !== "";
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    g.__swhPgPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await g.__swhPgPool.query(text, params)).rows as T[];
  }
  g.__swhPglite ??= startLocal().catch((error: unknown) => {
    g.__swhPglite = undefined;
    throw error;
  });
  return (await (await g.__swhPglite).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  // File-backed so API routes and Server Components share one sample DB
  // across Next.js module graphs while DATABASE_URL is unset.
  const db = new PGlite("./.data/local-pg");
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
