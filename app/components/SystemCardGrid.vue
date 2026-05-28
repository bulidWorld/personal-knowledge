<template>
  <div>
    <div v-if="systems.length > 0" class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));">
      <SystemCard
        v-for="system in systems"
        :key="system.id"
        :system="system"
        @dblclick="$emit('select', system)"
        @edit="$emit('edit', system)"
        @delete="$emit('delete', system)"
      />
    </div>
    <div v-else class="flex flex-col items-center justify-center py-24 text-slate-400">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
        <Network :size="28" class="text-slate-300" />
      </div>
      <p class="text-lg font-medium text-slate-500">暂无系统</p>
      <p class="text-sm mt-1 text-slate-400">点击侧边栏 + 创建新系统</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MindMapSystem } from '~/types/mindmap'
import { Network } from 'lucide-vue-next'
import SystemCard from './SystemCard.vue'

defineProps<{ systems: MindMapSystem[] }>()
defineEmits<{
  select: [system: MindMapSystem]
  edit: [system: MindMapSystem]
  delete: [system: MindMapSystem]
}>()
</script>
