import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = await getDb()
  const result = await db.query(`
    SELECT s.*, COUNT(mn.id)::int as node_count
    FROM systems s
    LEFT JOIN mindmap_nodes mn ON s.id = mn.system_id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `)
  return NextResponse.json(result.rows)
}

export async function POST(request: NextRequest) {
  const db = await getDb()
  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: '系统名称不能为空' }, { status: 400 })

  const id = `system-${Date.now()}`
  const now = new Date().toISOString()
  const icon = body.icon || 'Network'
  const borderColor = body.borderColor || 'border-l-teal-500'
  const dotColor = body.dotColor || 'bg-teal-500'
  const gradient = body.gradient || 'bg-gradient-to-r from-teal-400 to-teal-500'

  await db.query('INSERT INTO systems VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
    id, body.name.trim(), body.description || '', icon, borderColor, dotColor, gradient, now, now,
  ])

  // Auto-create root topic node
  const rootId = `node-${Date.now()}`
  await db.query('INSERT INTO mindmap_nodes VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)', [
    rootId, id, body.name.trim(), '', '', '', 'html', 'topic', null, 400, 250, '#10b981', now, now,
  ])

  const result = await db.query('SELECT * FROM systems WHERE id = $1', [id])
  return NextResponse.json({ ...result.rows[0], nodeCount: 1 })
}
