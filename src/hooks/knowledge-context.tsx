'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { KnowledgeCategory, KnowledgeEntry, Tag, PaginatedResponse, KnowledgeFormData, KnowledgeQuery } from '@/types/knowledge'
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  recordKnowledgeClick,
  updateKnowledge,
} from '@/services/knowledge-service'
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  listCategories,
  updateCategory as updateCategoryService,
} from '@/services/category-service'
import {
  createTag as createTagService,
  deleteTag as deleteTagService,
  listTags,
  updateTag as updateTagService,
} from '@/services/tag-service'
import { getErrorMessage } from '@/services/http-client'

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
      const query: KnowledgeQuery = {
        page: currentPage,
        pageSize,
        categoryId: selectedCategoryId || undefined,
        tagId: selectedTagId || undefined,
        search: searchQuery.trim() || undefined,
      }

      const data = await listKnowledge(query)
      setEntriesData(data)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [currentPage, selectedCategoryId, selectedTagId, searchQuery])

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesData(await listCategories())
    } catch { /* ignore */ }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      setTagsData(await listTags())
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
    await createKnowledge(form)
    await refresh()
  }, [refresh])

  const updateEntry = useCallback(async (id: string, form: KnowledgeFormData) => {
    await updateKnowledge(id, form)
    await fetchEntries()
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    await deleteKnowledge(id)
    await refresh()
  }, [refresh])

  const createCategory = useCallback(async (data: { name: string; icon: string; description: string; borderColor: string; dotColor: string; gradient: string }) => {
    await createCategoryService(data)
    await fetchCategories()
  }, [fetchCategories])

  const updateCategory = useCallback(async (id: string, data: { name: string; icon: string; description: string; borderColor: string; dotColor: string; gradient: string }) => {
    await updateCategoryService(id, data)
    await fetchCategories()
  }, [fetchCategories])

  const deleteCategory = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteCategoryService(id)
      await fetchCategories()
      return { success: true }
    } catch (error) {
      return { success: false, error: getErrorMessage(error, '删除失败') }
    }
  }, [fetchCategories])

  const createTag = useCallback(async (data: { name: string; color: string }) => {
    await createTagService(data)
    await fetchTags()
  }, [fetchTags])

  const updateTag = useCallback(async (id: string, data: { name: string; color: string }) => {
    await updateTagService(id, data)
    await fetchTags()
  }, [fetchTags])

  const deleteTag = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteTagService(id)
      await fetchTags()
      if (selectedTagId === id) setSelectedTagId(null)
      return { success: true }
    } catch (error) {
      return { success: false, error: getErrorMessage(error, '删除失败') }
    }
  }, [fetchTags, selectedTagId])

  const recordEntryClick = useCallback(async (id: string): Promise<boolean> => {
    try {
      const data = await recordKnowledgeClick(id)
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
