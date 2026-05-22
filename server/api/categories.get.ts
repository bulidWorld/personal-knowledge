
export default defineEventHandler(async (event) => {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT c.*, COUNT(e.id) as entry_count
    FROM categories c
    LEFT JOIN entries e ON c.id = e.category_id
    GROUP BY c.id
    ORDER BY c.rowid
  `)
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
})
