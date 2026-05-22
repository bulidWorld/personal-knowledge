
export default defineEventHandler(async (event) => {
  const db = await getDb()
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 9))
  const search = (query.search as string)?.trim() || ''
  const categoryId = (query.categoryId as string) || ''

  let whereClauses: string[] = []
  let params: any[] = []

  if (categoryId) {
    whereClauses.push('e.category_id = ?')
    params.push(categoryId)
  }

  if (search) {
    whereClauses.push('(e.title LIKE ? OR e.html_content LIKE ? OR e.markdown_content LIKE ? OR e.richtext_content LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM entries e ${whereSQL}`)
  countStmt.bind(params)
  countStmt.step()
  const { total } = countStmt.getAsObject() as { total: number }
  countStmt.free()

  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize

  const stmt = db.prepare(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     ${whereSQL}
     ORDER BY e.updated_at DESC
     LIMIT ? OFFSET ?`
  )
  stmt.bind([...params, pageSize, offset])

  const entries: any[] = []
  while (stmt.step()) {
    entries.push(stmt.getAsObject())
  }
  stmt.free()

  return { entries, total, page, pageSize, totalPages }
})
