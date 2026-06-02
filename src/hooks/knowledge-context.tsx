'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { KnowledgeCategory, KnowledgeEntry, PaginatedResponse, KnowledgeFormData } from '@/types/knowledge'

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
    icon: e.icon as string | undefined,
    borderColor: (e.border_color ?? e.borderColor) as string | undefined,
    dotColor: (e.dot_color ?? e.dotColor) as string | undefined,
    gradient: e.gradient as string | undefined,
  }
}

interface KnowledgeContextValue {
  categories: KnowledgeCategory[]
  entries: KnowledgeEntry[]
  selectedCategoryId: string | null
  selectedCategory: KnowledgeCategory | null
  searchQuery: string
  currentPage: number
  pageSize: number
  total: number
  totalPages: number
  categoryCounts: Record<string, number>
  status: 'idle' | 'loading' | 'success' | 'error'
  selectCategory: (id: string | null) => void
  setSearch: (q: string) => void
  goToPage: (p: number) => void
  createEntry: (form: KnowledgeFormData) => Promise<void>
  updateEntry: (id: string, form: KnowledgeFormData) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null)

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  const [entriesData, setEntriesData] = useState<PaginatedResponse<KnowledgeEntry> | null>(null)
  const [categoriesData, setCategoriesData] = useState<KnowledgeCategory[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const fetchEntries = useCallback(async () => {
    setStatus('loading')
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('pageSize', String(pageSize))
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId)
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
  }, [currentPage, selectedCategoryId, searchQuery])

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

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const refresh = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchCategories()])
  }, [fetchEntries, fetchCategories])

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

  const value = useMemo<KnowledgeContextValue>(() => ({
    categories,
    entries,
    selectedCategoryId,
    selectedCategory,
    searchQuery,
    currentPage,
    pageSize,
    total,
    totalPages,
    categoryCounts,
    status,
    selectCategory,
    setSearch,
    goToPage,
    createEntry,
    updateEntry,
    deleteEntry,
    refresh,
  }), [
    categories, entries, selectedCategoryId, selectedCategory, searchQuery,
    currentPage, total, totalPages, categoryCounts, status,
    selectCategory, setSearch, goToPage, createEntry, updateEntry, deleteEntry, refresh,
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
