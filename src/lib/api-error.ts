import { NextResponse } from 'next/server'
import type { ApiErrorResponse, AppErrorCode } from '@/types/api'

const DEFAULT_STATUS_BY_CODE: Record<AppErrorCode, number> = {
  DB_CONNECTION_FAILED: 503,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  PERMISSION_DENIED: 403,
  FILE_TOO_LARGE: 413,
  FILE_READ_FAILED: 500,
  FILE_WRITE_FAILED: 500,
  FILE_OPEN_FAILED: 500,
  DUPLICATE_NAME: 409,
  NOT_IMPLEMENTED: 501,
  DESKTOP_ONLY: 400,
  UNKNOWN_ERROR: 500,
}

export function apiError(
  code: AppErrorCode,
  message: string,
  status = DEFAULT_STATUS_BY_CODE[code],
  details?: unknown,
) {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  }

  return NextResponse.json(payload, { status })
}

export function validationError(message: string, details?: unknown) {
  return apiError('VALIDATION_ERROR', message, DEFAULT_STATUS_BY_CODE.VALIDATION_ERROR, details)
}

export function notFoundError(message: string, details?: unknown) {
  return apiError('NOT_FOUND', message, DEFAULT_STATUS_BY_CODE.NOT_FOUND, details)
}

export function unknownError(message = '操作失败，请稍后重试', details?: unknown) {
  return apiError('UNKNOWN_ERROR', message, DEFAULT_STATUS_BY_CODE.UNKNOWN_ERROR, details)
}

export function dbConnectionError(message = '数据库连接失败，请检查配置和网络', details?: unknown) {
  return apiError('DB_CONNECTION_FAILED', message, DEFAULT_STATUS_BY_CODE.DB_CONNECTION_FAILED, details)
}

export function duplicateNameError(message = '名称已存在', details?: unknown) {
  return apiError('DUPLICATE_NAME', message, DEFAULT_STATUS_BY_CODE.DUPLICATE_NAME, details)
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/postgres:\/\/[^\s]+/gi, 'postgres://***')
    .replace(/(password=)[^\s&]+/gi, '$1***')
    .replace(/(api[_-]?key=)[^\s&]+/gi, '$1***')
}

export function apiErrorFromUnknown(error: unknown, fallback = '操作失败，请稍后重试') {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : ''

  if (code === '23505') return duplicateNameError()
  if (code === '42501') return apiError('PERMISSION_DENIED', '数据库权限不足，请检查账号权限')
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
    return dbConnectionError()
  }

  if (error instanceof Error && error.message) {
    return unknownError(fallback, { message: sanitizeErrorMessage(error.message) })
  }

  return unknownError(fallback)
}
