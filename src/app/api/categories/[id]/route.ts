import { NextResponse, NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, notFoundError, unknownError, validationError } from '@/lib/api-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.name?.trim()) {
      return validationError('分类名称不能为空')
    }
    const db = await getDb()

    const result = await db.query(
      `UPDATE categories SET name = $1, icon = $2, border_color = $3, dot_color = $4, gradient = $5, description = $6 WHERE id = $7`,
      [
        body.name.trim(),
        body.icon || 'LayoutGrid',
        body.borderColor || '',
        body.dotColor || '',
        body.gradient || '',
        body.description || '',
        id,
      ]
    )
    if (result.rowCount === 0) return notFoundError('分类不存在')

    return NextResponse.json({ id, ...body, name: body.name.trim() })
  } catch {
    return unknownError('更新分类失败')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()

    // Check if category has entries
    const countResult = await db.query('SELECT COUNT(*)::int as count FROM entries WHERE category_id = $1', [id])
    const count = countResult.rows[0].count

    if (count > 0) {
      return validationError(`该分类下有 ${count} 条知识条目，请先移动或删除这些条目后再删除分类`)
    }

    const result = await db.query('DELETE FROM categories WHERE id = $1', [id])
    if (result.rowCount === 0) return notFoundError('分类不存在')

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorFromUnknown(error, '删除分类失败')
  }
}
