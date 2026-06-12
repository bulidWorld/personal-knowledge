export type RuntimeType = 'web' | 'desktop'

declare global {
  interface Window {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (
    '__TAURI_INTERNALS__' in window || '__TAURI__' in window
  )
}

export function isTauriDevUrl(): boolean {
  return typeof window !== 'undefined'
    && /^https?:$/.test(window.location.protocol)
    && window.location.hostname === 'localhost'
}

export function shouldUseTauriCommands(): boolean {
  return isTauriRuntime() && !isTauriDevUrl()
}

export function getRuntimeType(): RuntimeType {
  return isTauriRuntime() ? 'desktop' : 'web'
}
