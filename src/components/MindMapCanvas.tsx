'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { MindMapNode, MindMapConnection, MindMapNodeType } from '@/types/mindmap'
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
  onChangeParent: (nodeId: string, newParentId: string | null) => void
}

const nodeTypeLabels: Record<string, string> = { topic: '主题节点', concept: '概念节点', operation: '操作节点', article: '文章节点' }
const nodeTypeColors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6', article: '#8b5cf6' }
const nodeTypeOrder: MindMapNodeType[] = ['topic', 'concept', 'operation', 'article']

export default function MindMapCanvas({
  nodes, connections,
  onNodeMove, onNodeDblClick, onAddNode, onDeleteNode, onChangeParent,
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

  const [parentPicker, setParentPicker] = useState<{
    visible: boolean; node: MindMapNode | null
  }>({ visible: false, node: null })

  const nodeMap = useMemo(() => {
    const m = new Map<string, MindMapNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  // Collect all descendant IDs of a node (to exclude from parent picker)
  function getDescendantIds(nodeId: string): Set<string> {
    const ids = new Set<string>()
    const stack = [nodeId]
    while (stack.length > 0) {
      const current = stack.pop()!
      for (const n of nodes) {
        if (n.parentId === current && !ids.has(n.id)) {
          ids.add(n.id)
          stack.push(n.id)
        }
      }
    }
    return ids
  }

  // Parent picker — candidate nodes grouped by type, excluding self + descendants
  const parentCandidates = useMemo(() => {
    if (!parentPicker.node) return { topic: [], concept: [], operation: [], article: [] }
    const excludeIds = getDescendantIds(parentPicker.node.id)
    excludeIds.add(parentPicker.node.id)
    const groups: Record<string, MindMapNode[]> = { topic: [], concept: [], operation: [], article: [] }
    for (const n of nodes) {
      if (!excludeIds.has(n.id) && groups[n.nodeType]) {
        groups[n.nodeType].push(n)
      }
    }
    return groups
  }, [parentPicker.node, nodes])

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
      case 'add-article':
        onAddNode('article', node.x + 160, node.y, node.id)
        break
      case 'change-parent':
        setContextMenu((prev) => ({ ...prev, visible: false }))
        setParentPicker({ visible: true, node })
        return // don't close context menu again below
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

      {/* Parent picker modal */}
      {parentPicker.visible && parentPicker.node && createPortal(
        <>
          <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm" onClick={() => setParentPicker({ visible: false, node: null })} />
          <div className="fixed inset-0 z-[111] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800">
                  选择父节点 — <span className="text-slate-500 font-normal truncate max-w-[180px] inline-block align-bottom">{parentPicker.node.title}</span>
                </h3>
                <button
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                  onClick={() => setParentPicker({ visible: false, node: null })}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-3">
                {/* Set as root option */}
                <button
                  className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors ${
                    !parentPicker.node.parentId
                      ? 'border-teal-300 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => { onChangeParent(parentPicker.node!.id, null); setParentPicker({ visible: false, node: null }) }}
                >
                  <span className="text-sm font-medium">无父节点（设为根节点）</span>
                </button>

                {/* Grouped candidates */}
                {nodeTypeOrder.map((type) => {
                  const groupNodes = parentCandidates[type]
                  if (!groupNodes || groupNodes.length === 0) return null
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: nodeTypeColors[type] }} />
                        <span className="text-xs font-medium text-slate-400">{nodeTypeLabels[type]}</span>
                        <span className="text-xs text-slate-300">({groupNodes.length})</span>
                      </div>
                      <div className="space-y-1">
                        {groupNodes.map((n) => (
                          <button
                            key={n.id}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                              n.id === parentPicker.node?.parentId
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                            }`}
                            onClick={() => { onChangeParent(parentPicker.node!.id, n.id); setParentPicker({ visible: false, node: null }) }}
                          >
                            {n.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {nodeTypeOrder.every(t => !parentCandidates[t] || parentCandidates[t].length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">没有可选的父节点</p>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
