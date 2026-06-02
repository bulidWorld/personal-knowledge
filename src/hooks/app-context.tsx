'use client'

import { createContext, useContext } from 'react'
import type { KnowledgeEntry, ContentType } from '@/types/knowledge'
import type { MindMapNode, MindMapSystem } from '@/types/mindmap'

interface EditingMindMapNode {
  id: string
  title: string
  htmlContent: string
  markdownContent: string
  richtextContent: string
  contentType: ContentType
}

interface AppContextValue {
  // Knowledge UI actions
  onEdit: (entry: KnowledgeEntry) => void
  onDelete: (entry: KnowledgeEntry) => void
  openCreateForm: () => void

  // MindMap canvas actions
  handleNodeMove: (id: string, x: number, y: number) => void
  handleAddNode: (type: string, x: number, y: number, parentId: string | null) => void
  handleDeleteNode: (id: string) => void
  handleMindMapNodeDblClick: (node: MindMapNode) => void

  // System actions
  onSystemEdit: (system: MindMapSystem) => void
  onSystemDelete: (system: MindMapSystem) => void

  // Node detail update
  handleUpdateMindMapNode: (id: string, updates: Record<string, unknown>) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children, value }: { children: React.ReactNode; value: AppContextValue }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export type { AppContextValue, EditingMindMapNode }
