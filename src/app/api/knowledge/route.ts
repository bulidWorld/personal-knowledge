import { NextRequest, NextResponse } from 'next/server'
import type { SqlValue } from 'sql.js'
import { getDb, persist } from '@/lib/db'

export async function GET(request: NextRequest) {
  const db = await getDb()
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 9))
  const search = searchParams.get('search')?.trim() || ''
  const categoryId = searchParams.get('categoryId') || ''

  const whereClauses: string[] = []
  const params: SqlValue[] = []

  if (categoryId) {
    whereClauses.push('e.category_id = ?')
    params.push(categoryId)
  }

  if (search) {
    whereClauses.push('(e.title LIKE ? OR e.html_content LIKE ? OR e.markdown_content LIKE ? OR e.richtext_content LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM entries e ${whereSQL}`)
  countStmt.bind(params)
  countStmt.step()
  const { total } = countStmt.getAsObject() as { total: number }
  countStmt.free()

  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize

  const stmt = db.prepare(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     ${whereSQL}
     ORDER BY e.updated_at DESC
     LIMIT ? OFFSET ?`
  )
  stmt.bind([...params, pageSize, offset])

  const entries: unknown[] = []
  while (stmt.step()) {
    entries.push(stmt.getAsObject())
  }
  stmt.free()

  return NextResponse.json({ entries, total, page, pageSize, totalPages })
}

export async function POST(request: NextRequest) {
  const db = await getDb()
  const body = await request.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  if (!body.categoryId) {
    return NextResponse.json({ error: '请选择分类' }, { status: 400 })
  }

  const id = body.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  db.run(
    `INSERT INTO entries (id, title, html_content, markdown_content, richtext_content, content_type, category_id, iframe_url, image_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.title.trim(), body.htmlContent || '', body.markdownContent || '', body.richtextContent || '', body.contentType || 'html', body.categoryId, body.iframeUrl || null, body.imageUrl || null, now, now]
  )

  await persist()

  const stmt = db.prepare(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     WHERE e.id = ?`
  )
  stmt.bind([id])
  stmt.step()
  const entry = stmt.getAsObject()
  stmt.free()

  return NextResponse.json(entry)
}
