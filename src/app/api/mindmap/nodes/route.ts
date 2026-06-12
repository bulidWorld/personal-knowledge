import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, validationError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    const systemId = request.nextUrl.searchParams.get('systemId')
    if (!systemId) return validationError('缺少 systemId')

    const result = await db.query('SELECT * FROM mindmap_nodes WHERE system_id = $1 ORDER BY created_at ASC', [systemId])
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiErrorFromUnknown(error, '查询思维导图节点失败')
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    const body = await request.json()
    if (!body.title?.trim()) return validationError('节点标题不能为空')
    if (!body.systemId) return validationError('缺少 systemId')
    if (!body.nodeType) return validationError('缺少 nodeType')

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
  } catch (error) {
    return apiErrorFromUnknown(error, '创建思维导图节点失败')
  }
}
