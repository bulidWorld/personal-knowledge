import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  const db = await getDb()
  const systemId = request.nextUrl.searchParams.get('systemId')
  if (!systemId) return NextResponse.json({ error: '缺少 systemId' }, { status: 400 })

  const result = await db.query('SELECT * FROM mindmap_nodes WHERE system_id = $1 ORDER BY created_at ASC', [systemId])
  return NextResponse.json(result.rows)
}

export async function POST(request: NextRequest) {
  const db = await getDb()
  const body = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: '节点标题不能为空' }, { status: 400 })
  if (!body.systemId) return NextResponse.json({ error: '缺少 systemId' }, { status: 400 })
  if (!body.nodeType) return NextResponse.json({ error: '缺少 nodeType' }, { status: 400 })

  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  await db.query(
    `INSERT INTO mindmap_nodes (id, system_id, title, html_content, markdown_content, richtext_content, content_type, node_type, parent_id, x, y, color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id, body.systemId, body.title.trim(),
      body.htmlContent || '', body.markdownContent || '', body.richtextContent || '',
      body.contentType || 'html', body.nodeType, body.parentId || null,
      body.x ?? 400, body.y ?? 300, body.color || '', now, now,
    ]
  )

  const result = await db.query('SELECT * FROM mindmap_nodes WHERE id = $1', [id])
  return NextResponse.json(result.rows[0])
}
