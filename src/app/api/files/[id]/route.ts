import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  const result = await db.query('SELECT data, mime_type FROM uploads WHERE id = $1', [id])

  if (result.rows.length === 0) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 })
  }

  const { data, mime_type } = result.rows[0]

  return new NextResponse(data, {
    headers: {
      'Content-Type': mime_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(data.length),
    },
  })
}
