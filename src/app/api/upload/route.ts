import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { apiError, unknownError, validationError } from '@/lib/api-error'
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
      return validationError('未找到图片文件')
    }

    if (!file.type.startsWith('image/') || !MIME_WHITELIST.includes(file.type)) {
      return validationError('仅支持图片文件 (png, jpg, webp, gif, svg, bmp)')
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError('FILE_TOO_LARGE', '图片大小不能超过 10MB')
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
    return unknownError('上传失败')
  }
}
