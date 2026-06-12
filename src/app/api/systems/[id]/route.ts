import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, notFoundError, validationError } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params
    const body = await request.json()
    if (!body.name?.trim()) return validationError('系统名称不能为空')

    const now = new Date().toISOString()
    const updateResult = await db.query('UPDATE systems SET name = $1, description = $2, updated_at = $3 WHERE id = $4', [
      body.name.trim(), body.description || '', now, id,
    ])
    if (updateResult.rowCount === 0) return notFoundError('系统不存在')

    const result = await db.query('SELECT * FROM systems WHERE id = $1', [id])
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return apiErrorFromUnknown(error, '更新系统失败')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

    await db.query('DELETE FROM mindmap_connections WHERE system_id = $1', [id])
    await db.query('DELETE FROM mindmap_nodes WHERE system_id = $1', [id])
    const result = await db.query('DELETE FROM systems WHERE id = $1', [id])
    if (result.rowCount === 0) return notFoundError('系统不存在')
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorFromUnknown(error, '删除系统失败')
  }
}
