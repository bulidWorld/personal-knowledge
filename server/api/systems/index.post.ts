export default defineEventHandler(async (event) => {
  const db = await getDb()
  const body = await readBody(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: '系统名称不能为空' })

  const id = `system-${Date.now()}`
  const now = new Date().toISOString()
  const icon = body.icon || 'Network'
  const borderColor = body.borderColor || 'border-l-teal-500'
  const dotColor = body.dotColor || 'bg-teal-500'
  const gradient = body.gradient || 'bg-gradient-to-r from-teal-400 to-teal-500'

  db.run('INSERT INTO systems VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    id, body.name.trim(), body.description || '', icon, borderColor, dotColor, gradient, now, now,
  ])

  // Auto-create root topic node
  const rootId = `node-${Date.now()}`
  db.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    rootId, id, body.name.trim(), '', '', '', 'html', 'topic', null, 400, 250, '#10b981', now, now,
  ])

  await persist()

  const stmt = db.prepare('SELECT * FROM systems WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const system = stmt.getAsObject()
  stmt.free()
  return { ...system, nodeCount: 1 }
})
