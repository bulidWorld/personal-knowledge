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
    // Create tags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        color VARCHAR NOT NULL DEFAULT '#6366f1',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `)
    console.log('✓ Created tags table')

    // Create entry_tags junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id VARCHAR NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag_id VARCHAR NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (entry_id, tag_id)
      );
    `)
    console.log('✓ Created entry_tags table')

    // Check if default tags already exist
    const existing = await pool.query('SELECT COUNT(*)::int as cnt FROM tags')
    if (existing.rows[0].cnt === 0) {
      const defaultTags = [
        { id: 'tag-design', name: '设计', color: '#6366f1' },
        { id: 'tag-dev', name: '开发', color: '#10b981' },
        { id: 'tag-test', name: '测试', color: '#f59e0b' },
        { id: 'tag-ops', name: '运维', color: '#0ea5e9' },
        { id: 'tag-debug', name: '调试', color: '#f43f5e' },
      ]
      for (const tag of defaultTags) {
        await pool.query(
          'INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)',
          [tag.id, tag.name, tag.color]
        )
      }
      console.log('✓ Seeded 5 default tags')
    } else {
      console.log(`→ Tags already exist (${existing.rows[0].cnt}), skipping seed`)
    }

    console.log('Migration complete!')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
