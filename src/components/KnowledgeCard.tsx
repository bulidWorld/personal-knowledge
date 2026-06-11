'use client'

import type { KnowledgeEntry } from '@/types/knowledge'
import { renderContent } from '@/lib/content-render'
import { Pencil, Trash2 } from 'lucide-react'
import IframeEmbed from './IframeEmbed'

interface KnowledgeCardProps {
  entry: KnowledgeEntry
  entryGradient: string
  onEdit: (entry: KnowledgeEntry) => void
  onDelete: (entry: KnowledgeEntry) => void
  onDblClick: (entry: KnowledgeEntry) => void
}

export default function KnowledgeCard({ entry, entryGradient, onEdit, onDelete, onDblClick }: KnowledgeCardProps) {
  const renderedContent = renderContent(entry)

  return (
    <article
      className="group relative rounded-2xl bg-white border border-slate-200/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 cursor-pointer"
      onDoubleClick={() => onDblClick(entry)}
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${entryGradient}`} />

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
          title="编辑"
          onClick={() => onEdit(entry)}
        >
          <Pencil size={14} />
        </button>
        <button
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          title="删除"
          onClick={() => onDelete(entry)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-6 pt-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-3 leading-snug pr-16 group-hover:text-slate-900 transition-colors">
          {entry.title}
        </h3>

        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entry.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: tag.color + '18',
                  color: tag.color,
                  border: `1px solid ${tag.color}33`,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="relative max-h-64 overflow-hidden">
          <div className="knowledge-content text-slate-500 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderedContent }} />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>

        <div className="text-xs text-slate-300 mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          双击查看详情
        </div>

        {entry.iframeUrl && <IframeEmbed src={entry.iframeUrl} />}

        {entry.imageUrl && !entry.iframeUrl && (
          <img
            src={entry.imageUrl}
            alt={entry.title}
            className="w-full rounded-lg mt-3"
            loading="lazy"
          />
        )}
      </div>
    </article>
  )
}
