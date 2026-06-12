import type { KnowledgeCategory } from '@/types/knowledge'
import { httpDelete, httpGet, httpPost, httpPut } from './http-client'
import { shouldUseTauriCommands } from './runtime'
import { tauriInvoke } from './tauri-client'

export interface CategoryPayload {
  name: string
  icon: string
  description: string
  borderColor: string
  dotColor: string
  gradient: string
}

type RawRecord = Record<string, unknown>

function normalizeCategory(category: RawRecord): KnowledgeCategory {
  return {
    id: category.id as string,
    name: category.name as string,
    icon: (category.icon ?? 'LayoutGrid') as string,
    borderColor: (category.border_color ?? category.borderColor ?? '') as string,
    dotColor: (category.dot_color ?? category.dotColor ?? '') as string,
    gradient: (category.gradient ?? '') as string,
    description: (category.description ?? '') as string,
    entryCount: Number(category.entry_count ?? category.entryCount ?? 0),
  }
}

export async function listCategories(): Promise<KnowledgeCategory[]> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord[]>('list_categories')
    return data.map(normalizeCategory)
  }

  const data = await httpGet<RawRecord[]>('/api/categories')
  return data.map(normalizeCategory)
}

export async function createCategory(payload: CategoryPayload): Promise<KnowledgeCategory> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('create_category', { payload })
    return normalizeCategory(data)
  }

  const data = await httpPost<RawRecord>('/api/categories', payload)
  return normalizeCategory(data)
}

export async function updateCategory(id: string, payload: CategoryPayload): Promise<KnowledgeCategory> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('update_category', { id, payload })
    return normalizeCategory(data)
  }

  const data = await httpPut<RawRecord>(`/api/categories/${id}`, payload)
  return normalizeCategory(data)
}

export async function deleteCategory(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_category', { id })
    return
  }

  await httpDelete<{ success: boolean }>(`/api/categories/${id}`)
}
