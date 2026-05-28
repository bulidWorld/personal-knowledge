import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

let db: SqlJsDatabase | null = null

function resolveDbPath(): string {
  const config = useRuntimeConfig()
  if (config.dbPath) return config.dbPath as string
  return join(process.cwd(), '.data', 'knowledge.db')
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const dbPath = resolveDbPath()

  const SQL = await initSqlJs()

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
    initTables(db)
    persist()
  }

  return db
}

function initTables(d: SqlJsDatabase) {
  d.run('PRAGMA foreign_keys = ON')
  d.run(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      border_color TEXT NOT NULL DEFAULT '',
      dot_color TEXT NOT NULL DEFAULT '',
      gradient TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT ''
    )
  `)
  d.run(`
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      html_content TEXT NOT NULL DEFAULT '',
      markdown_content TEXT NOT NULL DEFAULT '',
      richtext_content TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT 'html',
      category_id TEXT NOT NULL,
      iframe_url TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `)
  d.run(`
    CREATE TABLE systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'Network',
      border_color TEXT DEFAULT 'border-l-teal-500',
      dot_color TEXT DEFAULT 'bg-teal-500',
      gradient TEXT DEFAULT 'bg-gradient-to-r from-teal-400 to-teal-500',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  d.run(`
    CREATE TABLE mindmap_nodes (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      title TEXT NOT NULL,
      html_content TEXT DEFAULT '',
      markdown_content TEXT DEFAULT '',
      richtext_content TEXT DEFAULT '',
      content_type TEXT DEFAULT 'html',
      node_type TEXT NOT NULL,
      parent_id TEXT,
      x REAL DEFAULT 300,
      y REAL DEFAULT 250,
      color TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
    )
  `)
  d.run(`
    CREATE TABLE mindmap_connections (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
      FOREIGN KEY (source_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
    )
  `)
}

export async function persist() {
  if (!db) return
  const dbPath = resolveDbPath()
  const dbDir = join(dbPath, '..')
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}
