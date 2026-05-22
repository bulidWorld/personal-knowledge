export default defineEventHandler(async (event) => {
  const db = await getDb()
  const query = getQuery(event)
  const systemId = query.systemId as string
  if (!systemId) throw createError({ statusCode: 400, statusMessage: '缺少 systemId' })

  const stmt = db.prepare('SELECT * FROM mindmap_nodes WHERE system_id = ? ORDER BY created_at ASC')
  stmt.bind([systemId])
  const nodes: any[] = []
  while (stmt.step()) nodes.push(stmt.getAsObject())
  stmt.free()
  return nodes
})
