export default defineEventHandler(async (event) => {
  const db = await getDb()
  const body = await readBody(event)
  if (!body.systemId) throw createError({ statusCode: 400, statusMessage: '缺少 systemId' })
  if (!body.sourceNodeId) throw createError({ statusCode: 400, statusMessage: '缺少 sourceNodeId' })
  if (!body.targetNodeId) throw createError({ statusCode: 400, statusMessage: '缺少 targetNodeId' })

  const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  db.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [
    id, body.systemId, body.sourceNodeId, body.targetNodeId, now,
  ])
  await persist()

  const stmt = db.prepare('SELECT * FROM mindmap_connections WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const conn = stmt.getAsObject()
  stmt.free()
  return conn
})
