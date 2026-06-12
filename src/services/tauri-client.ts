import { isTauriRuntime } from './runtime'
import {
  ServiceError,
  isServiceError,
  sanitizeErrorMessage,
  normalizeErrorCode,
} from './http-client'

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

let invokePromise: Promise<TauriInvoke> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeTauriError(command: string, error: unknown): ServiceError {
  if (isRecord(error)) {
    const message = typeof error.message === 'string' && error.message
      ? error.message
      : `Desktop command 调用失败: ${command}`

    return new ServiceError(message, {
      code: normalizeErrorCode(error.code),
      details: error.details,
    })
  }

  if (error instanceof Error && error.message) {
    return new ServiceError(sanitizeErrorMessage(error.message), {
      code: 'UNKNOWN_ERROR',
      details: error,
    })
  }

  if (typeof error === 'string' && error) {
    return new ServiceError(sanitizeErrorMessage(error), {
      code: 'UNKNOWN_ERROR',
    })
  }

  return new ServiceError(`Desktop command 调用失败: ${command}`, {
    code: 'UNKNOWN_ERROR',
    details: error,
  })
}

async function loadInvoke(): Promise<TauriInvoke> {
  if (!invokePromise) {
    invokePromise = (async () => {
      const mod = await import('@tauri-apps/api/core')

      if (typeof mod.invoke !== 'function') {
        throw new ServiceError('Tauri invoke API 不可用', {
          code: 'TAURI_INVOKE_UNAVAILABLE',
        })
      }

      return mod.invoke
    })().catch((error) => {
      invokePromise = null
      throw error
    })
  }

  return invokePromise
}

export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new ServiceError(`Desktop command 只能在 Tauri 运行时调用: ${command}`, {
      code: 'NOT_DESKTOP_RUNTIME',
    })
  }

  try {
    const invoke = await loadInvoke()
    return await invoke<T>(command, args)
  } catch (error) {
    if (isServiceError(error)) throw error
    throw normalizeTauriError(command, error)
  }
}
