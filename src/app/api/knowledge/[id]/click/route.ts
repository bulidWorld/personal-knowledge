import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ensureEntryClickSchema } from '@/lib/hot-card'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  await ensureEntryClickSchema(db)

  const { id } = await params
  const entryResult = await db.query('SELECT id FROM entries WHERE id = $1', [id])
  if (entryResult.rows.length === 0) {
    return NextResponse.json({ error: '条目不存在' }, { status: 404 })
  }

  const clickResult = await db.query(
    `WITH counted_window AS (
       INSERT INTO entry_click_windows (entry_id, last_counted_at)
       VALUES ($1, NOW())
       ON CONFLICT (entry_id) DO UPDATE
       SET last_counted_at = NOW()
       WHERE entry_click_windows.last_counted_at < NOW() - INTERVAL '60 seconds'
       RETURNING entry_id
     ),
     inserted_click AS (
       INSERT INTO entry_clicks (entry_id)
       SELECT entry_id FROM counted_window
       RETURNING id
     )
     SELECT EXISTS(SELECT 1 FROM inserted_click) as counted`,
    [id]
  )

  if (!clickResult.rows[0]?.counted) {
    return NextResponse.json({ success: true, counted: false })
  }

  return NextResponse.json({ success: true, counted: true })
}
