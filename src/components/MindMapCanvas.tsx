'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import type { MindMapNode, MindMapConnection } from '@/types/mindmap'
import MindMapNodeComp from './MindMapNode'
import MindMapConnectionComp from './MindMapConnection'
import NodeContextMenu from './NodeContextMenu'

interface MindMapCanvasProps {
  nodes: MindMapNode[]
  connections: MindMapConnection[]
  onNodeMove: (id: string, x: number, y: number) => void
  onNodeDblClick: (node: MindMapNode) => void
  onAddNode: (type: string, x: number, y: number, parentId: string | null) => void
  onDeleteNode: (id: string) => void
}

export default function MindMapCanvas({
  nodes, connections,
  onNodeMove, onNodeDblClick, onAddNode, onDeleteNode,
}: MindMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 })

  const [spaceHeld, setSpaceHeld] = useState(false)
  const panning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 })

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; node: MindMapNode | null
  }>({ visible: false, x: 0, y: 0, node: null })

  const nodeMap = useMemo(() => {
    const m = new Map<string, MindMapNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  // Spacebar tracking for canvas pan mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpaceHeld(true)
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        setSpaceHeld(false)
        panning.current = false
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  function svgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const scale = e.deltaY < 0 ? 0.9 : 1.1
    const pt = svgPoint(e.clientX, e.clientY)
    setViewBox((prev) => ({
      w: prev.w * scale,
      h: prev.h * scale,
      x: pt.x - (pt.x - prev.x) * scale,
      y: pt.y - (pt.y - prev.y) * scale,
    }))
  }

  function onPanStart(e: React.MouseEvent) {
    // Only pan when spacebar is held (left click) or middle mouse button
    if (!spaceHeld && e.button !== 1) return
    if (e.button === 1 || e.button === 0) {
      panning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, vbX: viewBox.x, vbY: viewBox.y }
    }
  }

  function onPanMove(e: React.MouseEvent) {
    if (!panning.current) return
    const pt = svgPoint(e.clientX, e.clientY)
    const startPt = svgPoint(panStart.current.x, panStart.current.y)
    const dx = startPt.x - pt.x
    const dy = startPt.y - pt.y
    setViewBox((prev) => ({ ...prev, x: panStart.current.vbX + dx, y: panStart.current.vbY + dy }))
  }

  function onPanEnd() {
    panning.current = false
  }

  function onCanvasDblClick(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return
    const pt = svgPoint(e.clientX, e.clientY)
    onAddNode('topic', pt.x, pt.y, null)
  }

  function onNodeContextMenu(node: MindMapNode, event: MouseEvent) {
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, node })
  }

  function onContextAction(action: string) {
    const node = contextMenu.node
    if (!node) return
    switch (action) {
      case 'edit':
        onNodeDblClick(node)
        break
      case 'add-topic':
        onAddNode('topic', node.x + 160, node.y, node.id)
        break
      case 'add-concept':
        onAddNode('concept', node.x + 160, node.y, node.id)
        break
      case 'add-operation':
        onAddNode('operation', node.x + 160, node.y, node.id)
        break
      case 'delete':
        onDeleteNode(node.id)
        break
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 rounded-2xl">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className={`w-full h-full ${spaceHeld ? 'cursor-grab' : ''} ${panning.current ? 'cursor-grabbing' : ''}`}
        onMouseDown={onPanStart}
        onMouseMove={onPanMove}
        onMouseUp={onPanEnd}
        onWheel={onWheel}
        onDoubleClick={onCanvasDblClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="smallGrid" width={40} height={40} patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth={0.5} />
          </pattern>
          <pattern id="grid" width={200} height={200} patternUnits="userSpaceOnUse">
            <rect width={200} height={200} fill="url(#smallGrid)" />
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#cbd5e1" strokeWidth={1} />
          </pattern>
        </defs>
        <rect width={4000} height={4000} fill="url(#grid)" />

        {connections.map((conn) => (
          <MindMapConnectionComp
            key={conn.id}
            connection={conn}
            sourceNode={nodeMap.get(conn.sourceNodeId)}
            targetNode={nodeMap.get(conn.targetNodeId)}
          />
        ))}

        {nodes.map((node) => (
          <MindMapNodeComp
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onUpdatePosition={onNodeMove}
            onDblClick={onNodeDblClick}
            onContextMenu={onNodeContextMenu}
            onSelect={setSelectedNodeId}
            spaceHeld={spaceHeld}
          />
        ))}
      </svg>

      {contextMenu.visible && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType={contextMenu.node?.nodeType}
          onAction={onContextAction}
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  )
}
