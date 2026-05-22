
export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })

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
    throw createError({ statusCode: 404, statusMessage: '条目不存在' })
  }
  const entry = stmt.getAsObject()
  stmt.free()
  return entry
})
