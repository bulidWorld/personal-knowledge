import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, notFoundError } from '@/lib/api-error'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

    const result = await db.query('DELETE FROM mindmap_connections WHERE id = $1', [id])
    if (result.rowCount === 0) return notFoundError('连线不存在')
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorFromUnknown(error, '删除思维导图连线失败')
  }
}
