/**
 * Aplica las migraciones SQL pendientes de ./migrations al arrancar el contenedor.
 * Lleva registro en public._migrations; cada archivo se aplica una sola vez,
 * en orden alfabético y dentro de una transacción.
 *
 * Uso: node scripts/migrate.mjs   (lee DATABASE_URL / DATABASE_SSL)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl });

async function main() {
    await client.connect();
    await client.query(`CREATE TABLE IF NOT EXISTS public._migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    // Una sola instancia migra a la vez.
    await client.query('SELECT pg_advisory_lock(727001)');

    const done = new Set((await client.query('SELECT name FROM public._migrations')).rows.map((r) => r.name));
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
        if (done.has(file)) continue;
        const sql = readFileSync(join(dir, file), 'utf8');
        console.log(`[migrate] aplicando ${file}`);
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO public._migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw new Error(`${file}: ${err.message}`);
        }
    }
    console.log('[migrate] base de datos al día');
}

main()
    .catch((err) => {
        console.error('[migrate] error:', err.message);
        process.exitCode = 1;
    })
    .finally(() => client.end());
