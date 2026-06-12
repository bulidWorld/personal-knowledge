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

    const checkResult = await db.query('SELECT id FROM tags WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return notFoundError('标签不存在')
    }

    const body = await request.json()
    if (!body.name?.trim()) {
      return validationError('标签名称不能为空')
    }

    await db.query(
      `UPDATE tags SET name = $1, color = $2 WHERE id = $3`,
      [body.name.trim(), body.color || '#6366f1', id]
    )

    return NextResponse.json({ id, name: body.name.trim(), color: body.color || '#6366f1' })
  } catch (error) {
    return apiErrorFromUnknown(error, '更新标签失败')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

    const checkResult = await db.query('SELECT id FROM tags WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return notFoundError('标签不存在')
    }

    // CASCADE will clean up entry_tags
    await db.query('DELETE FROM tags WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorFromUnknown(error, '删除标签失败')
  }
}
