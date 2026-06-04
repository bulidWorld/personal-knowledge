import initSqlJs from 'sql.js'
import { readFileSync } from 'node:fs'
import { Pool } from 'pg'

async function main() {
  // 1. Load SQLite db
  const SQL = await initSqlJs()
  const buffer = readFileSync('.data/knowledge.db')
  const sqliteDb = new SQL.Database(buffer)

  // 2. Connect to PostgreSQL
  const pool = new Pool({
    host: process.env.DB_HOST || '2409:8a4c:6627:9980:be24:12ff:feb4:5da6',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'zhiwenxia',
    password: process.env.DB_PASS || 'Changeme_up',
    database: process.env.DB_NAME || 'personal_knowledge_db',
  })

  console.log('Connected to PostgreSQL')

  // 3. Drop existing tables and create new ones
  await pool.query(`DROP TABLE IF EXISTS mindmap_connections, mindmap_nodes, entries, systems, categories CASCADE`)

  await pool.query(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      border_color TEXT NOT NULL DEFAULT '',
      dot_color TEXT NOT NULL DEFAULT '',
      gradient TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      html_content TEXT NOT NULL DEFAULT '',
      markdown_content TEXT NOT NULL DEFAULT '',
      richtext_content TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT 'html',
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      iframe_url TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'Network',
      border_color TEXT DEFAULT 'border-l-teal-500',
      dot_color TEXT DEFAULT 'bg-teal-500',
      gradient TEXT DEFAULT 'bg-gradient-to-r from-teal-400 to-teal-500',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE mindmap_nodes (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      html_content TEXT DEFAULT '',
      markdown_content TEXT DEFAULT '',
      richtext_content TEXT DEFAULT '',
      content_type TEXT DEFAULT 'html',
      node_type TEXT NOT NULL,
      parent_id TEXT,
      x DOUBLE PRECISION DEFAULT 300,
      y DOUBLE PRECISION DEFAULT 250,
      color TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE mindmap_connections (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      source_node_id TEXT NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
      target_node_id TEXT NOT NULL REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data BYTEA NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Create indexes
  await pool.query(`CREATE INDEX idx_entries_category_id ON entries(category_id)`)
  await pool.query(`CREATE INDEX idx_entries_updated_at ON entries(updated_at DESC)`)
  await pool.query(`CREATE INDEX idx_mindmap_nodes_system_id ON mindmap_nodes(system_id)`)
  await pool.query(`CREATE INDEX idx_mindmap_nodes_parent_id ON mindmap_nodes(parent_id)`)
  await pool.query(`CREATE INDEX idx_mindmap_connections_system_id ON mindmap_connections(system_id)`)
  await pool.query(`CREATE INDEX idx_mindmap_connections_source_node_id ON mindmap_connections(source_node_id)`)
  await pool.query(`CREATE INDEX idx_mindmap_connections_target_node_id ON mindmap_connections(target_node_id)`)

  console.log('Tables and indexes created')

  // 4. Migrate data table by table (FK order matters for categories->entries and systems->nodes->connections)
  const tables = ['categories', 'entries', 'systems', 'mindmap_nodes', 'mindmap_connections']

  for (const table of tables) {
    const stmt = sqliteDb.prepare(`SELECT * FROM "${table}"`)
    const rows: Record<string, unknown>[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()

    if (rows.length === 0) {
      console.log(`Table ${table}: 0 rows (skipped)`)
      continue
    }

    const columns = Object.keys(rows[0])
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const insertSQL = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`

    for (const row of rows) {
      const values = columns.map(col => row[col])
      await pool.query(insertSQL, values)
    }

    console.log(`Table ${table}: ${rows.length} rows migrated`)
  }

  await pool.end()
  console.log('\nMigration complete!')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
