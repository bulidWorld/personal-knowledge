import { Pool, QueryResult } from 'pg'

let pool: Pool | null = null

function getPool(): Pool {
  if (pool) return pool

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  pool.on('error', (err) => {
    console.error('Unexpected pool error', err)
  })

  return pool
}

export interface Db {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>
}

export async function getDb(): Promise<Db> {
  const p = getPool()
  return {
    query: (text: string, params?: unknown[]) => p.query(text, params),
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
