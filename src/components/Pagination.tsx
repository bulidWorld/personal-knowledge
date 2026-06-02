'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const visiblePages = useMemo(() => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    pages.push(1)
    if (page > 3) pages.push('...')

    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)

    for (let i = start; i <= end; i++) pages.push(i)

    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)

    return pages
  }, [page, totalPages])

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        disabled={page <= 1}
        className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>

      {visiblePages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-slate-400 text-sm">...</span>
        ) : (
          <button
            key={p}
            className={
              p === page
                ? 'min-w-[36px] h-9 px-2 text-sm rounded-lg border bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200 transition-all'
                : 'min-w-[36px] h-9 px-2 text-sm rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-all'
            }
            onClick={() => onPageChange(p as number)}
          >
            {p}
          </button>
        )
      )}

      <button
        disabled={page >= totalPages}
        className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
