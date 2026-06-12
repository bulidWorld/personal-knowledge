import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, notFoundError } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params
    const body = await request.json()

    // Fetch existing node to merge with partial updates
    const existingResult = await db.query('SELECT * FROM mindmap_nodes WHERE id = $1', [id])
    if (existingResult.rows.length === 0) {
      return notFoundError('节点不存在')
    }
    const cur = existingResult.rows[0] as Record<string, unknown>

    const now = new Date().toISOString()
    await db.query(
      `UPDATE mindmap_nodes
       SET title = $1, html_content = $2, markdown_content = $3, richtext_content = $4, content_type = $5,
           node_type = $6, parent_id = $7, x = $8, y = $9, color = $10, updated_at = $11
       WHERE id = $12`,
      [
        body.title?.trim() ?? cur.title,
        body.htmlContent ?? cur.html_content ?? '',
        body.markdownContent ?? cur.markdown_content ?? '',
        body.richtextContent ?? cur.richtext_content ?? '',
        body.contentType ?? cur.content_type ?? 'html',
        body.nodeType ?? cur.node_type,
        body.parentId !== undefined ? (body.parentId ?? null) : cur.parent_id,
        body.x ?? cur.x,
        body.y ?? cur.y,
        body.color ?? cur.color ?? '',
        now, id,
      ]
    )

    const result = await db.query('SELECT * FROM mindmap_nodes WHERE id = $1', [id])
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return apiErrorFromUnknown(error, '更新思维导图节点失败')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

    await db.query('DELETE FROM mindmap_connections WHERE source_node_id = $1 OR target_node_id = $1', [id])
    await db.query('DELETE FROM mindmap_nodes WHERE parent_id = $1', [id])
    const result = await db.query('DELETE FROM mindmap_nodes WHERE id = $1', [id])
    if (result.rowCount === 0) return notFoundError('节点不存在')
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorFromUnknown(error, '删除思维导图节点失败')
  }
}
