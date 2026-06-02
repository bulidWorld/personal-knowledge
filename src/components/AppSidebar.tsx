'use client'

import type { KnowledgeCategory } from '@/types/knowledge'
import type { MindMapSystem } from '@/types/mindmap'
import {
  Bot, Lightbulb, MessageSquareText, Terminal, Workflow,
  LayoutGrid, BookOpen, Plus, Network,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Bot, Lightbulb, MessageSquareText, Terminal, Workflow,
}

function IconComponent({ name }: { name: string }) {
  const Icon = iconMap[name] ?? LayoutGrid
  return <Icon size={17} />
}

interface AppSidebarProps {
  categories: KnowledgeCategory[]
  selectedCategoryId: string | null
  selectedSystemId: string | null
  totalCount: number
  categoryCounts: Record<string, number>
  systems: MindMapSystem[]
  onSelectCategory: (id: string | null) => void
  onSelectSystem: (id: string | null) => void
  onCreateSystem: () => void
  onCreate: () => void
}

export default function AppSidebar({
  categories, selectedCategoryId, selectedSystemId, totalCount,
  categoryCounts, systems,
  onSelectCategory, onSelectSystem, onCreateSystem, onCreate,
}: AppSidebarProps) {
  const systemCount = systems.length
  const isAllSelected = !selectedCategoryId && !selectedSystemId

  return (
    <aside className="flex flex-col h-full w-[260px] min-w-[260px] bg-white border-r border-slate-200">
      {/* Brand */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-md shadow-blue-200">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">KnowledgeVault</h1>
            <p className="text-xs text-slate-400">个人知识库</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">知识分类</p>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isAllSelected ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
          onClick={() => onSelectCategory(null)}
        >
          <LayoutGrid size={17} />
          <span>全部</span>
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full min-w-[24px] text-center ${
            isAllSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
          }`}>{totalCount}</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedCategoryId === cat.id ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
            onClick={() => onSelectCategory(cat.id)}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${cat.dotColor}`} />
            <IconComponent name={cat.icon} />
            <span className="truncate">{cat.name}</span>
            <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center ${
              selectedCategoryId === cat.id ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
            }`}>{categoryCounts[cat.id] ?? 0}</span>
          </button>
        ))}

        {/* System modeling */}
        <div className="pt-4 mt-2 border-t border-slate-100" />
        <div className="flex items-center gap-0.5">
          <button
            className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedSystemId === '__all__' ? 'bg-teal-50 text-teal-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
            onClick={() => onSelectSystem('__all__')}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm bg-teal-500" />
            <Network size={17} />
            <span className="truncate">系统建模</span>
            <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center ${
              selectedSystemId === '__all__' ? 'bg-teal-200 text-teal-700' : 'bg-slate-100 text-slate-400'
            }`}>{systemCount}</span>
          </button>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200 transition-colors flex-shrink-0"
            title="新增系统"
            onClick={onCreateSystem}
          >
            <Plus size={13} />
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
          onClick={onCreate}
        >
          <Plus size={16} />
          <span>新建条目</span>
        </button>
        <p className="text-xs text-slate-400 text-center mt-3">
          共 <span className="font-semibold text-slate-500">{totalCount}</span> 条知识
        </p>
      </div>
    </aside>
  )
}
