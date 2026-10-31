import path from "node:path";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "./schema";
import { logger } from "../logger";

export type Schema = typeof schema;
export type Database = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type Executor = Database | Tx;

type GlobalDb = { __slcDb?: Promise<Database>; __slcDbOverride?: Database };
const g = globalThis as unknown as GlobalDb;

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * Production : PostgreSQL (Neon) via DATABASE_URL.
 * Développement local sans DATABASE_URL : base Postgres embarquée (PGlite) stockée dans .data/pglite,
 * migrée automatiquement — aucune installation nécessaire.
 */
export function getDb(): Promise<Database> {
  if (g.__slcDbOverride) return Promise.resolve(g.__slcDbOverride);
  if (!g.__slcDb) {
    g.__slcDb = createDb().catch((error) => {
      g.__slcDb = undefined; // ne pas garder un échec en cache : nouvelle tentative à la requête suivante
      throw error;
    });
  }
  return g.__slcDb;
}

async function createDb(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, {
      max: process.env.VERCEL ? 1 : 5,
      prepare: false, // compatible avec le pooler PgBouncer de Neon
      idle_timeout: 20,
      connect_timeout: 15,
    });
    return drizzle(client, { schema }) as unknown as Database;
  }
  const { seedIfEmpty } = await import("./seed");
  if (process.env.NEXT_PHASE === "phase-production-build") {
    // Build local sans base : chaque processus de build utilise une base en mémoire initialisée avec le portfolio.
    const db = await createPgliteDb();
    await seedIfEmpty(db);
    return db;
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL manquant : configurez la base PostgreSQL (Neon) dans Vercel.");
  }
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  logger.info("db.embedded", { dir });
  const db = await createPgliteDb(dir);
  await seedIfEmpty(db);
  return db;
}

/** Instance PGlite migrée (fichier local ou mémoire si dir = undefined). Utilisée en dev et dans les tests. */
export async function createPgliteDb(dir?: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = dir ? new PGlite(dir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Database;
}

/** Tests : remplace la base utilisée par les services. */
export function setDbOverride(db: Database | undefined) {
  g.__slcDbOverride = db;
}

/** Code d'erreur Postgres (gère l'enveloppe DrizzleQueryError). */
export function pgErrorCode(error: unknown): string | undefined {
  let e: unknown = error;
  for (let i = 0; i < 4 && e; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

export { schema };
