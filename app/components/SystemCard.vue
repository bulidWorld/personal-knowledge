<template>
  <article
    class="group relative rounded-2xl bg-white border border-teal-200/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-teal-200/30 hover:-translate-y-0.5 cursor-pointer"
    @click="$emit('click', system)"
    @dblclick="emit('click', system)"
  >
    <div :class="['absolute top-0 left-0 w-full h-1', system.gradient]" />
    <div class="p-6 pt-5">
      <div class="flex items-center gap-3 mb-3">
        <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', system.dotColor, 'text-white']">
          <Network :size="16" />
        </div>
        <h3 class="text-lg font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
          {{ system.name }}
        </h3>
      </div>
      <p class="text-slate-500 text-sm leading-relaxed mb-3">{{ system.description || '暂无描述' }}</p>
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span>{{ system.nodeCount ?? 0 }} 个节点</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { MindMapSystem } from '~/types/mindmap'
import { Network } from 'lucide-vue-next'

defineProps<{ system: MindMapSystem }>()
const emit = defineEmits<{ click: [system: MindMapSystem] }>()
</script>
