import { NextResponse, NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { randomUUID } from 'node:crypto'

export async function GET() {
  const db = await getDb()
  const result = await db.query(`
    SELECT c.*, COUNT(e.id)::int as entry_count
    FROM categories c
    LEFT JOIN entries e ON c.id = e.category_id
    GROUP BY c.id
    ORDER BY c.created_at
  `)
  return NextResponse.json(result.rows)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = randomUUID()
    const db = await getDb()

    await db.query(
      `INSERT INTO categories (id, name, icon, border_color, dot_color, gradient, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        body.name || '',
        body.icon || 'LayoutGrid',
        body.borderColor || 'border-l-blue-500',
        body.dotColor || 'bg-blue-500',
        body.gradient || 'bg-gradient-to-r from-blue-400 to-blue-500',
        body.description || '',
      ]
    )

    return NextResponse.json({ id, ...body }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: '创建分类失败' }, { status: 500 })
  }
}
