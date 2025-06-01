// src/lib/server/db.ts

/* We use dynamic environment variables since we can't
package them statically into the Docker container. */
import { env } from "$env/dynamic/private";
import pg, { type QueryResult, type QueryResultRow } from "pg";
import pgvector from "pgvector/pg"; // Import pgvector

const { Pool } = pg;

const pool = new Pool({
  user: env.POSTGRES_USER || "felixplore",
  password: env.POSTGRES_PASSWORD || "postgres",
  host: env.POSTGRES_HOST || "localhost",
  port: env.POSTGRES_PORT ? parseInt(env.POSTGRES_PORT, 10) : 5432,
  database: env.POSTGRES_DB || "felixplore",
});

pool.on("connect", async (client) => {
  await pgvector.registerTypes(client); // Register types on new client connection
});

export default {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> => pool.query(text, params) as Promise<QueryResult<T>>,
};
