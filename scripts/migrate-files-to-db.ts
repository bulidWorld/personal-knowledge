import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
}

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || '2409:8a4c:6627:9980:be24:12ff:feb4:5da6',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'zhiwenxia',
    password: process.env.DB_PASS || 'Changeme_up',
    database: process.env.DB_NAME || 'personal_knowledge_db',
  })

  // Get all image files from public/uploads/
  const files = readdirSync(UPLOADS_DIR).filter((f) => {
    if (f === '.gitkeep') return false
    const ext = extname(f).toLowerCase()
    return ext in MIME_MAP
  })

  console.log(`Found ${files.length} files to migrate`)

  const fileMappings: Map<string, string> = new Map() // filename → new id

  for (const filename of files) {
    const filepath = join(UPLOADS_DIR, filename)
    const buffer = readFileSync(filepath)
    const ext = extname(filename).toLowerCase()
    const mimeType = MIME_MAP[ext] || 'application/octet-stream'
    const id = randomUUID()

    await pool.query(
      `INSERT INTO uploads (id, filename, mime_type, data, size) VALUES ($1, $2, $3, $4, $5)`,
      [id, filename, mimeType, buffer, buffer.length]
    )

    fileMappings.set(filename, id)
    console.log(`  ${filename} → ${id} (${(buffer.length / 1024).toFixed(1)}KB)`)
  }

  // Update URLs in entries content
  console.log('\nUpdating content URLs...')

  for (const [filename, id] of fileMappings) {
    const oldUrl = `/uploads/${filename}`
    const newUrl = `/api/files/${id}`

    // Update markdown content
    const mdResult = await pool.query(
      `UPDATE entries SET markdown_content = REPLACE(markdown_content, $1, $2) WHERE markdown_content LIKE $3`,
      [oldUrl, newUrl, `%${oldUrl}%`]
    )
    if (mdResult.rowCount && mdResult.rowCount > 0) {
      console.log(`  Updated ${mdResult.rowCount} markdown references: ${oldUrl}`)
    }

    // Update richtext content (data URLs might also reference old paths)
    const rtResult = await pool.query(
      `UPDATE entries SET richtext_content = REPLACE(richtext_content, $1, $2) WHERE richtext_content LIKE $3`,
      [oldUrl, newUrl, `%${oldUrl}%`]
    )
    if (rtResult.rowCount && rtResult.rowCount > 0) {
      console.log(`  Updated ${rtResult.rowCount} richtext references: ${oldUrl}`)
    }

    // Update html_content
    const htmlResult = await pool.query(
      `UPDATE entries SET html_content = REPLACE(html_content, $1, $2) WHERE html_content LIKE $3`,
      [oldUrl, newUrl, `%${oldUrl}%`]
    )
    if (htmlResult.rowCount && htmlResult.rowCount > 0) {
      console.log(`  Updated ${htmlResult.rowCount} html references: ${oldUrl}`)
    }
  }

  await pool.end()
  console.log('\nFile migration complete!')
}

main().catch((err) => {
  console.error('File migration failed:', err)
  process.exit(1)
})
