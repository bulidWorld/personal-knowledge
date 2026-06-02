'use client'

import { useState, useRef } from 'react'
import type { MindMapNode as MindMapNodeType } from '@/types/mindmap'

const defaultColors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6' }

interface MindMapNodeProps {
  node: MindMapNodeType
  selected: boolean
  onUpdatePosition: (id: string, x: number, y: number) => void
  onDblClick: (node: MindMapNodeType) => void
  onContextMenu: (node: MindMapNodeType, event: MouseEvent) => void
  onSelect: (id: string) => void
  spaceHeld: boolean
}

export default function MindMapNodeComp({
  node, selected,
  onUpdatePosition, onDblClick, onContextMenu, onSelect, spaceHeld,
}: MindMapNodeProps) {
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const fillColor = node.color || defaultColors[node.nodeType] || '#94a3b8'
  const textColor = node.nodeType === 'topic' ? '#ffffff' : '#1e293b'

  function onDragStart(e: React.MouseEvent) {
    // Don't start dragging if spacebar is held (canvas pan mode)
    if (spaceHeld) return
    e.stopPropagation()
    onSelect(node.id)
    setDragging(true)
    const svg = (e.target as SVGElement).closest('svg')!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()!.inverse()
    const svgPt = pt.matrixTransform(ctm)
    dragOffset.current = { x: node.x - svgPt.x, y: node.y - svgPt.y }

    let rafId: number | null = null
    let latestPos: [number, number] | null = null

    function flush() {
      if (latestPos) {
        onUpdatePosition(node.id, latestPos[0], latestPos[1])
        latestPos = null
      }
    }

    function onMove(ev: MouseEvent) {
      const p2 = svg.createSVGPoint()
      p2.x = ev.clientX; p2.y = ev.clientY
      const sp = p2.matrixTransform(ctm)
      latestPos = [sp.x + dragOffset.current.x, sp.y + dragOffset.current.y]
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          flush()
          rafId = null
        })
      }
    }
    function onUp() {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      flush() // final flush
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleContextMenu(e: React.MouseEvent) {
    onSelect(node.id)
    onContextMenu(node, e.nativeEvent)
  }

  return (
    <g
      className={`select-none ${spaceHeld ? 'cursor-grab' : dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
      onMouseDown={onDragStart}
      onDoubleClick={(e) => { e.stopPropagation(); onDblClick(node) }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); handleContextMenu(e) }}
    >
      {node.nodeType === 'operation' ? (
        <ellipse
          cx={node.x} cy={node.y}
          rx={60} ry={28}
          fill={fillColor}
          stroke={selected ? '#334155' : 'transparent'}
          strokeWidth={selected ? 2.5 : 0}
          strokeDasharray={selected ? '6 2' : undefined}
          className="transition-colors"
        />
      ) : (
        <circle
          cx={node.x} cy={node.y}
          r={node.nodeType === 'topic' ? 45 : 35}
          fill={fillColor}
          stroke={selected ? '#334155' : 'transparent'}
          strokeWidth={selected ? 2.5 : 0}
          className="transition-colors"
        />
      )}
      <text
        x={node.x} y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={12}
        fontWeight={600}
        className="pointer-events-none"
      >
        {node.title.length <= 8 ? (
          <tspan x={node.x} dy={0}>{node.title}</tspan>
        ) : (
          <>
            <tspan x={node.x} dy="-0.4em">{node.title.slice(0, 6)}</tspan>
            <tspan x={node.x} dy="1.2em">{node.title.slice(6, 12)}</tspan>
          </>
        )}
      </text>
      {node.nodeType !== 'operation' && (
        <circle
          cx={node.x} cy={node.y}
          r={node.nodeType === 'topic' ? 45 : 35}
          fill="none"
          stroke="white"
          strokeWidth={1.5}
          opacity={0}
          className="group-hover:opacity-40 transition-opacity"
        />
      )}
    </g>
  )
}
