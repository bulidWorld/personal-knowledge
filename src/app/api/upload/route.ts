import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { randomUUID } from 'node:crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const MIME_WHITELIST = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '未找到图片文件' }, { status: 400 })
    }

    if (!file.type.startsWith('image/') || !MIME_WHITELIST.includes(file.type)) {
      return NextResponse.json({ error: '仅支持图片文件 (png, jpg, webp, gif, svg, bmp)' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 })
    }

    const db = await getDb()
    const id = randomUUID()
    const buffer = Buffer.from(await file.arrayBuffer())

    await db.query(
      `INSERT INTO uploads (id, filename, mime_type, data, size)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, file.name || `paste-${Date.now()}.png`, file.type, buffer, buffer.length]
    )

    return NextResponse.json({ url: `/api/files/${id}`, id })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
