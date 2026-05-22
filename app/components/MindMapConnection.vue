<template>
  <g>
    <defs>
      <marker
        :id="`arrow-${connection.id}`"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
      </marker>
    </defs>
    <path
      :d="pathD"
      fill="none"
      stroke="#cbd5e1"
      stroke-width="2"
      :marker-end="`url(#arrow-${connection.id})`"
      class="transition-all duration-75"
    />
  </g>
</template>

<script setup lang="ts">
import type { MindMapConnection, MindMapNode } from '~/types/mindmap'
import { computed } from 'vue'

const props = defineProps<{
  connection: MindMapConnection
  sourceNode: MindMapNode | undefined
  targetNode: MindMapNode | undefined
}>()

const NODE_RADIUS: Record<string, number> = { topic: 45, concept: 35, operation: 30 }
function getRadius(nodeType: string) { return NODE_RADIUS[nodeType] || 35 }

function edgePoint(node: MindMapNode, towardX: number, towardY: number) {
  const r = getRadius(node.nodeType)
  const dx = towardX - node.x
  const dy = towardY - node.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = node.x + (dx / dist) * r
  const ny = node.y + (dy / dist) * r
  return { x: nx, y: ny }
}

const pathD = computed(() => {
  const s = props.sourceNode
  const t = props.targetNode
  if (!s || !t) return ''
  const start = edgePoint(s, t.x, t.y)
  const end = edgePoint(t, s.x, s.y)
  const midY = (start.y + end.y) / 2
  return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`
})
</script>
