import type { KnowledgeCategory, KnowledgeEntry, PaginatedResponse, KnowledgeFormData } from '~/types/knowledge'

function normalizeEntry(e: any): KnowledgeEntry {
  return {
    id: e.id,
    title: e.title,
    htmlContent: e.html_content ?? e.htmlContent ?? e.content ?? '',
    markdownContent: e.markdown_content ?? e.markdownContent ?? '',
    richtextContent: e.richtext_content ?? e.richtextContent ?? '',
    contentType: e.content_type ?? e.contentType ?? 'html',
    categoryId: e.category_id ?? e.categoryId,
    iframeUrl: e.iframe_url ?? e.iframeUrl ?? null,
    imageUrl: e.image_url ?? e.imageUrl ?? null,
    createdAt: e.created_at ?? e.createdAt,
    updatedAt: e.updated_at ?? e.updatedAt,
    categoryName: e.category_name ?? e.categoryName,
    icon: e.icon,
    borderColor: e.border_color ?? e.borderColor,
    dotColor: e.dot_color ?? e.dotColor,
    gradient: e.gradient,
  }
}

export function useKnowledge() {
  const selectedCategoryId = ref<string | null>(null)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const pageSize = 9

  const { data, refresh, status } = useAsyncData(
    'knowledge-list',
    () => {
      const params: Record<string, string | number> = {
        page: currentPage.value,
        pageSize,
      }
      if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value
      if (searchQuery.value.trim()) params.search = searchQuery.value.trim()

      const queryStr = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&')

      return $fetch<PaginatedResponse<KnowledgeEntry>>(`/api/knowledge?${queryStr}`)
    },
    { watch: [selectedCategoryId, searchQuery, currentPage] }
  )

  const { data: categoriesData, refresh: refreshCategories } = useAsyncData(
    'categories',
    () => $fetch<any[]>('/api/categories'),
    { default: () => [] }
  )

  const entries = computed<KnowledgeEntry[]>(() =>
    (data.value?.entries ?? []).map((e: any) => normalizeEntry(e))
  )
  const total = computed(() => data.value?.total ?? 0)
  const totalPages = computed(() => data.value?.totalPages ?? 0)

  const categories = computed<KnowledgeCategory[]>(() =>
    (categoriesData.value ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      borderColor: c.border_color || c.borderColor,
      dotColor: c.dot_color || c.dotColor,
      gradient: c.gradient,
      description: c.description,
      entryCount: c.entry_count ?? 0,
    }))
  )

  const selectedCategory = computed<KnowledgeCategory | null>(() => {
    if (!selectedCategoryId.value) return null
    return categories.value.find((c) => c.id === selectedCategoryId.value) ?? null
  })

  const categoryCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const cat of categories.value) {
      counts[cat.id] = (cat as any).entryCount ?? 0
    }
    return counts
  })

  function selectCategory(id: string | null) {
    selectedCategoryId.value = id
    currentPage.value = 1
  }

  function setSearch(q: string) {
    searchQuery.value = q
    currentPage.value = 1
  }

  function goToPage(p: number) {
    currentPage.value = p
  }

  async function createEntry(form: KnowledgeFormData) {
    await $fetch('/api/knowledge', { method: 'POST', body: form })
    await refreshCategories()
    await refresh()
  }

  async function updateEntry(id: string, form: KnowledgeFormData) {
    await $fetch(`/api/knowledge/${id}`, { method: 'PUT', body: form })
    await refresh()
  }

  async function deleteEntry(id: string) {
    await $fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    await refreshCategories()
    await refresh()
  }

  return {
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
  }
}
