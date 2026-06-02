import { NextRequest, NextResponse } from 'next/server'
import { getDb, persist } from '@/lib/db'

export async function GET(request: NextRequest) {
  const db = await getDb()
  const systemId = request.nextUrl.searchParams.get('systemId')
  if (!systemId) return NextResponse.json({ error: '缺少 systemId' }, { status: 400 })

  const stmt = db.prepare('SELECT * FROM mindmap_connections WHERE system_id = ?')
  stmt.bind([systemId])
  const connections: unknown[] = []
  while (stmt.step()) connections.push(stmt.getAsObject())
  stmt.free()
  return NextResponse.json(connections)
}

export async function POST(request: NextRequest) {
  const db = await getDb()
  const body = await request.json()
  if (!body.systemId) return NextResponse.json({ error: '缺少 systemId' }, { status: 400 })
  if (!body.sourceNodeId) return NextResponse.json({ error: '缺少 sourceNodeId' }, { status: 400 })
  if (!body.targetNodeId) return NextResponse.json({ error: '缺少 targetNodeId' }, { status: 400 })

  const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()

  db.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [
    id, body.systemId, body.sourceNodeId, body.targetNodeId, now,
  ])
  await persist()

  const stmt = db.prepare('SELECT * FROM mindmap_connections WHERE id = ?')
  stmt.bind([id])
  stmt.step()
  const conn = stmt.getAsObject()
  stmt.free()
  return NextResponse.json(conn)
}
