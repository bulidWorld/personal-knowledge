'use client'

import type { MindMapSystem } from '@/types/mindmap'
import { Network, Pencil, Trash2 } from 'lucide-react'

interface SystemCardProps {
  system: MindMapSystem
  onSelect: (system: MindMapSystem) => void
  onEdit: (system: MindMapSystem) => void
  onDelete: (system: MindMapSystem) => void
}

export default function SystemCard({ system, onSelect, onEdit, onDelete }: SystemCardProps) {
  return (
    <article
      className="group relative rounded-2xl bg-white border border-teal-200/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-teal-200/30 hover:-translate-y-0.5 cursor-pointer"
      onDoubleClick={() => onSelect(system)}
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${system.gradient}`} />

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-teal-500 hover:border-teal-200 hover:bg-teal-50 transition-colors shadow-sm"
          title="编辑"
          onClick={() => onEdit(system)}
        >
          <Pencil size={14} />
        </button>
        <button
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          title="删除"
          onClick={() => onDelete(system)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-6 pt-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${system.dotColor} text-white`}>
            <Network size={16} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 pr-16 group-hover:text-slate-900 transition-colors">
            {system.name}
          </h3>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mb-3">{system.description || '暂无描述'}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{system.nodeCount ?? 0} 个节点</span>
        </div>
        <div className="text-xs text-slate-300 mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          双击进入画布
        </div>
      </div>
    </article>
  )
}
