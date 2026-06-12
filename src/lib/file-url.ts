import { shouldUseTauriCommands } from '@/services/runtime'

const API_FILE_PREFIX = '/api/files/'
const DESKTOP_FILE_PROTOCOL = 'pk-file'

function fileIdFromApiUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith(API_FILE_PREFIX)) {
    return trimmed.slice(API_FILE_PREFIX.length).split(/[/?#]/)[0] || null
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost'
    const url = new URL(trimmed, base)
    if (url.pathname.startsWith(API_FILE_PREFIX)) {
      return url.pathname.slice(API_FILE_PREFIX.length).split(/[/?#]/)[0] || null
    }
  } catch {
    return null
  }

  return null
}

function desktopFileUrl(fileId: string): string {
  const encodedId = encodeURIComponent(fileId)

  if (
    typeof window !== 'undefined'
    && (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    && window.location.hostname.endsWith('.localhost')
  ) {
    return `${window.location.protocol}//${DESKTOP_FILE_PROTOCOL}.localhost/${encodedId}`
  }

  return `${DESKTOP_FILE_PROTOCOL}://localhost/${encodedId}`
}

export function resolveFileUrl(idOrUrl: string): string {
  if (!idOrUrl) return idOrUrl

  if (
    idOrUrl.startsWith('blob:')
    || idOrUrl.startsWith('data:')
    || idOrUrl.startsWith(`${DESKTOP_FILE_PROTOCOL}://`)
    || idOrUrl.startsWith(`http://${DESKTOP_FILE_PROTOCOL}.localhost/`)
    || idOrUrl.startsWith(`https://${DESKTOP_FILE_PROTOCOL}.localhost/`)
  ) {
    return idOrUrl
  }

  const fileId = fileIdFromApiUrl(idOrUrl)
  if (fileId) {
    return shouldUseTauriCommands() ? desktopFileUrl(fileId) : idOrUrl
  }

  if (
    idOrUrl.startsWith('http://')
    || idOrUrl.startsWith('https://')
  ) {
    return idOrUrl
  }

  return shouldUseTauriCommands() ? desktopFileUrl(idOrUrl) : `${API_FILE_PREFIX}${idOrUrl}`
}

export function rewriteFileUrls(content: string): string {
  if (!content || !shouldUseTauriCommands()) return content

  return content.replace(
    /(^|[\s"'(=])((?:https?:\/\/[^"'()\s<>]+)?\/api\/files\/[A-Za-z0-9._~%-]+(?:[?#][^"'()\s<>]*)?)/g,
    (_match, prefix: string, url: string) => `${prefix}${resolveFileUrl(url)}`,
  )
}
