export const APP_ERROR_CODES = [
  'DB_CONNECTION_FAILED',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'PERMISSION_DENIED',
  'FILE_TOO_LARGE',
  'FILE_READ_FAILED',
  'FILE_WRITE_FAILED',
  'FILE_OPEN_FAILED',
  'DUPLICATE_NAME',
  'NOT_IMPLEMENTED',
  'DESKTOP_ONLY',
  'UNKNOWN_ERROR',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export interface AppErrorPayload {
  code: AppErrorCode
  message: string
  details?: unknown
}

export interface ApiErrorResponse {
  error: AppErrorPayload
}
