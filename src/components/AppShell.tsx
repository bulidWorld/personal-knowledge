'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { KnowledgeEntry, KnowledgeFormData, KnowledgeCategory, Tag, ContentType } from '@/types/knowledge'
import type { MindMapNode, MindMapSystem } from '@/types/mindmap'
import { KnowledgeProvider, useKnowledge } from '@/hooks/knowledge-context'
import { MindMapProvider, useMindMap } from '@/hooks/mindmap-context'
import { AppProvider, useApp } from '@/hooks/app-context'
import type { AppContextValue, EditingMindMapNode } from '@/hooks/app-context'
import AppSidebar from './AppSidebar'
import DatabaseSettingsDialog from './DatabaseSettingsDialog'
import KnowledgeForm from './KnowledgeForm'
import Modal from './Modal'
import { handleMarkdownImagePaste } from '@/lib/paste-image'
import { updateSystem } from '@/services/system-service'
import { canUseDesktopSettings } from '@/services/settings-service'
import { listenDesktopEvents } from '@/services/desktop-events'

const CATEGORY_ICONS = [
  'Bot', 'Lightbulb', 'MessageSquareText', 'Terminal', 'Workflow',
  'Code2', 'FileText', 'Globe', 'Database', 'Palette',
  'Rocket', 'Star', 'Zap', 'BookOpen', 'LayoutGrid',
]

