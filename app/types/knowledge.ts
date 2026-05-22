export type ContentType = 'html' | 'markdown' | 'richtext'

export interface KnowledgeEntry {
  id: string
  title: string
  htmlContent: string
  markdownContent: string
  richtextContent: string
  contentType: ContentType
  categoryId: string
  iframeUrl?: string | null
  imageUrl?: string | null
  createdAt: string
  updatedAt: string
  categoryName?: string
  icon?: string
  borderColor?: string
  dotColor?: string
  gradient?: string
}

export interface KnowledgeCategory {
  id: string
  name: string
  icon: string
  borderColor: string
  dotColor: string
  gradient: string
  description: string
}

export interface PaginatedResponse<T> {
  entries: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface KnowledgeFormData {
  id?: string
  title: string
  htmlContent: string
  markdownContent: string
  richtextContent: string
  contentType: ContentType
  categoryId: string
  iframeUrl?: string
  imageUrl?: string
}

export interface KnowledgeQuery {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
}
