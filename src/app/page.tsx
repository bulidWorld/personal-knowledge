'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { Plus, ArrowLeft, Pencil, Trash2, Bold, Italic, Strikethrough, List, ListOrdered, Code2, Terminal, Heading, Quote } from 'lucide-react'
import type { KnowledgeEntry, ContentType } from '@/types/knowledge'
import type { MindMapNode, MindMapNodeType, MindMapSystem } from '@/types/mindmap'
import { useKnowledge } from '@/hooks/knowledge-context'
import { useMindMap } from '@/hooks/mindmap-context'
import { useApp } from '@/hooks/app-context'
import { renderContent, renderNodeContent } from '@/lib/content-render'
import { handleMarkdownImagePaste } from '@/lib/paste-image'
import SearchBar from '@/components/SearchBar'
import KnowledgeGrid from '@/components/KnowledgeGrid'
import Pagination from '@/components/Pagination'
import IframeEmbed from '@/components/IframeEmbed'
import MindMapCanvas from '@/components/MindMapCanvas'
import SystemCardGrid from '@/components/SystemCardGrid'

const contentModes = [
  { key: 'richtext' as ContentType, label: '富文本' },
  { key: 'html' as ContentType, label: 'HTML' },
  { key: 'markdown' as ContentType, label: 'Markdown' },
]

const nodeTypeLabels: Record<string, string> = { topic: '主题节点', concept: '概念节点', operation: '操作节点', article: '文章节点' }
function nodeTypeLabel(type: string) { return nodeTypeLabels[type] || type }

