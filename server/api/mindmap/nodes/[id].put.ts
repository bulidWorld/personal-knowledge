export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })
  const body = await readBody(event)

  // Fetch existing node to merge with partial updates
  const existing = db.prepare('SELECT * FROM mindmap_nodes WHERE id = ?')
  existing.bind([id])
  if (!existing.step()) { existing.free(); throw createError({ statusCode: 404, statusMessage: '节点不存在' }) }
  const cur = existing.getAsObject() as any
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
  return node
})
