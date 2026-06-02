'use client'

import { useMemo } from 'react'
import type { MindMapConnection, MindMapNode } from '@/types/mindmap'

const NODE_DIMS: Record<string, { rx: number; ry: number }> = {
  topic: { rx: 45, ry: 45 },
  concept: { rx: 35, ry: 35 },
  operation: { rx: 60, ry: 28 },
}
function getDims(nodeType: string) { return NODE_DIMS[nodeType] || { rx: 35, ry: 35 } }

interface EdgeResult {
  x: number; y: number
  nx: number; ny: number // unit outward normal (perpendicular to tangent)
}

interface ArrowResult {
  pathD: string
  arrowPoints: string
}

function edgePoint(node: MindMapNode, towardX: number, towardY: number): EdgeResult {
  const { rx, ry } = getDims(node.nodeType)
  const dx = towardX - node.x
  const dy = towardY - node.y
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y, nx: 1, ny: 0 }

  // Scale direction vector by ellipse radii to find boundary intersection
  const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)) || 1
  const ex = node.x + dx * t
  const ey = node.y + dy * t
  // Outward normal: gradient of implicit ellipse x²/rx² + y²/ry² = 1
  const relX = ex - node.x
  const relY = ey - node.y
  const nx = relX / (rx * rx)
  const ny = relY / (ry * ry)
  const nLen = Math.sqrt(nx * nx + ny * ny) || 1
  return { x: ex, y: ey, nx: nx / nLen, ny: ny / nLen }
}

function arrowHeadPoints(tipX: number, tipY: number, dirX: number, dirY: number) {
  const length = 10
  const width = 8
  const baseX = tipX - dirX * length
  const baseY = tipY - dirY * length
  const perpX = -dirY
  const perpY = dirX

  return [
    `${tipX},${tipY}`,
    `${baseX + perpX * (width / 2)},${baseY + perpY * (width / 2)}`,
    `${baseX - perpX * (width / 2)},${baseY - perpY * (width / 2)}`,
  ].join(' ')
}

interface MindMapConnectionProps {
  connection: MindMapConnection
  sourceNode: MindMapNode | undefined
  targetNode: MindMapNode | undefined
}

export default function MindMapConnectionComp({ sourceNode, targetNode }: MindMapConnectionProps) {
  const edge = useMemo<ArrowResult>(() => {
    if (!sourceNode || !targetNode) return { pathD: '', arrowPoints: '' }
    const start = edgePoint(sourceNode, targetNode.x, targetNode.y)
    const end = edgePoint(targetNode, sourceNode.x, sourceNode.y)
    const dist = Math.hypot(end.x - start.x, end.y - start.y)
    const offset = Math.max(dist * 0.4, 40)
    // Control points extend along normals so the curve exits/enters perpendicular to the node boundary
    const cp1x = start.x + start.nx * offset
    const cp1y = start.y + start.ny * offset
    const cp2x = end.x + end.nx * offset
    const cp2y = end.y + end.ny * offset
    const arrowDirX = -end.nx
    const arrowDirY = -end.ny

    return {
      pathD: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
      arrowPoints: arrowHeadPoints(end.x, end.y, arrowDirX, arrowDirY),
    }
  }, [sourceNode, targetNode])

  return (
    <g>
      <path
        d={edge.pathD}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={2}
        className="transition-all duration-75 pointer-events-none"
      />
      <polygon
        points={edge.arrowPoints}
        fill="#94a3b8"
        className="transition-all duration-75 pointer-events-none"
      />
    </g>
  )
}
