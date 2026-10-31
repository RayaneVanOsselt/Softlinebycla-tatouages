/**
 * Applique les migrations sur la base PostgreSQL (DATABASE_URL) puis initialise le portfolio si vide.
 * Lancé automatiquement par `npm run build` (donc à chaque déploiement Vercel).
 * Sans DATABASE_URL (développement local), la base embarquée se migre toute seule au démarrage.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { seedIfEmpty } from "../src/lib/db/seed";
import type { Database } from "../src/lib/db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL absent : base embarquée utilisée en local, rien à migrer ici.");
  process.exit(0);
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Migrations appliquées.");
  const seeded = await seedIfEmpty(db as unknown as Database);
  console.log(seeded ? "[migrate] Portfolio initial importé." : "[migrate] Portfolio déjà présent.");
} finally {
  await client.end();
}
