export default defineEventHandler(async (event) => {
  const db = await getDb()
  const query = getQuery(event)
  const systemId = query.systemId as string
  if (!systemId) throw createError({ statusCode: 400, statusMessage: '缺少 systemId' })

  const stmt = db.prepare('SELECT * FROM mindmap_connections WHERE system_id = ?')
  stmt.bind([systemId])
  const connections: any[] = []
  while (stmt.step()) connections.push(stmt.getAsObject())
  stmt.free()
  return connections
})