const CATEGORY_COLORS = [
  { dot: 'bg-blue-500', border: 'border-l-blue-500', gradient: 'bg-gradient-to-r from-blue-400 to-blue-500' },
  { dot: 'bg-teal-500', border: 'border-l-teal-500', gradient: 'bg-gradient-to-r from-teal-400 to-teal-500' },
  { dot: 'bg-violet-500', border: 'border-l-violet-500', gradient: 'bg-gradient-to-r from-violet-400 to-violet-500' },
  { dot: 'bg-rose-500', border: 'border-l-rose-500', gradient: 'bg-gradient-to-r from-rose-400 to-rose-500' },
  { dot: 'bg-amber-500', border: 'border-l-amber-500', gradient: 'bg-gradient-to-r from-amber-400 to-amber-500' },
  { dot: 'bg-emerald-500', border: 'border-l-emerald-500', gradient: 'bg-gradient-to-r from-emerald-400 to-emerald-500' },
  { dot: 'bg-cyan-500', border: 'border-l-cyan-500', gradient: 'bg-gradient-to-r from-cyan-400 to-cyan-500' },
  { dot: 'bg-pink-500', border: 'border-l-pink-500', gradient: 'bg-gradient-to-r from-pink-400 to-pink-500' },
]

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

  // --- Category state ---
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<KnowledgeCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'LayoutGrid', description: '', colorIndex: 0 })

  // --- Tag state ---
  const [showTagForm, setShowTagForm] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [tagForm, setTagForm] = useState({ name: '', color: '#6366f1' })
  const [showDatabaseSettings, setShowDatabaseSettings] = useState(false)
  const [showDesktopSettingsEntry, setShowDesktopSettingsEntry] = useState(false)
  const [desktopNotice, setDesktopNotice] = useState<string | null>(null)

  const TAG_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  ]

  // --- MindMap node edit ---
  const [editingMindMapNode, setEditingMindMapNode] = useState<EditingMindMapNode | null>(null)
  const [pendingNewNode, setPendingNewNode] = useState<{ type: string; x: number; y: number; parentId: string | null } | null>(null)
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
      tagIds: entry.tags?.map((t) => t.id) || [],
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
    // Pre-select the currently active category if any
    setEditingEntry(knowledge.selectedCategoryId ? {
      title: '',
      htmlContent: '',
      markdownContent: '',
      richtextContent: '',
      contentType: 'richtext' as ContentType,
      categoryId: knowledge.selectedCategoryId,
      tagIds: [],
    } : null)
    setShowCreateForm(true)
  }, [knowledge.selectedCategoryId])

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
    await updateSystem(editingSystem.id, { name: renameSystemName.trim() })
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

  // --- Category handlers ---
  const openCreateCategoryForm = useCallback(() => {
    setEditingCategory(null)
    setCategoryForm({ name: '', icon: 'LayoutGrid', description: '', colorIndex: 0 })
    setShowCategoryForm(true)
  }, [])

  const openEditCategoryForm = useCallback((cat: KnowledgeCategory) => {
    setEditingCategory(cat)
    // Try to find matching color index
    const colorIdx = CATEGORY_COLORS.findIndex(c => c.dot === cat.dotColor)
    setCategoryForm({
      name: cat.name,
      icon: cat.icon,
      description: cat.description,
      colorIndex: colorIdx >= 0 ? colorIdx : 0,
    })
    setShowCategoryForm(true)
  }, [])

  const handleCategoryFormSubmit = useCallback(async () => {
    if (!categoryForm.name.trim()) return
    const colors = CATEGORY_COLORS[categoryForm.colorIndex] || CATEGORY_COLORS[0]
    const data = {
      name: categoryForm.name.trim(),
      icon: categoryForm.icon,
      description: categoryForm.description.trim(),
      borderColor: colors.border,
      dotColor: colors.dot,
      gradient: colors.gradient,
    }
    if (editingCategory) {
      await knowledge.updateCategory(editingCategory.id, data)
    } else {
      await knowledge.createCategory(data)
    }
    setShowCategoryForm(false)
    setEditingCategory(null)
  }, [categoryForm, editingCategory, knowledge])

  const handleDeleteCategory = useCallback((cat: KnowledgeCategory) => {
    setDeletingCategory(cat)
  }, [])

  const confirmDeleteCategory = useCallback(async () => {
    if (!deletingCategory) return
    const result = await knowledge.deleteCategory(deletingCategory.id)
    if (!result.success) {
      alert(result.error || '删除分类失败')
    }
    setDeletingCategory(null)
    // Clear selection if we're viewing the deleted category
    if (knowledge.selectedCategoryId === deletingCategory.id) {
      knowledge.selectCategory(null)
    }
  }, [deletingCategory, knowledge])

  // --- Tag handlers ---
  const openCreateTagForm = useCallback(() => {
    setEditingTag(null)
    setTagForm({ name: '', color: '#6366f1' })
    setShowTagForm(true)
  }, [])

  const openEditTagForm = useCallback((tag: Tag) => {
    setEditingTag(tag)
    setTagForm({ name: tag.name, color: tag.color })
    setShowTagForm(true)
  }, [])

  const handleTagFormSubmit = useCallback(async () => {
    if (!tagForm.name.trim()) return
    if (editingTag) {
      await knowledge.updateTag(editingTag.id, { name: tagForm.name.trim(), color: tagForm.color })
    } else {
      await knowledge.createTag({ name: tagForm.name.trim(), color: tagForm.color })
    }
    setShowTagForm(false)
    setEditingTag(null)
  }, [tagForm, editingTag, knowledge])

  const handleDeleteTag = useCallback((tag: Tag) => {
    setDeletingTag(tag)
  }, [])

  const confirmDeleteTag = useCallback(async () => {
    if (!deletingTag) return
    const result = await knowledge.deleteTag(deletingTag.id)
    if (!result.success) {
      alert(result.error || '删除标签失败')
    }
    setDeletingTag(null)
  }, [deletingTag, knowledge])

  // --- MindMap node edit ---
  const handleMindMapNodeDblClick = useCallback((node: MindMapNode) => {
    setEditingMindMapNode({
      id: node.id,
      title: node.title,
      htmlContent: node.htmlContent || '',
      markdownContent: node.markdownContent || '',
      richtextContent: node.richtextContent || '',
      contentType: node.contentType || 'html',
      nodeType: node.nodeType,
    })
  }, [])

  const saveMindMapNode = useCallback(async () => {
    if (!editingMindMapNode) return
    const n = editingMindMapNode
    const colors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6', article: '#8b5cf6' }

    if (pendingNewNode) {
      // Creating a new node
      const newNode = await mindmap.createNode({
        systemId: selectedSystemId!,
        title: n.title,
        nodeType: n.nodeType,
        parentId: pendingNewNode.parentId,
        x: pendingNewNode.x,
        y: pendingNewNode.y,
        color: colors[n.nodeType] || '',
        htmlContent: n.htmlContent,
        markdownContent: n.markdownContent,
        richtextContent: n.richtextContent,
        contentType: n.contentType,
      })
      if (pendingNewNode.parentId) {
        await mindmap.createConnection(selectedSystemId!, pendingNewNode.parentId, newNode.id)
      }
      setPendingNewNode(null)
    } else {
      // Updating an existing node
      await mindmap.updateNode(n.id, {
        title: n.title,
        htmlContent: n.htmlContent,
        markdownContent: n.markdownContent,
        richtextContent: n.richtextContent,
        contentType: n.contentType,
        nodeType: n.nodeType,
        color: colors[n.nodeType] || n.nodeType,
      } as Partial<MindMapNode>)
      if (selectedSystemId) await mindmap.fetchNodes(selectedSystemId)
    }
    setEditingMindMapNode(null)
  }, [editingMindMapNode, pendingNewNode, mindmap, selectedSystemId])

  const onNodeModalMarkdownPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (nodeModalMdRef.current) {
      handleMarkdownImagePaste(e, nodeModalMdRef.current, (newValue) => {
        setEditingMindMapNode((prev) => prev ? { ...prev, markdownContent: newValue } : null)
      })
    }
  }, [])

  const closeMindMapNodeEdit = useCallback(() => {
    setEditingMindMapNode(null)
    setPendingNewNode(null)
  }, [])

  // --- Canvas interactions ---
  const handleNodeMove = useCallback(async (id: string, x: number, y: number) => {
    await mindmap.updateNode(id, { x, y } as Partial<MindMapNode>)
  }, [mindmap])

  const handleAddNode = useCallback(async (type: string, x: number, y: number, parentId: string | null) => {
    if (!selectedSystemId) return
    const typeNames: Record<string, string> = { topic: '新主题', concept: '新概念', operation: '新操作', article: '新文章' }
    // Store creation params — the node won't be created until the user saves in the modal
    setPendingNewNode({ type, x, y, parentId })
    setEditingMindMapNode({
      id: '',
      title: typeNames[type] || '新节点',
      htmlContent: '',
      markdownContent: '',
      richtextContent: '',
      contentType: 'html',
      nodeType: type,
    })
  }, [selectedSystemId])

  const handleDeleteNode = useCallback(async (id: string) => {
    await mindmap.deleteNode(id)
  }, [mindmap])

  const handleUpdateMindMapNode = useCallback(async (id: string, updates: Record<string, unknown>) => {
    await mindmap.updateNode(id, updates as Partial<MindMapNode>)
    if (selectedSystemId) await mindmap.fetchNodes(selectedSystemId)
  }, [mindmap, selectedSystemId])

  const handleChangeParent = useCallback(async (nodeId: string, newParentId: string | null) => {
    // 1. Remove old connection (parent → this node)
    const oldConn = mindmap.connections.find(c => c.targetNodeId === nodeId)
    if (oldConn) {
      await mindmap.deleteConnection(oldConn.id)
    }

    // 2. Update node's parent_id
    await mindmap.updateNode(nodeId, { parentId: newParentId } as Partial<MindMapNode>)

    // 3. Create new connection (new parent → this node)
    if (newParentId && selectedSystemId) {
      await mindmap.createConnection(selectedSystemId, newParentId, nodeId)
    }

    // 4. Refresh
    if (selectedSystemId) {
      await mindmap.fetchNodes(selectedSystemId)
      await mindmap.fetchConnections(selectedSystemId)
    }
  }, [mindmap, selectedSystemId])

  // --- Sidebar selection ---
  const onSelectCategory = useCallback((id: string | null) => {
    knowledge.selectCategory(id)
    knowledge.selectTag(null)
    setSelectedSystemId(null)
  }, [knowledge, setSelectedSystemId])

  const onSelectTag = useCallback((id: string | null) => {
    knowledge.selectTag(id)
    knowledge.selectCategory(null)
    setSelectedSystemId(null)
  }, [knowledge, setSelectedSystemId])

  const onSelectSystem = useCallback((id: string | null) => {
    knowledge.selectCategory(null)
    knowledge.selectTag(null)
    setSelectedSystemId(id)
  }, [knowledge, setSelectedSystemId])

  useEffect(() => {
    setShowDesktopSettingsEntry(canUseDesktopSettings())
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    listenDesktopEvents({
      onQuickSearch: () => window.dispatchEvent(new CustomEvent('knowledge:quick-search')),
      onNewKnowledge: openCreateForm,
      onClipboardSave: openCreateForm,
      onOpenSettings: () => setShowDatabaseSettings(true),
      onDatabaseOffline: (message) => {
        setDesktopNotice(message || '数据库连接不可用，请检查配置')
        setShowDatabaseSettings(true)
      },
    }).then((unlisten) => {
      cleanup = unlisten
    })

    return () => cleanup?.()
  }, [openCreateForm])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const ctrlOrMeta = event.ctrlKey || event.metaKey
      if (!ctrlOrMeta) return

      if (event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('knowledge:quick-search'))
      } else if (!event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        openCreateForm()
      } else if (event.key === ',') {
        event.preventDefault()
        if (canUseDesktopSettings()) setShowDatabaseSettings(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openCreateForm])

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
    handleChangeParent,
  }), [
    handleEdit, handleDelete, openCreateForm,
    handleNodeMove, handleAddNode, handleDeleteNode,
    handleMindMapNodeDblClick, handleSystemEdit, handleSystemDelete,
    handleUpdateMindMapNode, handleChangeParent,
  ])

  return (
    <AppProvider value={appValue}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AppSidebar
          categories={knowledge.categories}
          selectedCategoryId={knowledge.selectedCategoryId}
          selectedSystemId={selectedSystemId}
          selectedTagId={knowledge.selectedTagId}
          totalCount={knowledge.total}
          categoryCounts={knowledge.categoryCounts}
          tags={knowledge.tags}
          systems={mindmap.systems}
          onSelectCategory={onSelectCategory}
          onSelectSystem={onSelectSystem}
          onSelectTag={onSelectTag}
          onCreateSystem={onCreateSystem}
          onCreate={openCreateForm}
          onCreateCategory={openCreateCategoryForm}
          onEditCategory={openEditCategoryForm}
          onDeleteCategory={handleDeleteCategory}
          onCreateTag={openCreateTagForm}
          onEditTag={openEditTagForm}
          onDeleteTag={handleDeleteTag}
          showDesktopSettings={showDesktopSettingsEntry}
          onOpenDesktopSettings={() => setShowDatabaseSettings(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 md:px-8 md:py-10">
            {desktopNotice && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span>{desktopNotice}</span>
                <button
                  type="button"
                  className="text-xs font-medium text-amber-700 hover:text-amber-900"
                  onClick={() => setDesktopNotice(null)}
                >
                  关闭
                </button>
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Knowledge form modal */}
        <KnowledgeForm
          open={showCreateForm}
          entry={editingEntry}
          categories={knowledge.categories}
          tags={knowledge.tags}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />

        <DatabaseSettingsDialog
          open={showDatabaseSettings}
          onClose={() => setShowDatabaseSettings(false)}
        />

        {/* MindMap node edit modal */}
        <Modal open={!!editingMindMapNode} title={editingMindMapNode?.id ? '编辑节点' : '新建节点'} onClose={closeMindMapNodeEdit}>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">节点类型</label>
              <select
                value={editingMindMapNode?.nodeType ?? 'topic'}
                onChange={(e) => setEditingMindMapNode((prev) => prev ? { ...prev, nodeType: e.target.value } : null)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              >
                <option value="topic">主题节点</option>
                <option value="concept">概念节点</option>
                <option value="operation">操作节点</option>
                <option value="article">文章节点</option>
              </select>
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

        {/* Category create/edit modal */}
        <Modal
          open={showCategoryForm}
          title={editingCategory ? '编辑分类' : '新建分类'}
          onClose={() => { setShowCategoryForm(false); setEditingCategory(null) }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="请输入分类名称"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                onKeyUp={(e) => { if (e.key === 'Enter') handleCategoryFormSubmit() }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">图标</label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`flex items-center justify-center p-2.5 rounded-xl border transition-all ${
                      categoryForm.icon === icon
                        ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}
                    onClick={() => setCategoryForm((prev) => ({ ...prev, icon }))}
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">颜色</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color.dot} transition-all ${
                      categoryForm.colorIndex === idx
                        ? 'ring-2 ring-offset-2 ring-blue-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                    onClick={() => setCategoryForm((prev) => ({ ...prev, colorIndex: idx }))}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">描述（可选）</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                placeholder="分类描述..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => { setShowCategoryForm(false); setEditingCategory(null) }}
              >取消</button>
              <button
                disabled={!categoryForm.name.trim()}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200"
                onClick={handleCategoryFormSubmit}
              >{editingCategory ? '保存' : '创建'}</button>
            </div>
          </div>
        </Modal>

        {/* Category delete confirmation */}
        <Modal open={!!deletingCategory} title="确认删除分类" onClose={() => setDeletingCategory(null)}>
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              确定要删除分类 <span className="font-semibold text-slate-800">&quot;{deletingCategory?.name}&quot;</span> 吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setDeletingCategory(null)}
              >取消</button>
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                onClick={confirmDeleteCategory}
              >确认删除</button>
            </div>
          </div>
        </Modal>

        {/* Tag create/edit modal */}
        <Modal
          open={showTagForm}
          title={editingTag ? '编辑标签' : '新建标签'}
          onClose={() => { setShowTagForm(false); setEditingTag(null) }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
              <input
                type="text"
                value={tagForm.name}
                onChange={(e) => setTagForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="请输入标签名称"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                onKeyUp={(e) => { if (e.key === 'Enter') handleTagFormSubmit() }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">颜色</label>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      tagForm.color === color
                        ? 'ring-2 ring-offset-2 ring-blue-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTagForm((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => { setShowTagForm(false); setEditingTag(null) }}
              >取消</button>
              <button
                disabled={!tagForm.name.trim()}
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200"
                onClick={handleTagFormSubmit}
              >{editingTag ? '保存' : '创建'}</button>
            </div>
          </div>
        </Modal>

        {/* Tag delete confirmation */}
        <Modal open={!!deletingTag} title="确认删除标签" onClose={() => setDeletingTag(null)}>
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              确定要删除标签 <span className="font-semibold text-slate-800">&quot;{deletingTag?.name}&quot;</span> 吗？此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setDeletingTag(null)}
              >取消</button>
              <button
                className="px-5 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
                onClick={confirmDeleteTag}
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
