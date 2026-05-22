<template>
  <g
    :class="['cursor-pointer select-none', dragging ? 'cursor-grabbing' : 'cursor-grab']"
    @mousedown.stop="onDragStart"
    @dblclick.stop="$emit('dblclick', node)"
    @contextmenu.prevent.stop="onContextMenu"
  >
    <!-- Topic: circle, Concept: circle, Operation: ellipse -->
    <ellipse
      v-if="node.nodeType === 'operation'"
      :cx="node.x" :cy="node.y"
      :rx="60" :ry="28"
      :fill="fillColor"
      :stroke="selected ? '#334155' : 'transparent'"
      :stroke-width="selected ? 2.5 : 0"
      stroke-dasharray="6 2"
      class="transition-colors"
    />
    <circle
      v-else
      :cx="node.x" :cy="node.y"
      :r="node.nodeType === 'topic' ? 45 : 35"
      :fill="fillColor"
      :stroke="selected ? '#334155' : 'transparent'"
      :stroke-width="selected ? 2.5 : 0"
      class="transition-colors"
    />
    <text
      :x="node.x" :y="node.y"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="textColor"
      font-size="12"
      font-weight="600"
      class="pointer-events-none"
    >
      <tspan v-if="node.title.length <= 8" :x="node.x" dy="0">{{ node.title }}</tspan>
      <template v-else>
        <tspan :x="node.x" dy="-0.4em">{{ node.title.slice(0, 6) }}</tspan>
        <tspan :x="node.x" dy="1.2em">{{ node.title.slice(6, 12) }}</tspan>
      </template>
    </text>
    <!-- Hover ring -->
    <circle
      v-if="node.nodeType !== 'operation'"
      :cx="node.x" :cy="node.y"
      :r="node.nodeType === 'topic' ? 45 : 35"
      fill="none"
      stroke="white"
      stroke-width="1.5"
      opacity="0"
      class="group-hover:opacity-40 transition-opacity"
    />
  </g>
</template>

<script setup lang="ts">
import type { MindMapNode } from '~/types/mindmap'
import { computed } from 'vue'

const props = defineProps<{
  node: MindMapNode
  selected: boolean
}>()

const emit = defineEmits<{
  'update-position': [id: string, x: number, y: number]
  'dblclick': [node: MindMapNode]
  'contextmenu': [node: MindMapNode, event: MouseEvent]
  'select': [id: string]
}>()

const fillColor = computed(() => props.node.color || defaultColors[props.node.nodeType] || '#94a3b8')
const textColor = computed(() => props.node.nodeType === 'topic' ? '#ffffff' : '#1e293b')
const defaultColors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6' }

const dragging = ref(false)
let dragOffsetX = 0
let dragOffsetY = 0

function onDragStart(e: MouseEvent) {
  emit('select', props.node.id)
  dragging.value = true
  const svg = (e.target as SVGElement).closest('svg')!
  const pt = svg.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  const ctm = svg.getScreenCTM()!.inverse()
  const svgPt = pt.matrixTransform(ctm)
  dragOffsetX = props.node.x - svgPt.x
  dragOffsetY = props.node.y - svgPt.y

  const onMove = (ev: MouseEvent) => {
    if (!dragging.value) return
    const p2 = svg.createSVGPoint()
    p2.x = ev.clientX; p2.y = ev.clientY
    const sp = p2.matrixTransform(ctm)
    emit('update-position', props.node.id, sp.x + dragOffsetX, sp.y + dragOffsetY)
  }
  const onUp = () => {
    dragging.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onContextMenu(e: MouseEvent) {
  emit('select', props.node.id)
  emit('contextmenu', props.node, e)
}
</script>
