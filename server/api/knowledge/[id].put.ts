
export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })
  const body = await readBody(event)

  const checkStmt = db.prepare('SELECT id FROM entries WHERE id = ?')
  checkStmt.bind([id])
  if (!checkStmt.step()) {
    checkStmt.free()
    throw createError({ statusCode: 404, statusMessage: '条目不存在' })
  }
  checkStmt.free()

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: '标题不能为空' })
  }
  if (!body.categoryId) {
    throw createError({ statusCode: 400, statusMessage: '请选择分类' })
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

  return entry
})
