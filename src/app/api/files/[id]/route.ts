import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiErrorFromUnknown, notFoundError } from '@/lib/api-error'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb()
    const { id } = await params

    const result = await db.query('SELECT data, mime_type FROM uploads WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return notFoundError('文件不存在')
    }

    const { data, mime_type } = result.rows[0]

    return new NextResponse(data, {
      headers: {
        'Content-Type': mime_type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(data.length),
      },
    })
  } catch (error) {
    return apiErrorFromUnknown(error, '读取文件失败')
  }
}
