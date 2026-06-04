import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  await db.query('DELETE FROM mindmap_connections WHERE id = $1', [id])
  return NextResponse.json({ success: true })
}
