<template>
  <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 mt-8">
    <button
      :disabled="page <= 1"
      class="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      @click="$emit('change', page - 1)"
    >
      <ChevronLeft :size="16" />
    </button>

    <template v-for="p in visiblePages" :key="p">
      <span v-if="p === '...'" class="px-2 text-slate-400 text-sm">...</span>
      <button
        v-else
        :class="[
          'min-w-[36px] h-9 px-2 text-sm rounded-lg border transition-all',
          p === page
            ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
        ]"
        @click="$emit('change', p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      :disabled="page >= totalPages"
      class="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      @click="$emit('change', page + 1)"
    >
      <ChevronRight :size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  totalPages: number
}>()

defineEmits<{ change: [page: number] }>()

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = props.totalPages
  const current = props.page

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  pages.push(1)
  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')
  pages.push(total)

  return pages
})
</script>
