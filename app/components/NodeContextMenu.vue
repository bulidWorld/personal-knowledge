<template>
  <Teleport to="body">
    <div
      class="fixed z-[100] bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 py-1.5 min-w-[160px]"
      :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
      @click.stop
    >
      <button class="menu-item" @click="$emit('action', 'edit')">
        <Pencil :size="13" /><span>编辑节点</span>
      </button>
      <div class="h-px bg-slate-100 my-1 mx-2" />
      <button class="menu-item" @click="$emit('action', 'add-topic')">
        <Plus :size="13" /><span>新增子主题</span>
      </button>
      <button v-if="nodeType === 'topic'" class="menu-item" @click="$emit('action', 'add-concept')">
        <Plus :size="13" /><span>新增概念</span>
      </button>
      <button v-if="nodeType === 'concept'" class="menu-item" @click="$emit('action', 'add-operation')">
        <Plus :size="13" /><span>新增操作</span>
      </button>
      <div class="h-px bg-slate-100 my-1 mx-2" />
      <button class="menu-item text-red-500 hover:bg-red-50" @click="$emit('action', 'delete')">
        <Trash2 :size="13" /><span>删除节点</span>
      </button>
    </div>
    <!-- Backdrop to close -->
    <div class="fixed inset-0 z-[99]" @click="$emit('close')" @contextmenu.prevent="$emit('close')" />
  </Teleport>
</template>

<script setup lang="ts">
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  nodeType?: string
}>()

defineEmits<{ action: [action: string]; close: [] }>()

const adjustedX = computed(() => Math.min(props.x, window.innerWidth - 180))
const adjustedY = computed(() => Math.min(props.y, window.innerHeight - 240))
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  font-size: 13px;
  color: #475569;
  transition: all 0.15s;
}
.menu-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}
</style>
