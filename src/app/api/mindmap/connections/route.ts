import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, validationError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    const systemId = request.nextUrl.searchParams.get('systemId')
    if (!systemId) return validationError('缺少 systemId')

    const result = await db.query('SELECT * FROM mindmap_connections WHERE system_id = $1', [systemId])
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiErrorFromUnknown(error, '查询思维导图连线失败')
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    const body = await request.json()
    if (!body.systemId) return validationError('缺少 systemId')
    if (!body.sourceNodeId) return validationError('缺少 sourceNodeId')
    if (!body.targetNodeId) return validationError('缺少 targetNodeId')

    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    await db.query('INSERT INTO mindmap_connections VALUES ($1, $2, $3, $4, $5)', [
      id, body.systemId, body.sourceNodeId, body.targetNodeId, now,
    ])

    const result = await db.query('SELECT * FROM mindmap_connections WHERE id = $1', [id])
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return apiErrorFromUnknown(error, '创建思维导图连线失败')
  }
}
