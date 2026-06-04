import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  const result = await db.query(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     WHERE e.id = $1`,
    [id]
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }

  return NextResponse.json(result.rows[0])
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params
  const body = await request.json()

  const checkResult = await db.query('SELECT id FROM entries WHERE id = $1', [id])
  if (checkResult.rows.length === 0) {
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  if (!body.categoryId) {
    return NextResponse.json({ error: '请选择分类' }, { status: 400 })
  }

  const now = new Date().toISOString()

  await db.query(
    `UPDATE entries
     SET title = $1, html_content = $2, markdown_content = $3, richtext_content = $4, content_type = $5, category_id = $6, iframe_url = $7, image_url = $8, updated_at = $9
     WHERE id = $10`,
    [body.title.trim(), body.htmlContent || '', body.markdownContent || '', body.richtextContent || '', body.contentType || 'html', body.categoryId, body.iframeUrl || null, body.imageUrl || null, now, id]
  )

  const result = await db.query(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     WHERE e.id = $1`,
    [id]
  )

  return NextResponse.json(result.rows[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  const checkResult = await db.query('SELECT id FROM entries WHERE id = $1', [id])
  if (checkResult.rows.length === 0) {
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }

  await db.query('DELETE FROM entries WHERE id = $1', [id])

  return NextResponse.json({ success: true })
}
