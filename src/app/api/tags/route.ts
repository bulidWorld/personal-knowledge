import { NextResponse, NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, unknownError, validationError } from '@/lib/api-error'

export async function GET() {
  try {
    const db = await getDb()
    const result = await db.query(`
      SELECT t.*, COUNT(et.entry_id)::int as entry_count
      FROM tags t
      LEFT JOIN entry_tags et ON t.id = et.tag_id
      GROUP BY t.id
      ORDER BY t.created_at
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiErrorFromUnknown(error, '查询标签失败')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name?.trim()) {
      return validationError('标签名称不能为空')
    }

    const db = await getDb()
    const id = body.id || `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    await db.query(
      `INSERT INTO tags (id, name, color)
       VALUES ($1, $2, $3)`,
      [id, body.name.trim(), body.color || '#6366f1']
    )

    return NextResponse.json({ id, name: body.name.trim(), color: body.color || '#6366f1' }, { status: 201 })
  } catch (error) {
    return apiErrorFromUnknown(error, '创建标签失败')
  }
}
