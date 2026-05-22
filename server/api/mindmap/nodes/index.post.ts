export default defineEventHandler(async (event) => {
  const db = await getDb()
  const body = await readBody(event)
  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: '节点标题不能为空' })
  if (!body.systemId) throw createError({ statusCode: 400, statusMessage: '缺少 systemId' })
  if (!body.nodeType) throw createError({ statusCode: 400, statusMessage: '缺少 nodeType' })

  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  db.run(
    `INSERT INTO mindmap_nodes (id, system_id, title, html_content, markdown_content, richtext_content, content_type, node_type, parent_id, x, y, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, body.systemId, body.title.trim(),
      body.htmlContent || '', body.markdownContent || '', body.richtextContent || '',
      body.contentType || 'html', body.nodeType, body.parentId || null,
      body.x ?? 400, body.y ?? 300, body.color || '', now, now,
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
