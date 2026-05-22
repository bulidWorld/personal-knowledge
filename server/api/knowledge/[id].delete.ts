
export default defineEventHandler(async (event) => {
  const db = await getDb()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少 ID' })

  const checkStmt = db.prepare('SELECT id FROM entries WHERE id = ?')
  checkStmt.bind([id])
  if (!checkStmt.step()) {
    checkStmt.free()
    throw createError({ statusCode: 404, statusMessage: '条目不存在' })
  }
  checkStmt.free()

  db.run('DELETE FROM entries WHERE id = ?', [id])
  await persist()

  return { success: true }
})
