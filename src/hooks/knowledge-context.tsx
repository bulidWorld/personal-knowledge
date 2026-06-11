'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { KnowledgeCategory, KnowledgeEntry, Tag, PaginatedResponse, KnowledgeFormData } from '@/types/knowledge'

function normalizeEntry(e: Record<string, unknown>): KnowledgeEntry {
  return {
    id: e.id as string,
    title: e.title as string,
    htmlContent: (e.html_content ?? e.htmlContent ?? e.content ?? '') as string,
    markdownContent: (e.markdown_content ?? e.markdownContent ?? '') as string,
    richtextContent: (e.richtext_content ?? e.richtextContent ?? '') as string,
    contentType: (e.content_type ?? e.contentType ?? 'html') as KnowledgeEntry['contentType'],
    categoryId: (e.category_id ?? e.categoryId) as string,
    iframeUrl: (e.iframe_url ?? e.iframeUrl ?? null) as string | null,
    imageUrl: (e.image_url ?? e.imageUrl ?? null) as string | null,
    createdAt: (e.created_at ?? e.createdAt) as string,
    updatedAt: (e.updated_at ?? e.updatedAt) as string,
    categoryName: (e.category_name ?? e.categoryName) as string | undefined,
    hotScore: Number(e.hot_score ?? e.hotScore ?? 0),
    clickCount: Number(e.click_count ?? e.clickCount ?? 0),
    icon: e.icon as string | undefined,
    borderColor: (e.border_color ?? e.borderColor) as string | undefined,
    dotColor: (e.dot_color ?? e.dotColor) as string | undefined,
    gradient: e.gradient as string | undefined,
    tags: Array.isArray(e.tags) ? (e.tags as Tag[]) : undefined,
  }
}

