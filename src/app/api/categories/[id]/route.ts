import { NextResponse, NextRequest } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const db = await getDb()

    await db.query(
      `UPDATE categories SET name = $1, icon = $2, border_color = $3, dot_color = $4, gradient = $5, description = $6 WHERE id = $7`,
      [
        body.name || '',
        body.icon || 'LayoutGrid',
        body.borderColor || '',
        body.dotColor || '',
        body.gradient || '',
        body.description || '',
        id,
      ]
    )

    return NextResponse.json({ id, ...body })
  } catch {
    return NextResponse.json({ error: '更新分类失败' }, { status: 500 })
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
      return NextResponse.json(
        { error: `该分类下有 ${count} 条知识条目，请先移动或删除这些条目后再删除分类` },
        { status: 400 }
      )
    }

    await db.query('DELETE FROM categories WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 })
  }
}
