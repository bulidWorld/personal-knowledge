import type { KnowledgeEntry, KnowledgeFormData, KnowledgeQuery, PaginatedResponse, Tag } from '@/types/knowledge'
import { httpDelete, httpGet, httpPost, httpPut, ServiceError } from './http-client'
import { shouldUseTauriCommands } from './runtime'
import { tauriInvoke } from './tauri-client'
import { resolveFileUrl } from '@/lib/file-url'

export interface KnowledgeClickResult {
  success: boolean
  counted: boolean
}

type RawRecord = Record<string, unknown>

function normalizeTag(tag: RawRecord): Tag {
  return {
    id: tag.id as string,
    name: tag.name as string,
    color: tag.color as string,
    entryCount: Number(tag.entry_count ?? tag.entryCount ?? 0),
  }
}

export function normalizeKnowledgeEntry(entry: RawRecord): KnowledgeEntry {
  const imageUrl = (entry.image_url ?? entry.imageUrl ?? null) as string | null

  return {
    id: entry.id as string,
    title: entry.title as string,
    htmlContent: (entry.html_content ?? entry.htmlContent ?? entry.content ?? '') as string,
    markdownContent: (entry.markdown_content ?? entry.markdownContent ?? '') as string,
    richtextContent: (entry.richtext_content ?? entry.richtextContent ?? '') as string,
    contentType: (entry.content_type ?? entry.contentType ?? 'html') as KnowledgeEntry['contentType'],
    categoryId: (entry.category_id ?? entry.categoryId) as string,
    iframeUrl: (entry.iframe_url ?? entry.iframeUrl ?? null) as string | null,
    imageUrl: imageUrl ? resolveFileUrl(imageUrl) : null,
    createdAt: (entry.created_at ?? entry.createdAt ?? '') as string,
    updatedAt: (entry.updated_at ?? entry.updatedAt ?? '') as string,
    categoryName: (entry.category_name ?? entry.categoryName) as string | undefined,
    hotScore: Number(entry.hot_score ?? entry.hotScore ?? 0),
    clickCount: Number(entry.click_count ?? entry.clickCount ?? 0),
    isFavorite: Boolean(entry.is_favorite ?? entry.isFavorite ?? false),
    isPinned: Boolean(entry.is_pinned ?? entry.isPinned ?? false),
    icon: entry.icon as string | undefined,
    borderColor: (entry.border_color ?? entry.borderColor) as string | undefined,
    dotColor: (entry.dot_color ?? entry.dotColor) as string | undefined,
    gradient: entry.gradient as string | undefined,
    tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => normalizeTag(tag as RawRecord)) : [],
  }
}

function normalizeKnowledgePage(data: RawRecord): PaginatedResponse<KnowledgeEntry> {
  const entries = Array.isArray(data.entries) ? data.entries : []
  return {
    entries: entries.map((entry) => normalizeKnowledgeEntry(entry as RawRecord)),
    total: Number(data.total ?? 0),
    page: Number(data.page ?? 1),
    pageSize: Number(data.pageSize ?? data.page_size ?? entries.length),
    totalPages: Number(data.totalPages ?? data.total_pages ?? 0),
  }
}

export async function listKnowledge(query: KnowledgeQuery = {}): Promise<PaginatedResponse<KnowledgeEntry>> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('list_knowledge', { query })
    return normalizeKnowledgePage(data)
  }

  const data = await httpGet<RawRecord>('/api/knowledge', query)
  return normalizeKnowledgePage(data)
}

export async function searchKnowledge(query: KnowledgeQuery = {}): Promise<PaginatedResponse<KnowledgeEntry>> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('search_knowledge', { query })
    return normalizeKnowledgePage(data)
  }

  const data = await httpGet<RawRecord>('/api/knowledge', query)
  return normalizeKnowledgePage(data)
}

export async function getKnowledgeDetail(id: string): Promise<KnowledgeEntry> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('get_knowledge_detail', { id })
    return normalizeKnowledgeEntry(data)
  }

  const data = await httpGet<RawRecord>(`/api/knowledge/${id}`)
  return normalizeKnowledgeEntry(data)
}

export async function createKnowledge(payload: KnowledgeFormData): Promise<KnowledgeEntry> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('create_knowledge', { payload })
    return normalizeKnowledgeEntry(data)
  }

  const data = await httpPost<RawRecord>('/api/knowledge', payload)
  return normalizeKnowledgeEntry(data)
}

export async function updateKnowledge(id: string, payload: KnowledgeFormData): Promise<KnowledgeEntry> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('update_knowledge', { id, payload })
    return normalizeKnowledgeEntry(data)
  }

  const data = await httpPut<RawRecord>(`/api/knowledge/${id}`, payload)
  return normalizeKnowledgeEntry(data)
}

export async function deleteKnowledge(id: string): Promise<void> {
  if (shouldUseTauriCommands()) {
    await tauriInvoke<void>('delete_knowledge', { id })
    return
  }

  await httpDelete<{ success: boolean }>(`/api/knowledge/${id}`)
}

export async function recordKnowledgeClick(id: string): Promise<KnowledgeClickResult> {
  if (shouldUseTauriCommands()) {
    return tauriInvoke<KnowledgeClickResult>('record_knowledge_click', { id })
  }

  return httpPost<KnowledgeClickResult>(`/api/knowledge/${id}/click`)
}

export async function favoriteKnowledge(id: string, value: boolean): Promise<KnowledgeEntry> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('favorite_knowledge', { id, value })
    return normalizeKnowledgeEntry(data)
  }

  throw new ServiceError('Web API 暂未实现知识收藏能力', { code: 'NOT_IMPLEMENTED' })
}

export async function pinKnowledge(id: string, value: boolean): Promise<KnowledgeEntry> {
  if (shouldUseTauriCommands()) {
    const data = await tauriInvoke<RawRecord>('pin_knowledge', { id, value })
    return normalizeKnowledgeEntry(data)
  }

  throw new ServiceError('Web API 暂未实现知识置顶能力', { code: 'NOT_IMPLEMENTED' })
}
