'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
          transition: 'transform 0.2s ease',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
