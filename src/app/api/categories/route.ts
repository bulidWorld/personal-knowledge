import { NextResponse, NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, unknownError, validationError } from '@/lib/api-error'
import { randomUUID } from 'node:crypto'

export async function GET() {
  try {
    const db = await getDb()
    const result = await db.query(`
      SELECT c.*, COUNT(e.id)::int as entry_count
      FROM categories c
      LEFT JOIN entries e ON c.id = e.category_id
      GROUP BY c.id
      ORDER BY c.created_at
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiErrorFromUnknown(error, '查询分类失败')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name?.trim()) {
      return validationError('分类名称不能为空')
    }
    const id = randomUUID()
    const db = await getDb()

    await db.query(
      `INSERT INTO categories (id, name, icon, border_color, dot_color, gradient, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        body.name.trim(),
        body.icon || 'LayoutGrid',
        body.borderColor || 'border-l-blue-500',
        body.dotColor || 'bg-blue-500',
        body.gradient || 'bg-gradient-to-r from-blue-400 to-blue-500',
        body.description || '',
      ]
    )

    return NextResponse.json({ id, ...body, name: body.name.trim() }, { status: 201 })
  } catch (err) {
    return unknownError('创建分类失败')
  }
}
