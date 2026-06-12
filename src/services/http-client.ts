import { APP_ERROR_CODES, type AppErrorCode, type AppErrorPayload } from '@/types/api'

export interface ServiceErrorOptions {
  status?: number
  code?: string
  details?: unknown
}

const FALLBACK_ERROR_CODE: AppErrorCode = 'UNKNOWN_ERROR'

const APP_ERROR_CODE_SET = new Set<string>(APP_ERROR_CODES)

const LEGACY_ERROR_CODE_MAP: Record<string, AppErrorCode> = {
  DATABASE_NOT_CONFIGURED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'UNKNOWN_ERROR',
  NOT_DESKTOP_RUNTIME: 'DESKTOP_ONLY',
  TAURI_COMMAND_FAILED: 'UNKNOWN_ERROR',
  TAURI_INVOKE_UNAVAILABLE: 'UNKNOWN_ERROR',
}

export class ServiceError extends Error implements AppErrorPayload {
  status?: number
  code: AppErrorCode
  details?: unknown

  constructor(message: string, options: ServiceErrorOptions = {}) {
    super(sanitizeErrorMessage(message))
    this.name = 'ServiceError'
    this.status = options.status
    this.code = normalizeErrorCode(options.code)
    this.details = options.details
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

export function getErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (isServiceError(error)) return error.message
  if (error instanceof Error && error.message) return sanitizeErrorMessage(error.message)
  return fallback
}

export function normalizeErrorCode(code: unknown): AppErrorCode {
  if (typeof code !== 'string' || !code) return FALLBACK_ERROR_CODE
  if (APP_ERROR_CODE_SET.has(code)) return code as AppErrorCode
  return LEGACY_ERROR_CODE_MAP[code] || FALLBACK_ERROR_CODE
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/postgres:\/\/[^\s]+/gi, 'postgres://***')
    .replace(/(password=)[^\s&]+/gi, '$1***')
    .replace(/(api[_-]?key=)[^\s&]+/gi, '$1***')
}

function buildUrl(url: string, query?: object): string {
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }

  const queryString = params.toString()
  if (!queryString) return url
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  const text = await response.text()
  return text || undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function extractApiError(body: unknown, status: number): AppErrorPayload {
  if (isRecord(body)) {
    const nestedError = body.error
    if (isRecord(nestedError)) {
      const message = typeof nestedError.message === 'string' && nestedError.message
        ? nestedError.message
        : `请求失败 (${status})`

      return {
        code: normalizeErrorCode(nestedError.code),
        message: sanitizeErrorMessage(message),
        details: nestedError.details,
      }
    }

    if (typeof nestedError === 'string' && nestedError) {
      return {
        code: normalizeErrorCode(body.code),
        message: sanitizeErrorMessage(nestedError),
        details: body,
      }
    }

    if (typeof body.message === 'string' && body.message) {
      return {
        code: normalizeErrorCode(body.code),
        message: sanitizeErrorMessage(body.message),
        details: body,
      }
    }
  }

  if (body && typeof body === 'object') {
    return {
      code: FALLBACK_ERROR_CODE,
      message: `请求失败 (${status})`,
      details: body,
    }
  }

  return {
    code: FALLBACK_ERROR_CODE,
    message: sanitizeErrorMessage(typeof body === 'string' && body ? body : `请求失败 (${status})`),
    details: body,
  }
}

async function httpRequest<T>(
  url: string,
  init: RequestInit = {},
  query?: object,
): Promise<T> {
  const headers = new Headers(init.headers)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData

  if (init.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(url, query), {
    ...init,
    headers,
  })
  const body = await parseResponseBody(response)

  if (!response.ok) {
    const error = extractApiError(body, response.status)
    throw new ServiceError(error.message, {
      status: response.status,
      code: error.code,
      details: error.details ?? body,
    })
  }

  return body as T
}

export function httpGet<T>(url: string, query?: object): Promise<T> {
  return httpRequest<T>(url, { method: 'GET' }, query)
}

export function httpPost<T>(url: string, body?: unknown): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  return httpRequest<T>(url, {
    method: 'POST',
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })
}

export function httpPut<T>(url: string, body?: unknown): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  return httpRequest<T>(url, {
    method: 'PUT',
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })
}

export function httpDelete<T>(url: string): Promise<T> {
  return httpRequest<T>(url, { method: 'DELETE' })
}
