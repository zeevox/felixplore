// src/lib/server/db.ts

import pg from 'pg';
import { env } from '$env/dynamic/private';
import pgvector from 'pgvector/pg'; // Import pgvector

const { Pool } = pg;

const pool = new Pool({
    user: env.POSTGRES_USER || 'felixplore',
    password: env.POSTGRES_PASSWORD || 'postgres',
    host: env.POSTGRES_HOST || 'localhost',
    port: env.POSTGRES_PORT ? parseInt(env.POSTGRES_PORT, 10) : 5432,
    database: env.POSTGRES_DB || 'felixplore',
});

pool.on('connect', async (client) => {
    await pgvector.registerTypes(client); // Register types on new client connection
});

export default {
    query: (text: string, params?: any[]) => pool.query(text, params),
};