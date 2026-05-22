<template>
  <div class="w-full h-full relative overflow-hidden bg-slate-100 rounded-2xl" ref="containerRef">
    <svg
      ref="svgRef"
      :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`"
      class="w-full h-full"
      @mousedown="onPanStart"
      @mousemove="onPanMove"
      @mouseup="onPanEnd"
      @wheel.prevent="onWheel"
      @dblclick.self="onCanvasDblClick"
      @contextmenu.prevent
    >
      <!-- Grid background -->
      <defs>
        <pattern id="smallGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
        <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="url(#smallGrid)" />
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#cbd5e1" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="4000" height="4000" fill="url(#grid)" />

      <!-- Connections -->
      <MindMapConnectionComp
        v-for="conn in connections"
        :key="conn.id"
        :connection="conn"
        :source-node="nodeMap.get(conn.sourceNodeId)"
        :target-node="nodeMap.get(conn.targetNodeId)"
      />

      <!-- Nodes -->
      <MindMapNodeComp
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        :selected="selectedNodeId === node.id"
        @update-position="onNodeMove"
        @dblclick="$emit('node-dblclick', node)"
        @contextmenu="onNodeContextMenu"
        @select="selectedNodeId = $event"
      />
    </svg>

    <!-- Context menu (positioned absolutely over the SVG) -->
    <NodeContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :node-type="contextMenu.node?.nodeType"
      @action="onContextAction"
      @close="contextMenu.visible = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { MindMapNode, MindMapConnection } from '~/types/mindmap'
import MindMapNodeComp from './MindMapNode.vue'
import MindMapConnectionComp from './MindMapConnection.vue'
import NodeContextMenu from './NodeContextMenu.vue'

const props = defineProps<{
  nodes: MindMapNode[]
  connections: MindMapConnection[]
  systemId: string
}>()

const emit = defineEmits<{
  'node-move': [id: string, x: number, y: number]
  'node-dblclick': [node: MindMapNode]
  'add-node': [type: string, x: number, y: number, parentId: string | null]
  'delete-node': [id: string]
  'connect-nodes': [sourceId: string, targetId: string]
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const selectedNodeId = ref<string | null>(null)

const viewBox = reactive({ x: 0, y: 0, w: 1200, h: 800 })

// Pan state
const panning = ref(false)
let panStartX = 0; let panStartY = 0
let panStartVBX = 0; let panStartVBY = 0

// Node map for O(1) lookups
const nodeMap = computed(() => {
  const m = new Map<string, MindMapNode>()
  for (const n of props.nodes) m.set(n.id, n)
  return m
})

function svgPoint(clientX: number, clientY: number) {
  const svg = svgRef.value!
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  return pt.matrixTransform(svg.getScreenCTM()!.inverse())
}

function onWheel(e: WheelEvent) {
  const scale = e.deltaY < 0 ? 0.9 : 1.1
  const pt = svgPoint(e.clientX, e.clientY)
  viewBox.w *= scale
  viewBox.h *= scale
  viewBox.x = pt.x - (pt.x - viewBox.x) * scale
  viewBox.y = pt.y - (pt.y - viewBox.y) * scale
}

function onPanStart(e: MouseEvent) {
  if (e.target !== svgRef.value) return // only pan on SVG background, not on nodes
  // Left button or middle button
  if (e.button === 1 || e.button === 0) {
    panning.value = true
    panStartX = e.clientX; panStartY = e.clientY
    panStartVBX = viewBox.x; panStartVBY = viewBox.y
  }
}

function onPanMove(e: MouseEvent) {
  if (!panning.value) return
  const pt = svgPoint(e.clientX, e.clientY)
  const startPt = svgPoint(panStartX, panStartY)
  const dx = startPt.x - pt.x
  const dy = startPt.y - pt.y
  viewBox.x = panStartVBX + dx
  viewBox.y = panStartVBY + dy
}

function onPanEnd() {
  panning.value = false
}

function onCanvasDblClick(e: MouseEvent) {
  const pt = svgPoint(e.clientX, e.clientY)
  emit('add-node', 'topic', pt.x, pt.y, null)
}

function onNodeMove(id: string, x: number, y: number) {
  emit('node-move', id, x, y)
}

// Context menu
const contextMenu = reactive<{
  visible: boolean; x: number; y: number; node: MindMapNode | null
}>({ visible: false, x: 0, y: 0, node: null })

function onNodeContextMenu(node: MindMapNode, event: MouseEvent) {
  contextMenu.visible = true
  contextMenu.node = node
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

function onContextAction(action: string) {
  const node = contextMenu.node
  if (!node) return
  switch (action) {
    case 'edit':
      emit('node-dblclick', node)
      break
    case 'add-topic':
      emit('add-node', 'topic', node.x + 160, node.y, node.id)
      break
    case 'add-concept':
      emit('add-node', 'concept', node.x + 160, node.y, node.id)
      break
    case 'add-operation':
      emit('add-node', 'operation', node.x + 160, node.y, node.id)
      break
    case 'delete':
      emit('delete-node', node.id)
      break
  }
  contextMenu.visible = false
}
</script>
