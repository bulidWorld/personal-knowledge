import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: '系统名称不能为空' }, { status: 400 })

  const now = new Date().toISOString()
  await db.query('UPDATE systems SET name = $1, description = $2, updated_at = $3 WHERE id = $4', [
    body.name.trim(), body.description || '', now, id,
  ])

  const result = await db.query('SELECT * FROM systems WHERE id = $1', [id])
  return NextResponse.json(result.rows[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  await db.query('DELETE FROM mindmap_connections WHERE system_id = $1', [id])
  await db.query('DELETE FROM mindmap_nodes WHERE system_id = $1', [id])
  await db.query('DELETE FROM systems WHERE id = $1', [id])
  return NextResponse.json({ success: true })
}
