'use client'

import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'

interface NodeContextMenuProps {
  x: number
  y: number
  nodeType?: string
  onAction: (action: string) => void
  onClose: () => void
}

export default function NodeContextMenu({ x, y, nodeType, onAction, onClose }: NodeContextMenuProps) {
  const adjustedX = useMemo(() => Math.min(x, window.innerWidth - 180), [x])
  const adjustedY = useMemo(() => Math.min(y, window.innerHeight - 240), [y])

  return createPortal(
    <>
      <div
        className="fixed z-[100] bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 py-1.5 min-w-[160px]"
        style={{ left: adjustedX, top: adjustedY }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="menu-item" onClick={() => onAction('edit')}>
          <Pencil size={13} /><span>编辑节点</span>
        </button>
        <div className="h-px bg-slate-100 my-1 mx-2" />
        <button className="menu-item" onClick={() => onAction('add-topic')}>
          <Plus size={13} /><span>新增子主题</span>
        </button>
        {nodeType === 'topic' && (
          <button className="menu-item" onClick={() => onAction('add-concept')}>
            <Plus size={13} /><span>新增概念</span>
          </button>
        )}
        {nodeType === 'concept' && (
          <>
            <button className="menu-item" onClick={() => onAction('add-operation')}>
              <Plus size={13} /><span>新增操作</span>
            </button>
            <button className="menu-item" onClick={() => onAction('add-article')}>
              <Plus size={13} /><span>新增文章</span>
            </button>
          </>
        )}
        <div className="h-px bg-slate-100 my-1 mx-2" />
        <button className="menu-item text-red-500 hover:bg-red-50" onClick={() => onAction('delete')}>
          <Trash2 size={13} /><span>删除节点</span>
        </button>
      </div>
      <div className="fixed inset-0 z-[99]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
    </>,
    document.body
  )
}
