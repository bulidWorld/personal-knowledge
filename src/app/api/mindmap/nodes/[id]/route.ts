import { NextRequest, NextResponse } from 'next/server'
import { getDb, persist } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params
  const body = await request.json()

  // Fetch existing node to merge with partial updates
  const existing = db.prepare('SELECT * FROM mindmap_nodes WHERE id = ?')
  existing.bind([id])
  if (!existing.step()) {
    existing.free()
    return NextResponse.json({ error: '节点不存在' }, { status: 404 })
  }
  const cur = existing.getAsObject() as Record<string, unknown>
  existing.free()

  const now = new Date().toISOString()
  db.run(
    `UPDATE mindmap_nodes
     SET title = ?, html_content = ?, markdown_content = ?, richtext_content = ?, content_type = ?,
         node_type = ?, parent_id = ?, x = ?, y = ?, color = ?, updated_at = ?
     WHERE id = ?`,
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
  await persist()

  const stmt = db.prepare('SELECT * FROM mindmap_nodes WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const node = stmt.getAsObject()
  stmt.free()
  return NextResponse.json(node)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  db.run('DELETE FROM mindmap_connections WHERE source_node_id = ? OR target_node_id = ?', [id, id])
  db.run('DELETE FROM mindmap_nodes WHERE parent_id = ?', [id])
  db.run('DELETE FROM mindmap_nodes WHERE id = ?', [id])
  await persist()
  return NextResponse.json({ success: true })
}
