import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '未找到图片文件' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '仅支持图片文件' }, { status: 400 })
    }

    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true })
    }

    const ext = MIME_TO_EXT[file.type] || '.png'
    const filename = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    writeFileSync(join(UPLOADS_DIR, filename), buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
