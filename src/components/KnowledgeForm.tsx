'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { KnowledgeCategory, Tag, KnowledgeFormData, ContentType } from '@/types/knowledge'
import { Bold, Italic, Strikethrough, List, ListOrdered, Code2, Terminal, Heading, Quote } from 'lucide-react'
import Modal from './Modal'
import { handleMarkdownImagePaste } from '@/lib/paste-image'

interface KnowledgeFormProps {
  open: boolean
  entry?: KnowledgeFormData | null
  categories: KnowledgeCategory[]
  tags: Tag[]
  onSubmit: (data: KnowledgeFormData) => void
  onClose: () => void
}

const modes: { key: ContentType; label: string }[] = [
  { key: 'richtext', label: '富文本' },
  { key: 'html', label: 'HTML' },
  { key: 'markdown', label: 'Markdown' },
]

export default function KnowledgeForm({ open, entry, categories, tags, onSubmit, onClose }: KnowledgeFormProps) {
  const [form, setForm] = useState<KnowledgeFormData>({
    id: undefined,
    title: '',
    htmlContent: '',
    markdownContent: '',
    richtextContent: '',
    contentType: 'richtext',
    categoryId: '',
    tagIds: [],
  })
  const editorRef = useRef<HTMLDivElement | null>(null)
  const mdTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isEditing = !!entry?.id

  // Initialize/reset form when modal opens
  useEffect(() => {
    if (open && entry) {
      setForm({
        id: entry.id,
        title: entry.title,
        htmlContent: entry.htmlContent || '',
        markdownContent: entry.markdownContent || '',
        richtextContent: entry.richtextContent || '',
        contentType: entry.contentType || 'richtext',
        categoryId: entry.categoryId,
        tagIds: entry.tagIds || [],
      })
    } else if (open) {
      setForm({
        id: undefined,
        title: '',
        htmlContent: '',
        markdownContent: '',
        richtextContent: '',
        contentType: 'richtext',
        categoryId: '',
        tagIds: [],
      })
    }
  }, [open, entry])

  // Initialize contentEditable when form opens or entry changes
  // Uses entry data directly + setTimeout to avoid race with state commit
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      if (form.contentType === 'richtext' && editorRef.current) {
        editorRef.current.innerHTML = entry?.richtextContent || ''
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [open, entry?.id])

  // Sync contentEditable when switching to richtext mode (not on every keystroke)
  useEffect(() => {
    if (form.contentType === 'richtext' && editorRef.current) {
      editorRef.current.innerHTML = form.richtextContent || ''
    }
  }, [form.contentType])

  function switchMode(mode: ContentType) {
    setForm((prev) => {
      const richtextContent = prev.contentType === 'richtext'
        ? editorRef.current?.innerHTML || ''
        : prev.richtextContent
      return { ...prev, contentType: mode, richtextContent }
    })
  }

  function onRichTextInput() {
    if (editorRef.current) {
      setForm((prev) => ({ ...prev, richtextContent: editorRef.current?.innerHTML || '' }))
    }
  }

  function onPaste(e: React.ClipboardEvent) {
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
              if (sel && sel.rangeCount > 0 && editorRef.current) {
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
                onRichTextInput()
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

  const onMarkdownPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (mdTextareaRef.current) {
      handleMarkdownImagePaste(e, mdTextareaRef.current, (newValue) => {
        setForm((prev) => ({ ...prev, markdownContent: newValue }))
      })
    }
  }, [])

  function execCmd(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    onRichTextInput()
  }

  function insertCode() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.toString()) {
      const range = sel.getRangeAt(0)
      const code = document.createElement('code')
      code.className = 'bg-slate-100 px-1 py-0.5 rounded text-sm text-rose-600'
      code.textContent = sel.toString()
      range.deleteContents()
      range.insertNode(code)
      onRichTextInput()
    }
  }

  function insertCodeBlock() {
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
      onRichTextInput()
    }
  }

  function toggleTag(tagId: string) {
    setForm((prev) => {
      const current = prev.tagIds || []
      if (current.includes(tagId)) {
        return { ...prev, tagIds: current.filter((id) => id !== tagId) }
      }
      return { ...prev, tagIds: [...current, tagId] }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalForm = form.contentType === 'richtext'
      ? { ...form, richtextContent: editorRef.current?.innerHTML || '' }
      : { ...form }
    onSubmit(finalForm)
  }

  return (
    <Modal open={open} title={isEditing ? '编辑知识条目' : '新建知识条目'} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">标题 <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="请输入标题"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">分类 <span className="text-red-400">*</span></label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          >
            <option value="" disabled>请选择分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">标签</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = (form.tagIds || []).includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'text-white shadow-sm'
                        : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                    }`}
                    style={isSelected ? { backgroundColor: tag.color } : {}}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-slate-700">内容</label>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {modes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    form.contentType === mode.key
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  onClick={() => switchMode(mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {form.contentType === 'html' && (
            <textarea
              value={form.htmlContent}
              onChange={(e) => setForm((prev) => ({ ...prev, htmlContent: e.target.value }))}
              rows={10}
              placeholder="请输入 HTML 内容..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y font-mono"
            />
          )}

          {form.contentType === 'markdown' && (
            <textarea
              ref={mdTextareaRef}
              value={form.markdownContent}
              onChange={(e) => setForm((prev) => ({ ...prev, markdownContent: e.target.value }))}
              onPaste={onMarkdownPaste}
              rows={10}
              placeholder="请输入 Markdown 内容..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y font-mono"
            />
          )}

          {form.contentType === 'richtext' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <div className="flex flex-wrap gap-0.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="粗体" onClick={() => execCmd('bold')}>
                  <Bold size={15} />
                </button>
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="斜体" onClick={() => execCmd('italic')}>
                  <Italic size={15} />
                </button>
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="删除线" onClick={() => execCmd('strikeThrough')}>
                  <Strikethrough size={15} />
                </button>
                <span className="w-px h-6 bg-slate-200 mx-1 self-center" />
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="无序列表" onClick={() => execCmd('insertUnorderedList')}>
                  <List size={15} />
                </button>
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="有序列表" onClick={() => execCmd('insertOrderedList')}>
                  <ListOrdered size={15} />
                </button>
                <span className="w-px h-6 bg-slate-200 mx-1 self-center" />
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="内联代码" onClick={insertCode}>
                  <Code2 size={15} />
                </button>
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="代码块" onClick={insertCodeBlock}>
                  <Terminal size={15} />
                </button>
                <span className="w-px h-6 bg-slate-200 mx-1 self-center" />
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="标题" onClick={() => execCmd('formatBlock', '<h3>')}>
                  <Heading size={15} />
                </button>
                <button type="button" className="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="引用" onClick={() => execCmd('formatBlock', '<blockquote>')}>
                  <Quote size={15} />
                </button>
              </div>
              <div
                ref={editorRef}
                className="px-4 py-3 min-h-[200px] text-sm text-slate-700 outline-none"
                contentEditable
                onInput={onRichTextInput}
                onPaste={onPaste}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!form.title.trim() || !form.categoryId}
            className="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200"
          >
            {isEditing ? '保存修改' : '创建条目'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