interface KnowledgeContextValue {
  categories: KnowledgeCategory[]
  entries: KnowledgeEntry[]
  selectedCategoryId: string | null
  selectedCategory: KnowledgeCategory | null
  selectedTagId: string | null
  searchQuery: string
  currentPage: number
  pageSize: number
  total: number
  totalPages: number
  categoryCounts: Record<string, number>
  tags: Tag[]
  status: 'idle' | 'loading' | 'success' | 'error'
  selectCategory: (id: string | null) => void
  selectTag: (id: string | null) => void
  setSearch: (q: string) => void
  goToPage: (p: number) => void
  createEntry: (form: KnowledgeFormData) => Promise<void>
  updateEntry: (id: string, form: KnowledgeFormData) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  createCategory: (data: { name: string; icon: string; description: string; borderColor: string; dotColor: string; gradient: string }) => Promise<void>
  updateCategory: (id: string, data: { name: string; icon: string; description: string; borderColor: string; dotColor: string; gradient: string }) => Promise<void>
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>
  createTag: (data: { name: string; color: string }) => Promise<void>
  updateTag: (id: string, data: { name: string; color: string }) => Promise<void>
  deleteTag: (id: string) => Promise<{ success: boolean; error?: string }>
  recordEntryClick: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null)

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  const [entriesData, setEntriesData] = useState<PaginatedResponse<KnowledgeEntry> | null>(null)
  const [categoriesData, setCategoriesData] = useState<KnowledgeCategory[]>([])
  const [tagsData, setTagsData] = useState<Tag[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const clickRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchEntries = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setStatus('loading')
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('pageSize', String(pageSize))
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId)
      if (selectedTagId) params.set('tagId', selectedTagId)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/knowledge?${params.toString()}`)
      const data = await res.json()
      setEntriesData({
        entries: data.entries.map((e: Record<string, unknown>) => normalizeEntry(e)),
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [currentPage, selectedCategoryId, selectedTagId, searchQuery])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategoriesData(data.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        icon: c.icon as string,
        borderColor: (c.border_color || c.borderColor) as string,
        dotColor: (c.dot_color || c.dotColor) as string,
        gradient: c.gradient as string,
        description: c.description as string,
        entryCount: (c.entry_count ?? 0) as number,
      })))
    } catch { /* ignore */ }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()
      setTagsData(data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        color: t.color as string,
        entryCount: (t.entry_count ?? 0) as number,
      })))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  useEffect(() => {
    return () => {
      if (clickRefreshTimerRef.current) clearTimeout(clickRefreshTimerRef.current)
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchCategories(), fetchTags()])
  }, [fetchEntries, fetchCategories, fetchTags])

  const entries = useMemo(() => entriesData?.entries ?? [], [entriesData])
  const total = useMemo(() => entriesData?.total ?? 0, [entriesData])
  const totalPages = useMemo(() => entriesData?.totalPages ?? 0, [entriesData])

  const categories = useMemo(() => categoriesData, [categoriesData])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return categories.find((c) => c.id === selectedCategoryId) ?? null
  }, [selectedCategoryId, categories])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of categories) {
      counts[cat.id] = (cat as unknown as { entryCount?: number }).entryCount ?? 0
    }
    return counts
  }, [categories])

  const selectCategory = useCallback((id: string | null) => {
    setSelectedCategoryId(id)
    setCurrentPage(1)
  }, [])

  const selectTag = useCallback((id: string | null) => {
    setSelectedTagId(id)
    setCurrentPage(1)
  }, [])

  const setSearch = useCallback((q: string) => {
    setSearchQuery(q)
    setCurrentPage(1)
  }, [])

  const goToPage = useCallback((p: number) => {
    setCurrentPage(p)
  }, [])

  const createEntry = useCallback(async (form: KnowledgeFormData) => {
    await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await refresh()
  }, [refresh])

  const updateEntry = useCallback(async (id: string, form: KnowledgeFormData) => {
    await fetch(`/api/knowledge/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await fetchEntries()
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    await refresh()
  }, [refresh])

  const createCategory = useCallback(async (data: { name: string; icon: string; description: string; borderColor: string; dotColor: string; gradient: string }) => {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await fetchCategories()
  }, [fetchCategories])

  const updateCategory = useCallback(async (id: string, data: { name: string; icon: string; description: string; borderColor: string; dotColor: string; gradient: string }) => {
    await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await fetchCategories()
  }, [fetchCategories])

  const deleteCategory = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      await fetchCategories()
      return { success: true }
    }
    return { success: false, error: data.error || '删除失败' }
  }, [fetchCategories])

  const createTag = useCallback(async (data: { name: string; color: string }) => {
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await fetchTags()
  }, [fetchTags])

  const updateTag = useCallback(async (id: string, data: { name: string; color: string }) => {
    await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await fetchTags()
  }, [fetchTags])

  const deleteTag = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      await fetchTags()
      if (selectedTagId === id) setSelectedTagId(null)
      return { success: true }
    }
    return { success: false, error: data.error || '删除失败' }
  }, [fetchTags, selectedTagId])

  const recordEntryClick = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/knowledge/${id}/click`, { method: 'POST' })
      if (!res.ok) return false
      const data = await res.json()
      if (data.counted) {
        if (clickRefreshTimerRef.current) clearTimeout(clickRefreshTimerRef.current)
        clickRefreshTimerRef.current = setTimeout(() => {
          clickRefreshTimerRef.current = null
          void fetchEntries({ silent: true })
        }, 350)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [fetchEntries])

  const tags = useMemo(() => tagsData, [tagsData])

  const value = useMemo<KnowledgeContextValue>(() => ({
    categories,
    entries,
    selectedCategoryId,
    selectedCategory,
    selectedTagId,
    searchQuery,
    currentPage,
    pageSize,
    total,
    totalPages,
    categoryCounts,
    tags,
    status,
    selectCategory,
    selectTag,
    setSearch,
    goToPage,
    createEntry,
    updateEntry,
    deleteEntry,
    createCategory,
    updateCategory,
    deleteCategory,
    createTag,
    updateTag,
    deleteTag,
    recordEntryClick,
    refresh,
  }), [
    categories, entries, selectedCategoryId, selectedCategory, selectedTagId,
    searchQuery, currentPage, total, totalPages, categoryCounts, tags, status,
    selectCategory, selectTag, setSearch, goToPage, createEntry, updateEntry, deleteEntry,
    createCategory, updateCategory, deleteCategory, createTag, updateTag, deleteTag, refresh,
    recordEntryClick,
  ])

  return (
    <KnowledgeContext.Provider value={value}>
      {children}
    </KnowledgeContext.Provider>
  )
}

export function useKnowledge(): KnowledgeContextValue {
  const ctx = useContext(KnowledgeContext)
  if (!ctx) throw new Error('useKnowledge must be used within KnowledgeProvider')
  return ctx
}
