<template>
  <article
    :class="[
      'group relative rounded-2xl bg-white border border-slate-200/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 cursor-pointer',
    ]"
    @dblclick="$emit('dblclick', entry)"
  >
    <div :class="['absolute top-0 left-0 w-full h-1', entryGradient]" />

    <!-- Action buttons -->
    <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        class="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
        title="编辑"
        @click="$emit('edit', entry)"
      >
        <Pencil :size="14" />
      </button>
      <button
        class="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
        title="删除"
        @click="$emit('delete', entry)"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <div class="p-6 pt-5">
      <h3 class="text-lg font-semibold text-slate-800 mb-3 leading-snug pr-16 group-hover:text-slate-900 transition-colors">
        {{ entry.title }}
      </h3>

      <div class="relative max-h-64 overflow-hidden">
        <div class="knowledge-content text-slate-500 text-sm leading-relaxed" v-html="renderedContent" />
        <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>

      <div class="text-xs text-slate-300 mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
        双击查看详情
      </div>

      <IframeEmbed v-if="entry.iframeUrl" :src="entry.iframeUrl" />

      <img
        v-if="entry.imageUrl && !entry.iframeUrl"
        :src="entry.imageUrl"
        :alt="entry.title"
        class="w-full rounded-lg mt-3"
        loading="lazy"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { KnowledgeEntry } from '~/types/knowledge'
import { Pencil, Trash2 } from 'lucide-vue-next'
import IframeEmbed from './IframeEmbed.vue'

const props = defineProps<{
  entry: KnowledgeEntry
  entryGradient: string
}>()

defineEmits<{
  edit: [entry: KnowledgeEntry]
  delete: [entry: KnowledgeEntry]
  dblclick: [entry: KnowledgeEntry]
}>()

const renderedContent = computed(() => renderContent(props.entry))
</script>
