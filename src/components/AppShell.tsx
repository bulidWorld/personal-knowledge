'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { KnowledgeEntry, KnowledgeFormData, ContentType } from '@/types/knowledge'
import type { MindMapNode, MindMapSystem } from '@/types/mindmap'
import { KnowledgeProvider, useKnowledge } from '@/hooks/knowledge-context'
import { MindMapProvider, useMindMap } from '@/hooks/mindmap-context'
import { AppProvider, useApp } from '@/hooks/app-context'
import type { AppContextValue, EditingMindMapNode } from '@/hooks/app-context'
import AppSidebar from './AppSidebar'
import KnowledgeForm from './KnowledgeForm'
import Modal from './Modal'
import { handleMarkdownImagePaste } from '@/lib/paste-image'

const contentModes = [
  { key: 'richtext' as ContentType, label: '富文本' },
  { key: 'html' as ContentType, label: 'HTML' },
  { key: 'markdown' as ContentType, label: 'Markdown' },
]

function AppShellInner({ children }: { children: React.ReactNode }) {
  const knowledge = useKnowledge()
  const mindmap = useMindMap()

  // --- Knowledge entry form state ---
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeFormData | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<KnowledgeEntry | null>(null)

  // --- System state ---
  const [showSystemCreate, setShowSystemCreate] = useState(false)
  const [newSystemName, setNewSystemName] = useState('')
  const [editingSystem, setEditingSystem] = useState<MindMapSystem | null>(null)
  const [deletingSystem, setDeletingSystem] = useState<MindMapSystem | null>(null)
  const [renameSystemName, setRenameSystemName] = useState('')

  // --- MindMap node edit ---
  const [editingMindMapNode, setEditingMindMapNode] = useState<EditingMindMapNode | null>(null)
  const nodeModalMdRef = useRef<HTMLTextAreaElement | null>(null)

  // --- Sidebar selection ---
  const selectedSystemId = mindmap.selectedSystemId
  const setSelectedSystemId = mindmap.setSelectedSystemId

  // --- Knowledge form handlers ---
  const handleFormSubmit = useCallback(async (data: KnowledgeFormData) => {
    if (data.id) {
      await knowledge.updateEntry(data.id, data)
    } else {
      await knowledge.createEntry(data)
    }
    setShowCreateForm(false)
    setEditingEntry(null)
  }, [knowledge])

  const closeForm = useCallback(() => {
    setShowCreateForm(false)
    setEditingEntry(null)
  }, [])

  const handleEdit = useCallback((entry: KnowledgeEntry) => {
    setEditingEntry({
      id: entry.id,
      title: entry.title,
      htmlContent: entry.htmlContent || '',
      markdownContent: entry.markdownContent || '',
      richtextContent: entry.richtextContent || '',
      contentType: entry.contentType,
      categoryId: entry.categoryId,
      iframeUrl: entry.iframeUrl || '',
      imageUrl: entry.imageUrl || '',
    })
    setShowCreateForm(true)
  }, [])

  const handleDelete = useCallback((entry: KnowledgeEntry) => {
    setDeletingEntry(entry)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deletingEntry) return
    await knowledge.deleteEntry(deletingEntry.id)
    setDeletingEntry(null)
  }, [deletingEntry, knowledge])

  const openCreateForm = useCallback(() => {
    setEditingEntry(null)
    setShowCreateForm(true)
  }, [])

  // --- System handlers ---
  const onCreateSystem = useCallback(() => {
    setShowSystemCreate(true)
    setNewSystemName('')
  }, [])

  const doCreateSystem = useCallback(async () => {
    if (!newSystemName.trim()) return
    const s = await mindmap.createSystem(newSystemName.trim())
    setShowSystemCreate(false)
    knowledge.selectCategory(null)
    setSelectedSystemId(s.id)
  }, [newSystemName, mindmap, knowledge, setSelectedSystemId])

  const handleSystemEdit = useCallback((system: MindMapSystem) => {
    setEditingSystem(system)
    setRenameSystemName(system.name)
  }, [])

  const doRenameSystem = useCallback(async () => {
    if (!editingSystem || !renameSystemName.trim()) return
    await fetch(`/api/systems/${editingSystem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameSystemName.trim() }),
    })
    await mindmap.fetchSystems()
    setEditingSystem(null)
  }, [editingSystem, renameSystemName, mindmap])

  const handleSystemDelete = useCallback((system: MindMapSystem) => {
    setDeletingSystem(system)
  }, [])

  const confirmDeleteSystem = useCallback(async () => {
    if (!deletingSystem) return
    await mindmap.deleteSystem(deletingSystem.id)
    if (selectedSystemId === deletingSystem.id) {
      setSelectedSystemId(null)
    }
    setDeletingSystem(null)
  }, [deletingSystem, mindmap, selectedSystemId, setSelectedSystemId])

  // --- MindMap node edit ---
  const handleMindMapNodeDblClick = useCallback((node: MindMapNode) => {
    setEditingMindMapNode({
      id: node.id,
      title: node.title,
      htmlContent: node.htmlContent || '',
      markdownContent: node.markdownContent || '',
      richtextContent: node.richtextContent || '',
      contentType: node.contentType || 'html',
    })
  }, [])

  const saveMindMapNode = useCallback(async () => {
    if (!editingMindMapNode) return
    const n = editingMindMapNode
    await mindmap.updateNode(n.id, {
      title: n.title,
      htmlContent: n.htmlContent,
      markdownContent: n.markdownContent,
      richtextContent: n.richtextContent,
      contentType: n.contentType,
    } as Partial<MindMapNode>)
    if (selectedSystemId) await mindmap.fetchNodes(selectedSystemId)
    setEditingMindMapNode(null)
  }, [editingMindMapNode, mindmap, selectedSystemId])

  const onNodeModalMarkdownPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (nodeModalMdRef.current) {
      handleMarkdownImagePaste(e, nodeModalMdRef.current, (newValue) => {
        setEditingMindMapNode((prev) => prev ? { ...prev, markdownContent: newValue } : null)
      })
    }
  }, [])

  const closeMindMapNodeEdit = useCallback(() => {
    setEditingMindMapNode(null)
  }, [])

  // --- Canvas interactions ---
  const handleNodeMove = useCallback(async (id: string, x: number, y: number) => {
    await mindmap.updateNode(id, { x, y } as Partial<MindMapNode>)
  }, [mindmap])

  const handleAddNode = useCallback(async (type: string, x: number, y: number, parentId: string | null) => {
    if (!selectedSystemId) return
    const typeNames: Record<string, string> = { topic: '新主题', concept: '新概念', operation: '新操作', article: '新文章' }
    const colors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6', article: '#8b5cf6' }
    const newNode = await mindmap.createNode({
      systemId: selectedSystemId,
      title: typeNames[type] || '新节点',
      nodeType: type,
      parentId,
      x,
      y,
      color: colors[type] || '',
    })

    if (parentId) {
      await mindmap.createConnection(selectedSystemId, parentId, newNode.id)
    }
  }, [selectedSystemId, mindmap])

  const handleDeleteNode = useCallback(async (id: string) => {
    await mindmap.deleteNode(id)
  }, [mindmap])

  const handleUpdateMindMapNode = useCallback(async (id: string, updates: Record<string, unknown>) => {
    await mindmap.updateNode(id, updates as Partial<MindMapNode>)
    if (selectedSystemId) await mindmap.fetchNodes(selectedSystemId)
  }, [mindmap, selectedSystemId])

  // --- Sidebar selection ---
  const onSelectCategory = useCallback((id: string | null) => {
    knowledge.selectCategory(id)
    setSelectedSystemId(null)
  }, [knowledge, setSelectedSystemId])

  const onSelectSystem = useCallback((id: string | null) => {
    knowledge.selectCategory(null)
    setSelectedSystemId(id)
  }, [knowledge, setSelectedSystemId])

  // --- Fetch systems on mount ---
  useEffect(() => {
    mindmap.fetchSystems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Fetch nodes when system selected ---
  useEffect(() => {
    if (selectedSystemId && selectedSystemId !== '__all__') {
      mindmap.fetchNodes(selectedSystemId)
      mindmap.fetchConnections(selectedSystemId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSystemId])

  // Build app context value
  const appValue = useMemo<AppContextValue>(() => ({
    onEdit: handleEdit,
    onDelete: handleDelete,
    openCreateForm,
    handleNodeMove,
    handleAddNode,
    handleDeleteNode,
    handleMindMapNodeDblClick,
    onSystemEdit: handleSystemEdit,
    onSystemDelete: handleSystemDelete,
    handleUpdateMindMapNode,
  }), [
    handleEdit, handleDelete, openCreateForm,
    handleNodeMove, handleAddNode, handleDeleteNode,
    handleMindMapNodeDblClick, handleSystemEdit, handleSystemDelete,
    handleUpdateMindMapNode,
  ])

  return (
    <AppProvider value={appValue}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AppSidebar
          categories={knowledge.categories}
          selectedCategoryId={knowledge.selectedCategoryId}
          selectedSystemId={selectedSystemId}
          totalCount={knowledge.total}
          categoryCounts={knowledge.categoryCounts}
          systems={mindmap.systems}
          onSelectCategory={onSelectCategory}
          onSelectSystem={onSelectSystem}
          onCreateSystem={onCreateSystem}
          onCreate={openCreateForm}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 md:px-8 md:py-10">
            {children}
          </div>
        </main>

        {/* Knowledge form modal */}
        <KnowledgeForm
          open={showCreateForm}
          entry={editingEntry}
          categories={knowledge.categories}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />

        {/* MindMap node edit modal */}
        <Modal open={!!editingMindMapNode} title="编辑节点" onClose={closeMindMapNodeEdit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
              <input
                type="text"
                value={editingMindMapNode?.title ?? ''}
                onChange={(e) => setEditingMindMapNode((prev) => prev ? { ...prev, title: e.target.value } : null)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">内容</label>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {contentModes.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        editingMindMapNode?.contentType === mode.key
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      onClick={() => setEditingMindMapNode((prev) => prev ? { ...prev, contentType: mode.key } : null)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              {editingMindMapNode?.contentType === 'html' && (
                <textarea
                  value={editingMindMapNode.htmlContent}
                  onChange={(e) => setEditingMindMapNode((prev) => prev ? { ...prev, htmlContent: e.target.value } : null)}
                  rows={8}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                  placeholder="HTML 内容..."
                />
              )}
              {editingMindMapNode?.contentType === 'markdown' && (
                <textarea
                  ref={nodeModalMdRef}
                  value={editingMindMapNode.markdownContent}
                  onChange={(e) => setEditingMindMapNode((prev) => prev ? { ...prev, markdownContent: e.target.value } : null)}
                  onPaste={onNodeModalMarkdownPaste}
                  rows={8}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                  placeholder="Markdown 内容..."
                />
              )}
              {editingMindMapNode?.contentType === 'richtext' && (
                <textarea
                  value={editingMindMapNode.richtextContent}
                  onChange={(e) => setEditingMindMapNode((prev) => prev ? { ...prev, richtextContent: e.target.value } : null)}
                  rows={8}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                  placeholder="富文本内容..."
                />
              )}
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={closeMindMapNodeEdit}
              >取消</button>
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm shadow-teal-200"
                onClick={saveMindMapNode}
              >保存</button>
            </div>
          </div>
        </Modal>

        {/* System create dialog */}
        <Modal open={showSystemCreate} title="新建系统" onClose={() => setShowSystemCreate(false)}>
          <div className="space-y-3">
            <input
              type="text"
              value={newSystemName}
              onChange={(e) => setNewSystemName(e.target.value)}
              placeholder="请输入系统名称"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              onKeyUp={(e) => { if (e.key === 'Enter') doCreateSystem() }}
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setShowSystemCreate(false)}
              >取消</button>
              <button
                disabled={!newSystemName.trim()}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-teal-200"
                onClick={doCreateSystem}
              >创建</button>
            </div>
          </div>
        </Modal>

        {/* System rename dialog */}
        <Modal open={!!editingSystem} title="重命名系统" onClose={() => setEditingSystem(null)}>
          <div className="space-y-3">
            <input
              type="text"
              value={renameSystemName}
              onChange={(e) => setRenameSystemName(e.target.value)}
              placeholder="请输入系统名称"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              onKeyUp={(e) => { if (e.key === 'Enter') doRenameSystem() }}
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setEditingSystem(null)}
              >取消</button>
              <button
                disabled={!renameSystemName.trim()}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-teal-200"
                onClick={doRenameSystem}
              >保存</button>
            </div>
          </div>
        </Modal>

        {/* System delete confirmation */}
        <Modal open={!!deletingSystem} title="确认删除系统" onClose={() => setDeletingSystem(null)}>
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              确定要删除系统 <span className="font-semibold text-slate-800">&quot;{deletingSystem?.name}&quot;</span> 吗？所有节点和连线将被一并删除，此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setDeletingSystem(null)}
              >取消</button>
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                onClick={confirmDeleteSystem}
              >确认删除</button>
            </div>
          </div>
        </Modal>

        {/* Delete entry confirmation */}
        <Modal open={!!deletingEntry} title="确认删除" onClose={() => setDeletingEntry(null)}>
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              确定要删除 <span className="font-semibold text-slate-800">&quot;{deletingEntry?.title}&quot;</span> 吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setDeletingEntry(null)}
              >取消</button>
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                onClick={confirmDelete}
              >确认删除</button>
            </div>
          </div>
        </Modal>
      </div>
    </AppProvider>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <KnowledgeProvider>
      <MindMapProvider>
        <AppShellInner>{children}</AppShellInner>
      </MindMapProvider>
    </KnowledgeProvider>
  )
}
