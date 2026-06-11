'use client'

import type { KnowledgeEntry } from '@/types/knowledge'
import { Search as SearchIcon } from 'lucide-react'
import KnowledgeCard from './KnowledgeCard'

interface KnowledgeGridProps {
  entries: KnowledgeEntry[]
  onEdit: (entry: KnowledgeEntry) => void
  onDelete: (entry: KnowledgeEntry) => void
  onClick: (entry: KnowledgeEntry) => void
  onDblClick: (entry: KnowledgeEntry) => void
}

function getGradient(entry: KnowledgeEntry): string {
  return entry.gradient ?? 'bg-gradient-to-r from-slate-400 to-slate-500'
}

export default function KnowledgeGrid({ entries, onEdit, onDelete, onClick, onDblClick }: KnowledgeGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
          <SearchIcon size={28} className="text-slate-300" />
        </div>
        <p className="text-lg font-medium text-slate-500">暂无条目</p>
        <p className="text-sm mt-1 text-slate-400">尝试切换分类或创建新条目</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
      {entries.map((entry) => (
        <KnowledgeCard
          key={entry.id}
          entry={entry}
          entryGradient={getGradient(entry)}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onClick}
          onDblClick={onDblClick}
        />
      ))}
    </div>
  )
}
