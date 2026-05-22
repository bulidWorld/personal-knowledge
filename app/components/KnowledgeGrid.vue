<template>
  <div>
    <div
      v-if="entries.length > 0"
      class="grid gap-5" style="grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));"
    >
      <KnowledgeCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :entry-gradient="getGradient(entry)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @dblclick="$emit('dblclick', $event)"
      />
    </div>

    <div v-else class="flex flex-col items-center justify-center py-24 text-slate-400">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
        <SearchIcon :size="28" class="text-slate-300" />
      </div>
      <p class="text-lg font-medium text-slate-500">暂无条目</p>
      <p class="text-sm mt-1 text-slate-400">尝试切换分类或创建新条目</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KnowledgeEntry } from '~/types/knowledge'
import { Search as SearchIcon } from 'lucide-vue-next'
import KnowledgeCard from './KnowledgeCard.vue'

defineProps<{
  entries: KnowledgeEntry[]
}>()

defineEmits<{
  edit: [entry: KnowledgeEntry]
  delete: [entry: KnowledgeEntry]
  dblclick: [entry: KnowledgeEntry]
}>()

function getGradient(entry: KnowledgeEntry): string {
  return entry.gradient ?? 'bg-gradient-to-r from-slate-400 to-slate-500'
}
</script>
