export default defineEventHandler(async () => {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT s.*, COUNT(mn.id) as node_count
    FROM systems s
    LEFT JOIN mindmap_nodes mn ON s.id = mn.system_id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `)
  const systems: any[] = []
  while (stmt.step()) systems.push(stmt.getAsObject())
  stmt.free()
  return systems
})
