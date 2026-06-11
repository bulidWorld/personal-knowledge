import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ensureEntryClickSchema, entryHotScoreSql } from '@/lib/hot-card'

export async function GET(request: NextRequest) {
  const db = await getDb()
  await ensureEntryClickSchema(db)
  const { searchParams } = request.nextUrl

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 9))
  const search = searchParams.get('search')?.trim() || ''
  const categoryId = searchParams.get('categoryId') || ''
  const tagId = searchParams.get('tagId') || ''

  const whereClauses: string[] = []
  const params: unknown[] = []

  if (categoryId) {
    whereClauses.push('e.category_id = $' + (params.length + 1))
    params.push(categoryId)
  }

  if (tagId) {
    whereClauses.push('e.id IN (SELECT entry_id FROM entry_tags WHERE tag_id = $' + (params.length + 1) + ')')
    params.push(tagId)
  }

  if (search) {
    const idx1 = params.length + 1
    const idx2 = params.length + 2
    const idx3 = params.length + 3
    const idx4 = params.length + 4
    whereClauses.push(`(e.title ILIKE $${idx1} OR e.html_content ILIKE $${idx2} OR e.markdown_content ILIKE $${idx3} OR e.richtext_content ILIKE $${idx4})`)
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countResult = await db.query(`SELECT COUNT(*)::int as total FROM entries e ${whereSQL}`, params)
  const total = countResult.rows[0].total

  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize

  const result = await db.query(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient,
       h.hot_score,
       h.click_count,
       COALESCE(
         (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FROM entry_tags et
          JOIN tags t ON et.tag_id = t.id
          WHERE et.entry_id = e.id),
         '[]'::json
       ) as tags
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     LEFT JOIN LATERAL (
       SELECT
         COALESCE(SUM(${entryHotScoreSql('ec')}), 0)::float as hot_score,
         COUNT(ec.id)::int as click_count
       FROM entry_clicks ec
       WHERE ec.entry_id = e.id
     ) h ON true
     ${whereSQL}
     ORDER BY h.hot_score DESC, h.click_count DESC, e.updated_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  )

  return NextResponse.json({ entries: result.rows, total, page, pageSize, totalPages })
}

export async function POST(request: NextRequest) {
  const db = await getDb()
  const body = await request.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
  }
  if (!body.categoryId) {
    return NextResponse.json({ error: '请选择分类' }, { status: 400 })
  }

  const id = body.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  await db.query(
    `INSERT INTO entries (id, title, html_content, markdown_content, richtext_content, content_type, category_id, iframe_url, image_url, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, body.title.trim(), body.htmlContent || '', body.markdownContent || '', body.richtextContent || '', body.contentType || 'html', body.categoryId, body.iframeUrl || null, body.imageUrl || null, now, now]
  )

  // Insert tag associations
  if (Array.isArray(body.tagIds) && body.tagIds.length > 0) {
    for (const tagId of body.tagIds) {
      await db.query(
        `INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, tagId]
      )
    }
  }

  const result = await db.query(
    `SELECT e.*, c.name as category_name, c.icon, c.border_color, c.dot_color, c.gradient,
       COALESCE(
         (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FROM entry_tags et
          JOIN tags t ON et.tag_id = t.id
          WHERE et.entry_id = e.id),
         '[]'::json
       ) as tags
     FROM entries e
     JOIN categories c ON e.category_id = c.id
     WHERE e.id = $1`,
    [id]
  )

  return NextResponse.json(result.rows[0])
}
