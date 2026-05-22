
export default defineEventHandler(async (event) => {
  const db = await getDb()
  const body = await readBody(event)

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: '标题不能为空' })
  }
  if (!body.categoryId) {
    throw createError({ statusCode: 400, statusMessage: '请选择分类' })
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

  return entry
})
