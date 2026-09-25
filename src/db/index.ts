import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Node.js does not expose a WebSocket global. The Neon driver needs this
// implementation to support the interactive transactions used by bookings
// and payment webhooks.
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as typeof globalThis & {
  __eventoPool?: Pool;
};

export const pool =
  globalForDb.__eventoPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__eventoPool = pool;
}

export const db = drizzle({ client: pool, schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = Database | Transaction;
