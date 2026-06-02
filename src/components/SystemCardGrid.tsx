'use client'

import type { MindMapSystem } from '@/types/mindmap'
import { Network } from 'lucide-react'
import SystemCard from './SystemCard'

interface SystemCardGridProps {
  systems: MindMapSystem[]
  onSelect: (system: MindMapSystem) => void
  onEdit: (system: MindMapSystem) => void
  onDelete: (system: MindMapSystem) => void
}

export default function SystemCardGrid({ systems, onSelect, onEdit, onDelete }: SystemCardGridProps) {
  if (systems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
          <Network size={28} className="text-slate-300" />
        </div>
        <p className="text-lg font-medium text-slate-500">暂无系统</p>
        <p className="text-sm mt-1 text-slate-400">点击侧边栏 + 创建新系统</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
      {systems.map((system) => (
        <SystemCard
          key={system.id}
          system={system}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
