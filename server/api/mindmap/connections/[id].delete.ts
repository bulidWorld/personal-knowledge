export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })

  db.run('DELETE FROM mindmap_connections WHERE id = ?', [id])
  await persist()
  return { success: true }
})