const nodeTypeColors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6', article: '#8b5cf6' }

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Home() {
  const knowledge = useKnowledge()
  const mindmap = useMindMap()
  const app = useApp()

  const selectedSystemId = mindmap.selectedSystemId
  const setSelectedSystemId = mindmap.setSelectedSystemId
  const showSystemGrid = selectedSystemId === '__all__'

  // --- Knowledge entry detail ---
  const [focusedEntry, setFocusedEntry] = useState<KnowledgeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState(false)
  const entryEditorRef = useRef<HTMLDivElement | null>(null)
  const entryMdTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [entryEditForm, setEntryEditForm] = useState({
    title: '', htmlContent: '', markdownContent: '', richtextContent: '',
    contentType: 'html' as string, categoryId: '',
  })

  const focusedGradient = focusedEntry?.gradient ?? 'bg-gradient-to-r from-slate-400 to-slate-500'
  const focusedDotColor = focusedEntry?.dotColor ?? 'bg-slate-400'
  const focusedCategoryName = focusedEntry?.categoryName ?? ''
  const focusedRenderedContent = useMemo(() =>
    focusedEntry ? renderContent(focusedEntry) : '', [focusedEntry])

  function focusEntry(entry: KnowledgeEntry) { setFocusedEntry(entry) }

  function startEditingEntry() {
    if (!focusedEntry) return
    const e = focusedEntry
    setEntryEditForm({
      title: e.title,
      htmlContent: e.htmlContent || '',
      markdownContent: e.markdownContent || '',
      richtextContent: e.richtextContent || '',
      contentType: e.contentType || 'html',
      categoryId: e.categoryId,
    })
    setEditingEntry(true)
  }

  function cancelEditingEntry() { setEditingEntry(false) }

  // Initialize contentEditable when editing starts or focused entry changes
  // Uses focusedEntry data directly + setTimeout to avoid race with state commit
  useEffect(() => {
    if (!editingEntry) return
    const timer = setTimeout(() => {
      if (entryEditForm.contentType === 'richtext' && entryEditorRef.current) {
        entryEditorRef.current.innerHTML = focusedEntry?.richtextContent || ''
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [editingEntry, focusedEntry?.id])

  // Sync contentEditable when switching to richtext mode (not on every keystroke)
  useEffect(() => {
    if (entryEditForm.contentType === 'richtext' && entryEditorRef.current) {
      entryEditorRef.current.innerHTML = entryEditForm.richtextContent || ''
    }
  }, [entryEditForm.contentType])

  async function saveEntryEdit() {
    if (!focusedEntry) return
    let richtextContent = entryEditForm.richtextContent
    if (entryEditForm.contentType === 'richtext') {
      richtextContent = entryEditorRef.current?.innerHTML || ''
    }
    const id = focusedEntry.id
    const updatedCategoryName = knowledge.categories.find(c => c.id === entryEditForm.categoryId)?.name || focusedEntry.categoryName

    const updatedEntry: KnowledgeEntry = {
      ...focusedEntry,
      title: entryEditForm.title,
      htmlContent: entryEditForm.htmlContent,
      markdownContent: entryEditForm.markdownContent,
      richtextContent,
      contentType: entryEditForm.contentType as ContentType,
      categoryId: entryEditForm.categoryId,
      categoryName: updatedCategoryName,
    }
    setFocusedEntry(updatedEntry)
    setEditingEntry(false)

    await fetch(`/api/knowledge/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: entryEditForm.title,
        htmlContent: entryEditForm.htmlContent,
        markdownContent: entryEditForm.markdownContent,
        richtextContent,
        contentType: entryEditForm.contentType,
        categoryId: entryEditForm.categoryId,
      }),
    })
    await knowledge.refresh()
  }

  function switchEntryMode(mode: string) {
    setEntryEditForm((prev) => {
      const richtextContent = prev.contentType === 'richtext' && entryEditorRef.current
        ? entryEditorRef.current.innerHTML || ''
        : prev.richtextContent
      return { ...prev, contentType: mode, richtextContent }
    })
  }

  function onEntryRichTextInput() {
    const html = entryEditorRef.current?.innerHTML || ''
    setEntryEditForm((prev) => ({ ...prev, richtextContent: html }))
  }

  function onEntryPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = () => {
              // Use Selection API instead of execCommand for reliable image insertion
              const sel = window.getSelection()
              if (sel && sel.rangeCount > 0 && entryEditorRef.current) {
                const range = sel.getRangeAt(0)
                const img = document.createElement('img')
                img.src = reader.result as string
                img.style.maxWidth = '100%'
                range.deleteContents()
                range.insertNode(img)
                // Move cursor after the inserted image
                range.setStartAfter(img)
                range.collapse(true)
                sel.removeAllRanges()
                sel.addRange(range)
                onEntryRichTextInput()
              }
            }
            reader.readAsDataURL(file)
          }
          return
        }
      }
    }
    // For text/HTML paste, let the browser handle it natively.
    // The onInput handler will sync state automatically.
  }

  function onEntryMarkdownPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (entryMdTextareaRef.current) {
      handleMarkdownImagePaste(e, entryMdTextareaRef.current, (newValue) => {
        setEntryEditForm((prev) => ({ ...prev, markdownContent: newValue }))
      })
    }
  }

  function execEntryCmd(cmd: string, value?: string) {
    entryEditorRef.current?.focus()
    document.execCommand(cmd, false, value)
    onEntryRichTextInput()
  }

  function insertEntryCode() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.toString()) {
      const range = sel.getRangeAt(0)
      const code = document.createElement('code')
      code.className = 'bg-slate-100 px-1 py-0.5 rounded text-sm text-rose-600'
      code.textContent = sel.toString()
      range.deleteContents()
      range.insertNode(code)
      onEntryRichTextInput()
    }
  }

  function insertEntryCodeBlock() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const text = sel.toString() || '代码'
      const range = sel.getRangeAt(0)
      const pre = document.createElement('pre')
      pre.className = 'bg-slate-800 text-slate-100 p-3 rounded-lg text-sm my-2 overflow-x-auto'
      pre.contentEditable = 'false'
      const code = document.createElement('code')
      code.textContent = text
      pre.appendChild(code)
      range.deleteContents()
      range.insertNode(pre)
      onEntryRichTextInput()
    }
  }

  // --- MindMap node detail ---
  const [focusedNode, setFocusedNode] = useState<MindMapNode | null>(null)
  const [editingNode, setEditingNode] = useState(false)
  const nodeMdTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [nodeEditForm, setNodeEditForm] = useState({
    title: '', htmlContent: '', markdownContent: '', richtextContent: '', contentType: 'html' as string, nodeType: 'topic' as string,
  })

  const focusedNodeGradient = useMemo(() => {
    const c = focusedNode?.color || '#10b981'
    return `linear-gradient(to right, ${c}, ${c}88)`
  }, [focusedNode])
  const focusedNodeColor = focusedNode?.color || '#10b981'
  const focusedNodeRenderedContent = useMemo(() =>
    focusedNode ? renderNodeContent(focusedNode) : '', [focusedNode])

  function showNodeDetail(node: MindMapNode) {
    setFocusedNode(node)
    setEditingNode(false)
  }

  function closeNodeDetail() {
    setFocusedNode(null)
    setEditingNode(false)
    // 返回画布时全量刷新，确保节点数据与服务器同步
    if (selectedSystemId) {
      mindmap.fetchNodes(selectedSystemId)
      mindmap.fetchConnections(selectedSystemId)
    }
  }

  function startEditingNode() {
    if (!focusedNode) return
    setNodeEditForm({
      title: focusedNode.title,
      htmlContent: focusedNode.htmlContent || '',
      markdownContent: focusedNode.markdownContent || '',
      richtextContent: focusedNode.richtextContent || '',
      contentType: focusedNode.contentType || 'html',
      nodeType: focusedNode.nodeType || 'topic',
    })
    setEditingNode(true)
  }

  async function saveNodeEdit() {
    if (!focusedNode) return
    const id = focusedNode.id
    const newColor = nodeTypeColors[nodeEditForm.nodeType] || focusedNode.color
    setFocusedNode({
      ...focusedNode,
      title: nodeEditForm.title,
      htmlContent: nodeEditForm.htmlContent,
      markdownContent: nodeEditForm.markdownContent,
      richtextContent: nodeEditForm.richtextContent,
      contentType: nodeEditForm.contentType as ContentType,
      nodeType: nodeEditForm.nodeType as MindMapNodeType,
      color: newColor,
    })
    setEditingNode(false)
    await app.handleUpdateMindMapNode(id, {
      title: nodeEditForm.title,
      htmlContent: nodeEditForm.htmlContent,
      markdownContent: nodeEditForm.markdownContent,
      richtextContent: nodeEditForm.richtextContent,
      contentType: nodeEditForm.contentType,
      nodeType: nodeEditForm.nodeType as MindMapNodeType,
      color: newColor,
    })
  }

  function onNodeMarkdownPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (nodeMdTextareaRef.current) {
      handleMarkdownImagePaste(e, nodeMdTextareaRef.current, (newValue) => {
        setNodeEditForm((prev) => ({ ...prev, markdownContent: newValue }))
      })
    }
  }

  async function deleteNodeFromDetail() {
    if (!focusedNode) return
    await app.handleDeleteNode(focusedNode.id)
    setFocusedNode(null)
  }

  function onSystemCardClick(system: MindMapSystem) {
    setSelectedSystemId(system.id)
  }

  function backToSystems() {
    setSelectedSystemId(null)
  }

  // --- Render: MindMap canvas ---
  if (selectedSystemId && selectedSystemId !== '__all__') {
    return (
      <div>
        {focusedNode ? (
          <div className="h-[calc(100vh-6rem)]">
            <header className="mb-4">
              <button
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                onClick={closeNodeDetail}
              >
                <ArrowLeft size={16} />
                <span>返回画布</span>
              </button>
            </header>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden h-[calc(100vh-11rem)]">
              <div className="w-full h-1" style={{ background: focusedNodeGradient }} />
              <div className="p-8 overflow-y-auto h-full">
                <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: focusedNodeColor }} />
                    <span>{nodeTypeLabel(focusedNode.nodeType)}</span>
                  </span>
                </div>

                {!editingNode ? (
                  <>
                    <h2 className="text-xl font-bold text-slate-800 mb-6">{focusedNode.title}</h2>
                    <div className="knowledge-content text-slate-600 text-sm leading-relaxed max-w-5xl" dangerouslySetInnerHTML={{ __html: focusedNodeRenderedContent }} />
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                      <span className="text-xs text-slate-400">更新于 {formatDate(focusedNode.updatedAt)}</span>
                      <div className="flex gap-2">
                        <button
                          className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-teal-500 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                          onClick={startEditingNode}
                        >
                          <Pencil size={14} /><span>编辑</span>
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                          onClick={deleteNodeFromDetail}
                        >
                          <Trash2 size={14} /><span>删除</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
                      <input
                        type="text"
                        value={nodeEditForm.title}
                        onChange={(e) => setNodeEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">节点类型</label>
                      <select
                        value={nodeEditForm.nodeType}
                        onChange={(e) => setNodeEditForm((prev) => ({ ...prev, nodeType: e.target.value }))}
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
                                nodeEditForm.contentType === mode.key
                                  ? 'bg-white text-slate-800 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              onClick={() => setNodeEditForm((prev) => ({ ...prev, contentType: mode.key }))}
                            >{mode.label}</button>
                          ))}
                        </div>
                      </div>
                      {nodeEditForm.contentType === 'html' && (
                        <textarea
                          value={nodeEditForm.htmlContent}
                          onChange={(e) => setNodeEditForm((prev) => ({ ...prev, htmlContent: e.target.value }))}
                          rows={10}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                          placeholder="HTML 内容..."
                        />
                      )}
                      {nodeEditForm.contentType === 'markdown' && (
                        <textarea
                          ref={nodeMdTextareaRef}
                          value={nodeEditForm.markdownContent}
                          onChange={(e) => setNodeEditForm((prev) => ({ ...prev, markdownContent: e.target.value }))}
                          onPaste={onNodeMarkdownPaste}
                          rows={10}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                          placeholder="Markdown 内容..."
                        />
                      )}
                      {nodeEditForm.contentType === 'richtext' && (
                        <textarea
                          value={nodeEditForm.richtextContent}
                          onChange={(e) => setNodeEditForm((prev) => ({ ...prev, richtextContent: e.target.value }))}
                          rows={10}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                          placeholder="富文本内容..."
                        />
                      )}
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={() => setEditingNode(false)}
                      >取消</button>
                      <button
                        className="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm shadow-teal-200"
                        onClick={saveNodeEdit}
                      >保存</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  onClick={backToSystems}
                >
                  <ArrowLeft size={16} />
                  <span>返回系统列表</span>
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-sm text-slate-500">双击节点查看详情 · 右键新增节点 · 拖拽移动 · 滚轮缩放</span>
              </div>
            </header>
            <MindMapCanvas
              nodes={mindmap.nodes}
              connections={mindmap.connections}
              onNodeMove={app.handleNodeMove}
              onNodeDblClick={showNodeDetail}
              onAddNode={app.handleAddNode}
              onDeleteNode={app.handleDeleteNode}
              onChangeParent={app.handleChangeParent}
            />
          </>
        )}
      </div>
    )
  }

  // --- Render: System grid ---
  if (showSystemGrid) {
    return (
      <div>
        <header className="mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">系统建模</h2>
              <p className="text-slate-500 mt-1">管理系统架构与思维导图</p>
            </div>
          </div>
        </header>
        <SystemCardGrid
          systems={mindmap.systems}
          onSelect={onSystemCardClick}
          onEdit={app.onSystemEdit}
          onDelete={app.onSystemDelete}
        />
      </div>
    )
  }

  // --- Render: Knowledge grid/detail (default) ---
  return (
    <div>
      <header className="mb-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            {focusedEntry ? (
              <>
                <button
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
                  onClick={() => setFocusedEntry(null)}
                >
                  <ArrowLeft size={16} />
                  <span>返回列表</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-6 rounded-full ${focusedDotColor}`} />
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{focusedEntry.title}</h2>
                </div>
              </>
            ) : knowledge.selectedCategory ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-1 h-6 rounded-full ${knowledge.selectedCategory.dotColor}`} />
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{knowledge.selectedCategory.name}</h2>
                </div>
                <p className="text-slate-500 mt-1 ml-4">{knowledge.selectedCategory.description}</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">全部知识</h2>
                <p className="text-slate-500 mt-1">浏览所有分类的知识条目</p>
              </>
            )}
          </div>
          {!focusedEntry && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-64">
                <SearchBar value={knowledge.searchQuery} onChange={knowledge.setSearch} />
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
                onClick={app.openCreateForm}
              >
                <Plus size={16} />
                <span>新建</span>
              </button>
            </div>
          )}
        </div>
        {knowledge.searchQuery && !focusedEntry && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-500">
              搜索 &quot;<span className="font-medium text-slate-700">{knowledge.searchQuery}</span>&quot; 找到 <span className="font-semibold text-slate-700">{knowledge.total}</span> 条结果
            </span>
            <button className="text-sm text-blue-500 hover:text-blue-700 font-medium" onClick={() => knowledge.setSearch('')}>清除</button>
          </div>
        )}
      </header>

      {knowledge.status === 'loading' ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : focusedEntry ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className={`w-full h-1 ${focusedGradient}`} />
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
              <span className={`inline-block w-2 h-2 rounded-full ${focusedDotColor}`} />
              <span>{focusedCategoryName}</span>
            </div>

            {!editingEntry ? (
              <>
                <div className="knowledge-content text-slate-600 text-sm leading-relaxed max-w-5xl" dangerouslySetInnerHTML={{ __html: focusedRenderedContent }} />
                {focusedEntry.iframeUrl && <IframeEmbed src={focusedEntry.iframeUrl} />}
                {focusedEntry.imageUrl && !focusedEntry.iframeUrl && (
                  <img src={focusedEntry.imageUrl} alt={focusedEntry.title} className="max-w-full rounded-lg mt-6" loading="lazy" />
                )}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                  <span className="text-xs text-slate-400">更新于 {formatDate(focusedEntry.updatedAt)}</span>
                  <div className="flex gap-2">
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                      onClick={startEditingEntry}
                    >
                      <Pencil size={14} /><span>编辑</span>
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                      onClick={() => app.onDelete(focusedEntry)}
                    >
                      <Trash2 size={14} /><span>删除</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
                  <input
                    type="text"
                    value={entryEditForm.title}
                    onChange={(e) => setEntryEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">分类</label>
                  <select
                    value={entryEditForm.categoryId}
                    onChange={(e) => setEntryEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    {knowledge.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
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
                            entryEditForm.contentType === mode.key
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          onClick={() => switchEntryMode(mode.key)}
                        >{mode.label}</button>
                      ))}
                    </div>
                  </div>
                  {entryEditForm.contentType === 'html' && (
                    <textarea
                      value={entryEditForm.htmlContent}
                      onChange={(e) => setEntryEditForm((prev) => ({ ...prev, htmlContent: e.target.value }))}
                      rows={10}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
                      placeholder="HTML 内容..."
                    />
                  )}
                  {entryEditForm.contentType === 'markdown' && (
                    <textarea
                      ref={entryMdTextareaRef}
                      value={entryEditForm.markdownContent}
                      onChange={(e) => setEntryEditForm((prev) => ({ ...prev, markdownContent: e.target.value }))}
                      onPaste={onEntryMarkdownPaste}
                      rows={10}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
                      placeholder="Markdown 内容..."
                    />
                  )}
                  {entryEditForm.contentType === 'richtext' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <div className="flex flex-wrap gap-0.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="粗体" onClick={() => execEntryCmd('bold')}><Bold size={15} /></button>
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="斜体" onClick={() => execEntryCmd('italic')}><Italic size={15} /></button>
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="删除线" onClick={() => execEntryCmd('strikeThrough')}><Strikethrough size={15} /></button>
                        <span className="w-px h-6 bg-slate-200 mx-1 self-center" />
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="无序列表" onClick={() => execEntryCmd('insertUnorderedList')}><List size={15} /></button>
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="有序列表" onClick={() => execEntryCmd('insertOrderedList')}><ListOrdered size={15} /></button>
                        <span className="w-px h-6 bg-slate-200 mx-1 self-center" />
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="代码" onClick={insertEntryCode}><Code2 size={15} /></button>
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="代码块" onClick={insertEntryCodeBlock}><Terminal size={15} /></button>
                        <span className="w-px h-6 bg-slate-200 mx-1 self-center" />
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="标题" onClick={() => execEntryCmd('formatBlock', '<h3>')}><Heading size={15} /></button>
                        <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="引用" onClick={() => execEntryCmd('formatBlock', '<blockquote>')}><Quote size={15} /></button>
                      </div>
                      <div
                        ref={entryEditorRef}
                        className="px-4 py-3 min-h-[200px] text-sm text-slate-700 outline-none"
                        contentEditable
                        onInput={onEntryRichTextInput}
                        onPaste={onEntryPaste}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2.5 pt-2">
                  <button className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors" onClick={cancelEditingEntry}>取消</button>
                  <button className="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200" onClick={saveEntryEdit}>保存</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <KnowledgeGrid
            entries={knowledge.entries}
            onEdit={app.onEdit}
            onDelete={app.onDelete}
            onDblClick={focusEntry}
          />

          {!knowledge.selectedCategoryId && !knowledge.searchQuery && mindmap.systems.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-lg font-semibold text-slate-700">系统建模</h2>
                <span className="text-xs text-slate-400">{mindmap.systems.length} 个系统</span>
              </div>
              <SystemCardGrid
                systems={mindmap.systems}
                onSelect={onSystemCardClick}
                onEdit={app.onSystemEdit}
                onDelete={app.onSystemDelete}
              />
            </div>
          )}

          <Pagination page={knowledge.currentPage} totalPages={knowledge.totalPages} onPageChange={knowledge.goToPage} />
        </>
      )}
    </div>
  )
}
