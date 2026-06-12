import { ServiceError } from './http-client'
import { getRuntimeType, isTauriRuntime, type RuntimeType } from './runtime'
import { tauriInvoke } from './tauri-client'

export interface RuntimeInfo {
  runtime: RuntimeType
}

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password?: string
  sslMode?: string
}

export interface DatabaseConfigStatus {
  configured: boolean
  host?: string
  port?: number
  database?: string
  username?: string
  sslMode?: string
}

export interface DatabaseConnectionResult {
  success: boolean
  message?: string
}

export interface DesktopPreferences {
  minimizeToTray: boolean
  recentKnowledgeIds: string[]
}

export interface DesktopRuntimeStatus {
  databaseConfigured: boolean
  databaseConnected: boolean
  aiConfigured: boolean
  minimizeToTray: boolean
  recentKnowledgeIds: string[]
}

export function canUseDesktopSettings(): boolean {
  return isTauriRuntime()
}

function desktopOnly(command: string): never {
  throw new ServiceError(`该设置能力仅 Desktop 支持: ${command}`, {
    code: 'DESKTOP_ONLY',
  })
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  return { runtime: getRuntimeType() }
}

export async function testDatabaseConnection(config: DatabaseConfig): Promise<DatabaseConnectionResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<DatabaseConnectionResult>('test_database_connection', { config })
  }

  desktopOnly('test_database_connection')
}

export async function saveDatabaseConfig(config: DatabaseConfig): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>('save_database_config', { config })
    return
  }

  desktopOnly('save_database_config')
}

export async function getDatabaseConfigStatus(): Promise<DatabaseConfigStatus> {
  if (isTauriRuntime()) {
    return tauriInvoke<DatabaseConfigStatus>('get_database_config_status')
  }

  desktopOnly('get_database_config_status')
}

export async function getDesktopPreferences(): Promise<DesktopPreferences> {
  if (isTauriRuntime()) {
    return tauriInvoke<DesktopPreferences>('get_desktop_preferences')
  }

  desktopOnly('get_desktop_preferences')
}

export async function saveDesktopPreferences(preferences: DesktopPreferences): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>('save_desktop_preferences', { preferences })
    return
  }

  desktopOnly('save_desktop_preferences')
}

export async function recordRecentKnowledge(id: string): Promise<DesktopPreferences> {
  if (isTauriRuntime()) {
    return tauriInvoke<DesktopPreferences>('record_recent_knowledge', { id })
  }

  desktopOnly('record_recent_knowledge')
}

export async function getDesktopRuntimeStatus(): Promise<DesktopRuntimeStatus> {
  if (isTauriRuntime()) {
    return tauriInvoke<DesktopRuntimeStatus>('get_desktop_runtime_status')
  }

  desktopOnly('get_desktop_runtime_status')
}

export async function cleanupTempFiles(): Promise<number> {
  if (isTauriRuntime()) {
    return tauriInvoke<number>('cleanup_temp_files')
  }

  desktopOnly('cleanup_temp_files')
}
