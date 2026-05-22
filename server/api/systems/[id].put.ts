export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })
  const body = await readBody(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: '系统名称不能为空' })

  const now = new Date().toISOString()
  db.run('UPDATE systems SET name = ?, description = ?, updated_at = ? WHERE id = ?', [
    body.name.trim(), body.description || '', now, id,
  ])
  await persist()

  const stmt = db.prepare('SELECT * FROM systems WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const system = stmt.getAsObject()
  stmt.free()
  return system
})
