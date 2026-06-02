import { NextRequest, NextResponse } from 'next/server'
import { getDb, persist } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb()
  const { id } = await params

  db.run('DELETE FROM mindmap_connections WHERE id = ?', [id])
  await persist()
  return NextResponse.json({ success: true })
}
