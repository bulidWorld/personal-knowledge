export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })

  db.run('DELETE FROM mindmap_connections WHERE system_id = ?', [id])
  db.run('DELETE FROM mindmap_nodes WHERE system_id = ?', [id])
  db.run('DELETE FROM systems WHERE id = ?', [id])
  await persist()
  return { success: true }
})
