export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })

  // Delete child connections first, then child nodes (cascade from FK), then own connections
  db.run('DELETE FROM mindmap_connections WHERE source_node_id = ? OR target_node_id = ?', [id, id])
  db.run('DELETE FROM mindmap_nodes WHERE parent_id = ?', [id])
  db.run('DELETE FROM mindmap_nodes WHERE id = ?', [id])
  await persist()
  return { success: true }
})
