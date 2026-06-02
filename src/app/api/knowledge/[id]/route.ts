import { NextRequest, NextResponse } from 'next/server'
import { getDb, persist } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  const stmt = db.prepare(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     WHERE e.id = ?`
  )
  stmt.bind([id])
  const hasRow = stmt.step()
  if (!hasRow) {
    stmt.free()
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }
  const entry = stmt.getAsObject()
  stmt.free()
  return NextResponse.json(entry)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params
  const body = await request.json()

  const checkStmt = db.prepare('SELECT id FROM entries WHERE id = ?')
  checkStmt.bind([id])
  if (!checkStmt.step()) {
    checkStmt.free()
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }
  checkStmt.free()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  if (!body.categoryId) {
    return NextResponse.json({ error: '请选择分类' }, { status: 400 })
  }

  const now = new Date().toISOString()

  db.run(
    `UPDATE entries
     SET title = ?, html_content = ?, markdown_content = ?, richtext_content = ?, content_type = ?, category_id = ?, iframe_url = ?, image_url = ?, updated_at = ?
     WHERE id = ?`,
    [body.title.trim(), body.htmlContent || '', body.markdownContent || '', body.richtextContent || '', body.contentType || 'html', body.categoryId, body.iframeUrl || null, body.imageUrl || null, now, id]
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  const checkStmt = db.prepare('SELECT id FROM entries WHERE id = ?')
  checkStmt.bind([id])
  if (!checkStmt.step()) {
    checkStmt.free()
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }
  checkStmt.free()

  db.run('DELETE FROM entries WHERE id = ?', [id])
  await persist()

  return NextResponse.json({ success: true })
}
