import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, notFoundError, validationError } from '@/lib/api-error'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

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

    if (result.rows.length === 0) {
      return notFoundError('条目不存在')
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    return apiErrorFromUnknown(error, '查询知识详情失败')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params
    const body = await request.json()

    const checkResult = await db.query('SELECT id FROM entries WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return notFoundError('条目不存在')
    }

    if (!body.title?.trim()) {
      return validationError('标题不能为空')
    }
    if (!body.categoryId) {
      return validationError('请选择分类')
    }

    const now = new Date().toISOString()

    await db.query(
      `UPDATE entries
       SET title = $1, html_content = $2, markdown_content = $3, richtext_content = $4, content_type = $5, category_id = $6, iframe_url = $7, image_url = $8, updated_at = $9
       WHERE id = $10`,
      [body.title.trim(), body.htmlContent || '', body.markdownContent || '', body.richtextContent || '', body.contentType || 'html', body.categoryId, body.iframeUrl || null, body.imageUrl || null, now, id]
    )

    // Sync tag associations
    if (Array.isArray(body.tagIds)) {
      await db.query('DELETE FROM entry_tags WHERE entry_id = $1', [id])
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
  } catch (error) {
    return apiErrorFromUnknown(error, '更新知识失败')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

    const checkResult = await db.query('SELECT id FROM entries WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return notFoundError('条目不存在')
    }

    // CASCADE handles entry_tags cleanup
    await db.query('DELETE FROM entries WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiErrorFromUnknown(error, '删除知识失败')
  }
}
