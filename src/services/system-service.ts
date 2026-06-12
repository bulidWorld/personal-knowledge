import type { MindMapSystem } from '@/types/mindmap'
import { httpDelete, httpGet, httpPost, httpPut } from './http-client'
import { shouldUseTauriCommands } from './runtime'
import { tauriInvoke } from './tauri-client'

export interface CreateSystemPayload {
  name: string
  description?: string
  icon?: string
  borderColor?: string
  dotColor?: string
  gradient?: string
}

export interface UpdateSystemPayload {
  name: string
  description?: string
}

type RawRecord = Record<string, unknown>

function normalizeSystem(system: RawRecord): MindMapSystem {
  return {
    id: system.id as string,
    name: system.name as string,
    description: (system.description ?? '') as string,
    icon: (system.icon ?? 'Network') as string,
    borderColor: (system.border_color ?? system.borderColor ?? 'border-l-teal-500') as string,
    dotColor: (system.dot_color ?? system.dotColor ?? 'bg-teal-500') as string,
    gradient: (system.gradient ?? 'bg-gradient-to-r from-teal-400 to-teal-500') as string,
    nodeCount: Number(system.node_count ?? system.nodeCount ?? 0),
    createdAt: (system.created_at ?? system.createdAt ?? '') as string,
    updatedAt: (system.updated_at ?? system.updatedAt ?? '') as string,
  }
}

export async function listSystems(): Promise<MindMapSystem[]> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord[]>('list_systems')
    return data.map(normalizeSystem)
  }

  const data = await httpGet<RawRecord[]>('/api/systems')
  return data.map(normalizeSystem)
}

export async function createSystem(payload: CreateSystemPayload): Promise<MindMapSystem> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('create_system', { payload })
    return normalizeSystem(data)
  }

  const data = await httpPost<RawRecord>('/api/systems', payload)
  return normalizeSystem(data)
}

export async function updateSystem(id: string, payload: UpdateSystemPayload): Promise<MindMapSystem> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('update_system', { id, payload })
    return normalizeSystem(data)
  }

  const data = await httpPut<RawRecord>(`/api/systems/${id}`, payload)
  return normalizeSystem(data)
}

export async function deleteSystem(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_system', { id })
    return
  }

  await httpDelete<{ success: boolean }>(`/api/systems/${id}`)
}
