import { NextRequest, NextResponse } from 'next/server'
import { getDb, persist } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: '系统名称不能为空' }, { status: 400 })

  const now = new Date().toISOString()
  db.run('UPDATE systems SET name = ?, description = ?, updated_at = ? WHERE id = ?', [
    body.name.trim(), body.description || '', now, id,
  ])
  await persist()

  const stmt = db.prepare('SELECT * FROM systems WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const system = stmt.getAsObject()
  stmt.free()
  return NextResponse.json(system)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  db.run('DELETE FROM mindmap_connections WHERE system_id = ?', [id])
  db.run('DELETE FROM mindmap_nodes WHERE system_id = ?', [id])
  db.run('DELETE FROM systems WHERE id = ?', [id])
  await persist()
  return NextResponse.json({ success: true })
}
