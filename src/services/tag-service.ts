import type { Tag } from '@/types/knowledge'
import { httpDelete, httpGet, httpPost, httpPut } from './http-client'
import { shouldUseTauriCommands } from './runtime'
import { tauriInvoke } from './tauri-client'

export interface TagPayload {
  name: string
  color: string
}

type RawRecord = Record<string, unknown>

function normalizeTag(tag: RawRecord): Tag {
  return {
    id: tag.id as string,
    name: tag.name as string,
    color: (tag.color ?? '#6366f1') as string,
    entryCount: Number(tag.entry_count ?? tag.entryCount ?? 0),
  }
}

export async function listTags(): Promise<Tag[]> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord[]>('list_tags')
    return data.map(normalizeTag)
  }

  const data = await httpGet<RawRecord[]>('/api/tags')
  return data.map(normalizeTag)
}

export async function createTag(payload: TagPayload): Promise<Tag> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('create_tag', { payload })
    return normalizeTag(data)
  }

  const data = await httpPost<RawRecord>('/api/tags', payload)
  return normalizeTag(data)
}

export async function updateTag(id: string, payload: TagPayload): Promise<Tag> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('update_tag', { id, payload })
    return normalizeTag(data)
  }

  const data = await httpPut<RawRecord>(`/api/tags/${id}`, payload)
  return normalizeTag(data)
}

export async function deleteTag(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_tag', { id })
    return
  }

  await httpDelete<{ success: boolean }>(`/api/tags/${id}`)
}
