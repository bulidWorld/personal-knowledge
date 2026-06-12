import { isTauriRuntime } from './runtime'

type Unlisten = () => void

export interface DesktopEventHandlers {
  onQuickSearch?: () => void
  onNewKnowledge?: () => void
  onClipboardSave?: () => void
  onOpenSettings?: () => void
  onDatabaseOffline?: (message?: string) => void
}

export async function listenDesktopEvents(handlers: DesktopEventHandlers): Promise<Unlisten> {
  if (!isTauriRuntime()) return () => {}

  const { listen } = await import('@tauri-apps/api/event')
  const unlisteners = await Promise.all([
    listen('desktop:quick-search', () => handlers.onQuickSearch?.()),
    listen('desktop:new-knowledge', () => handlers.onNewKnowledge?.()),
    listen('desktop:clipboard-save', () => handlers.onClipboardSave?.()),
    listen('desktop:open-settings', () => handlers.onOpenSettings?.()),
    listen<string>('desktop:db-offline', (event) => handlers.onDatabaseOffline?.(event.payload)),
  ])

  return () => {
    for (const unlisten of unlisteners) unlisten()
  }
}
