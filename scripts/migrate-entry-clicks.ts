import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 10000,
})

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entry_clicks (
        id BIGSERIAL PRIMARY KEY,
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log('✓ Created entry_clicks table')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS entry_click_windows (
        entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
        last_counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log('✓ Created entry_click_windows table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_entry_clicks_entry_id_clicked_at
      ON entry_clicks(entry_id, clicked_at DESC);
    `)
    console.log('✓ Created entry_clicks indexes')

    console.log('Migration complete!')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
