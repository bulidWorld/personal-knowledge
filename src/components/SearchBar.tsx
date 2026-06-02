'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [immediateValue, setImmediateValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes
  useEffect(() => {
    setImmediateValue(value)
  }, [value])

  const emitChange = useCallback((val: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(val)
    }, 300)
  }, [onChange])

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const val = (e.target as HTMLInputElement).value
    setImmediateValue(val)
    emitChange(val)
  }

  function handleClear() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setImmediateValue('')
    onChange('')
  }

  return (
    <div className="relative">
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={immediateValue}
        placeholder="搜索知识条目..."
        className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        onInput={handleInput}
      />
      {immediateValue && (
        <button
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          onClick={handleClear}
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
