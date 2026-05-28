<template>
  <div>
    <!-- MindMap canvas when system selected -->
    <div v-if="selectedSystemId && selectedSystemId !== '__all__'" class="h-[calc(100vh-6rem)]">
      <!-- Node detail panel -->
      <template v-if="focusedNode">
        <header class="mb-4">
          <button
            class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            @click="closeNodeDetail"
          >
            <ArrowLeft :size="16" />
            <span>返回画布</span>
          </button>
        </header>
        <div class="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden h-[calc(100vh-11rem)]">
          <div class="w-full h-1" :style="{ background: focusedNodeGradient }" />
          <div class="p-8 overflow-y-auto h-full">
            <div class="flex items-center gap-2 mb-6 text-xs text-slate-400">
              <span class="inline-flex items-center gap-1">
                <span class="inline-block w-2 h-2 rounded-full" :style="{ background: focusedNodeColor }" />
                <span>{{ nodeTypeLabel(focusedNode.nodeType) }}</span>
              </span>
            </div>

            <!-- View mode -->
            <template v-if="!editingNode">
              <h2 class="text-xl font-bold text-slate-800 mb-6">{{ focusedNode.title }}</h2>
              <div class="knowledge-content text-slate-600 text-sm leading-relaxed max-w-5xl" v-html="focusedNodeRenderedContent" />
              <div class="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <span class="text-xs text-slate-400">更新于 {{ formatDate(focusedNode.updatedAt) }}</span>
                <div class="flex gap-2">
                  <button
                    class="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-teal-500 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                    @click="startEditingNode"
                  >
                    <Pencil :size="14" /><span>编辑</span>
                  </button>
                  <button
                    class="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                    @click="deleteNodeFromDetail"
                  >
                    <Trash2 :size="14" /><span>删除</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- Edit mode -->
            <template v-else>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
                  <input
                    v-model="nodeEditForm.title"
                    type="text"
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
                  />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="text-sm font-medium text-slate-700">内容</label>
                    <div class="flex bg-slate-100 rounded-lg p-0.5">
                      <button
                        v-for="mode in contentModes"
                        :key="mode.key"
                        type="button"
                        :class="[
                          'px-3 py-1 text-xs font-medium rounded-md transition-all',
                          nodeEditForm.contentType === mode.key
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600',
                        ]"
                        @click="nodeEditForm.contentType = mode.key"
                      >{{ mode.label }}</button>
                    </div>
                  </div>
                  <textarea
                    v-if="nodeEditForm.contentType === 'html'"
                    v-model="nodeEditForm.htmlContent"
                    rows="10"
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                    placeholder="HTML 内容..."
                  />
                  <textarea
                    v-else-if="nodeEditForm.contentType === 'markdown'"
                    v-model="nodeEditForm.markdownContent"
                    rows="10"
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                    placeholder="Markdown 内容..."
                  />
                  <textarea
                    v-else
                    v-model="nodeEditForm.richtextContent"
                    rows="10"
                    class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
                    placeholder="富文本内容..."
                  />
                </div>
                <div class="flex justify-end gap-2.5 pt-2">
                  <button
                    class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                    @click="cancelEditingNode"
                  >取消</button>
                  <button
                    class="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm shadow-teal-200"
                    @click="saveNodeEdit"
                  >保存</button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Canvas -->
      <template v-else>
        <header class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              @click="backToSystems"
            >
              <ArrowLeft :size="16" />
              <span>返回系统列表</span>
            </button>
            <span class="text-slate-300">|</span>
            <span class="text-sm text-slate-500">双击节点查看详情 · 右键新增节点 · 拖拽移动 · 滚轮缩放</span>
          </div>
        </header>
        <MindMapCanvas
          :nodes="mindmapNodes"
          :connections="mindmapConnections"
          :system-id="selectedSystemId"
          @node-move="handleNodeMove"
          @node-dblclick="showNodeDetail"
          @add-node="handleAddNode"
          @delete-node="handleDeleteNode"
        />
      </template>
    </div>

    <!-- System card grid (系统建模) -->
    <div v-else-if="showSystemGrid">
      <header class="mb-8">
        <div class="flex items-start justify-between gap-6 flex-wrap">
          <div class="flex-1 min-w-0">
            <h2 class="text-2xl font-bold text-slate-800 tracking-tight">系统建模</h2>
            <p class="text-slate-500 mt-1">管理系统架构与思维导图</p>
          </div>
        </div>
      </header>
      <SystemCardGrid
        :systems="mindmapSystems"
        @select="onSystemCardClick"
        @edit="onSystemEdit"
        @delete="onSystemDelete"
      />
    </div>

    <!-- Knowledge grid / detail (default) -->
    <template v-else>
      <header class="mb-8">
        <div class="flex items-start justify-between gap-6 flex-wrap">
          <div class="flex-1 min-w-0">
            <template v-if="focusedEntry">
              <button
                class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
                @click="focusedEntry = null"
              >
                <ArrowLeft :size="16" />
                <span>返回列表</span>
              </button>
              <div class="flex items-center gap-3">
                <div :class="['w-1 h-6 rounded-full', focusedDotColor]" />
                <h2 class="text-2xl font-bold text-slate-800 tracking-tight">{{ focusedEntry.title }}</h2>
              </div>
            </template>
            <template v-else-if="selectedCategory">
              <div class="flex items-center gap-3 mb-2">
                <div :class="['w-1 h-6 rounded-full', selectedCategory.dotColor]" />
                <h2 class="text-2xl font-bold text-slate-800 tracking-tight">{{ selectedCategory.name }}</h2>
              </div>
              <p class="text-slate-500 mt-1 ml-4">{{ selectedCategory.description }}</p>
            </template>
            <template v-else>
              <h2 class="text-2xl font-bold text-slate-800 tracking-tight">全部知识</h2>
              <p class="text-slate-500 mt-1">浏览所有分类的知识条目</p>
            </template>
          </div>
          <div v-if="!focusedEntry" class="flex items-center gap-3 flex-shrink-0">
            <div class="w-64">
              <SearchBar :model-value="searchQuery" @update:model-value="setSearch" />
            </div>
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
              @click="openCreateForm"
            >
              <Plus :size="16" />
              <span>新建</span>
            </button>
          </div>
        </div>
        <div v-if="searchQuery && !focusedEntry" class="mt-3 flex items-center gap-2">
          <span class="text-sm text-slate-500">
            搜索 "<span class="font-medium text-slate-700">{{ searchQuery }}</span>" 找到 <span class="font-semibold text-slate-700">{{ total }}</span> 条结果
          </span>
          <button class="text-sm text-blue-500 hover:text-blue-700 font-medium" @click="setSearch('')">清除</button>
        </div>
      </header>

      <div v-if="status === 'pending'" class="flex items-center justify-center py-24">
        <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <div v-else-if="focusedEntry" class="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div :class="['w-full h-1', focusedGradient]" />
        <div class="p-8 md:p-10">
          <div class="flex items-center gap-2 mb-6 text-xs text-slate-400">
            <span :class="['inline-block w-2 h-2 rounded-full', focusedDotColor]" />
            <span>{{ focusedCategoryName }}</span>
          </div>

          <!-- View mode -->
          <template v-if="!editingEntry">
            <div class="knowledge-content text-slate-600 text-sm leading-relaxed max-w-5xl" v-html="focusedRenderedContent" />
            <IframeEmbed v-if="focusedEntry.iframeUrl" :src="focusedEntry.iframeUrl" />
            <img v-if="focusedEntry.imageUrl && !focusedEntry.iframeUrl" :src="focusedEntry.imageUrl" :alt="focusedEntry.title" class="max-w-full rounded-lg mt-6" loading="lazy" />
            <div class="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <span class="text-xs text-slate-400">更新于 {{ formatDate(focusedEntry.updatedAt) }}</span>
              <div class="flex gap-2">
                <button class="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-colors" @click="startEditingEntry">
                  <Pencil :size="14" /><span>编辑</span>
                </button>
                <button class="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors" @click="onDelete(focusedEntry)">
                  <Trash2 :size="14" /><span>删除</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
                <input v-model="entryEditForm.title" type="text" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">分类</label>
                <select v-model="entryEditForm.categoryId" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                  <option v-for="cat in allCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-sm font-medium text-slate-700">内容</label>
                  <div class="flex bg-slate-100 rounded-lg p-0.5">
                    <button v-for="mode in entryContentModes" :key="mode.key" type="button" :class="['px-3 py-1 text-xs font-medium rounded-md transition-all', entryEditForm.contentType === mode.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600']" @click="switchEntryMode(mode.key)">{{ mode.label }}</button>
                  </div>
                </div>
                <textarea v-if="entryEditForm.contentType === 'html'" v-model="entryEditForm.htmlContent" rows="10" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y" placeholder="HTML 内容..." />
                <textarea v-else-if="entryEditForm.contentType === 'markdown'" v-model="entryEditForm.markdownContent" rows="10" class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y" placeholder="Markdown 内容..." />
                <div v-else class="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <div class="flex flex-wrap gap-0.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="粗体" @click="execEntryCmd('bold')"><Bold :size="15" /></button>
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="斜体" @click="execEntryCmd('italic')"><Italic :size="15" /></button>
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="删除线" @click="execEntryCmd('strikeThrough')"><Strikethrough :size="15" /></button>
                    <span class="w-px h-6 bg-slate-200 mx-1 self-center" />
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="无序列表" @click="execEntryCmd('insertUnorderedList')"><List :size="15" /></button>
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="有序列表" @click="execEntryCmd('insertOrderedList')"><ListOrdered :size="15" /></button>
                    <span class="w-px h-6 bg-slate-200 mx-1 self-center" />
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="代码" @click="insertEntryCode()"><Code2 :size="15" /></button>
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="代码块" @click="insertEntryCodeBlock()"><Terminal :size="15" /></button>
                    <span class="w-px h-6 bg-slate-200 mx-1 self-center" />
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="标题" @click="execEntryCmd('formatBlock', '<h3>')"><Heading :size="15" /></button>
                    <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="引用" @click="execEntryCmd('formatBlock', '<blockquote>')"><Quote :size="15" /></button>
                  </div>
                  <div ref="entryEditorRef" class="px-4 py-3 min-h-[200px] text-sm text-slate-700 outline-none prose prose-sm max-w-none" contenteditable="true" @input="onEntryRichTextInput" @paste="onEntryPaste" />
                </div>
              </div>
              <div class="flex justify-end gap-2.5 pt-2">
                <button class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors" @click="cancelEditingEntry">取消</button>
                <button class="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200" @click="saveEntryEdit">保存</button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <KnowledgeGrid v-else :entries="entries" @edit="onEdit" @delete="onDelete" @dblclick="focusEntry" />

      <!-- System cards in 全部 view when no category selected -->
      <div v-if="!layoutSelectedCategoryId && !searchQuery && mindmapSystems.length > 0 && !focusedEntry" class="mt-10">
        <div class="flex items-center gap-3 mb-5">
          <h2 class="text-lg font-semibold text-slate-700">系统建模</h2>
          <span class="text-xs text-slate-400">{{ mindmapSystems.length }} 个系统</span>
        </div>
        <SystemCardGrid
          :systems="mindmapSystems"
          @select="onSystemCardClick"
          @edit="onSystemEdit"
          @delete="onSystemDelete"
        />
      </div>

      <Pagination v-if="!focusedEntry" :page="currentPage" :total-pages="totalPages" @change="goToPage" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Plus, ArrowLeft, Pencil, Trash2, Bold, Italic, Strikethrough, List, ListOrdered, Code2, Terminal, Heading, Quote } from 'lucide-vue-next'
import type { KnowledgeEntry } from '~/types/knowledge'
import type { MindMapNode, MindMapSystem } from '~/types/mindmap'
import { renderContent, renderNodeContent } from '~/composables/useContentRender'
import MindMapCanvas from '~/components/MindMapCanvas.vue'
import SystemCardGrid from '~/components/SystemCardGrid.vue'

definePageMeta({ layout: 'default' })

const {
  categories: allCategories, entries, total, currentPage, totalPages,
  searchQuery, status, goToPage, setSearch,
} = useKnowledge()

const onEdit = inject<(entry: KnowledgeEntry) => void>('onEdit', () => {})
const onDelete = inject<(entry: KnowledgeEntry) => void>('onDelete', () => {})
const openCreateForm = inject<() => void>('openCreateForm', () => {})

// MindMap injected
const selectedSystemId = inject<Ref<string | null>>('selectedSystemId', ref(null))
const mindmapSystems = inject<Ref<MindMapSystem[]>>('mindmapSystems', ref([]))
const mindmapNodes = inject<Ref<MindMapNode[]>>('mindmapNodes', ref([]))
const mindmapConnections = inject<Ref<any[]>>('mindmapConnections', ref([]))
const handleNodeMove = inject<(id: string, x: number, y: number) => void>('handleNodeMove', () => {})
const handleAddNode = inject<(type: string, x: number, y: number, parentId: string | null) => void>('handleAddNode', () => {})
const handleDeleteNode = inject<(id: string) => void>('handleDeleteNode', () => {})
const handleMindMapNodeDblClick = inject<(node: MindMapNode) => void>('handleMindMapNodeDblClick', () => {})
const handleUpdateMindMapNode = inject<(id: string, updates: any) => Promise<void>>('handleUpdateMindMapNode', async () => {})
const onSystemEdit = inject<(system: MindMapSystem) => void>('onSystemEdit', () => {})
const onSystemDelete = inject<(system: MindMapSystem) => void>('onSystemDelete', () => {})
const layoutSelectedCategoryId = inject<Ref<string | null>>('layoutSelectedCategoryId', ref(null))
const selectedCategory = inject<Ref<any>>('layoutSelectedCategory', ref(null))

const showSystemGrid = computed(() => selectedSystemId.value === '__all__')

// MindMap node detail
const focusedNode = ref<MindMapNode | null>(null)
const editingNode = ref(false)
const nodeEditForm = reactive({ title: '', htmlContent: '', markdownContent: '', richtextContent: '', contentType: 'html' as string })
const contentModes = [
  { key: 'richtext', label: '富文本' },
  { key: 'html', label: 'HTML' },
  { key: 'markdown', label: 'Markdown' },
]

const focusedNodeGradient = computed(() => {
  const c = focusedNode.value?.color || '#10b981'
  return `linear-gradient(to right, ${c}, ${c}88)`
})
const focusedNodeColor = computed(() => focusedNode.value?.color || '#10b981')
const focusedNodeRenderedContent = computed(() => focusedNode.value ? renderNodeContent(focusedNode.value) : '')

const nodeTypeLabels: Record<string, string> = { topic: '主题节点', concept: '概念节点', operation: '操作节点' }
function nodeTypeLabel(type: string) { return nodeTypeLabels[type] || type }

function showNodeDetail(node: MindMapNode) {
  focusedNode.value = node
  editingNode.value = false
}

function closeNodeDetail() {
  focusedNode.value = null
  editingNode.value = false
}

function startEditingNode() {
  if (!focusedNode.value) return
  nodeEditForm.title = focusedNode.value.title
  nodeEditForm.htmlContent = focusedNode.value.htmlContent || ''
  nodeEditForm.markdownContent = focusedNode.value.markdownContent || ''
  nodeEditForm.richtextContent = focusedNode.value.richtextContent || ''
  nodeEditForm.contentType = focusedNode.value.contentType || 'html'
  editingNode.value = true
}

function cancelEditingNode() {
  editingNode.value = false
}

async function saveNodeEdit() {
  if (!focusedNode.value) return
  const id = focusedNode.value.id
  // Update local immediately
  focusedNode.value = {
    ...focusedNode.value,
    title: nodeEditForm.title,
    htmlContent: nodeEditForm.htmlContent,
    markdownContent: nodeEditForm.markdownContent,
    richtextContent: nodeEditForm.richtextContent,
    contentType: nodeEditForm.contentType as any,
  }
  editingNode.value = false
  // Persist
  await handleUpdateMindMapNode(id, {
    title: nodeEditForm.title,
    htmlContent: nodeEditForm.htmlContent,
    markdownContent: nodeEditForm.markdownContent,
    richtextContent: nodeEditForm.richtextContent,
    contentType: nodeEditForm.contentType,
  })
}

async function deleteNodeFromDetail() {
  if (!focusedNode.value) return
  await handleDeleteNode(focusedNode.value.id)
  focusedNode.value = null
}

// Knowledge entry detail
const focusedEntry = ref<KnowledgeEntry | null>(null)
const focusedGradient = computed(() => focusedEntry.value?.gradient ?? 'bg-gradient-to-r from-slate-400 to-slate-500')
const focusedDotColor = computed(() => focusedEntry.value?.dotColor ?? 'bg-slate-400')
const focusedCategoryName = computed(() => focusedEntry.value?.categoryName ?? '')
const focusedRenderedContent = computed(() => focusedEntry.value ? renderContent(focusedEntry.value) : '')

// Knowledge entry inline edit
const editingEntry = ref(false)
const entryEditorRef = ref<HTMLDivElement | null>(null)
const entryEditForm = reactive({ title: '', htmlContent: '', markdownContent: '', richtextContent: '', contentType: 'html' as string, categoryId: '' })
const entryContentModes = [
  { key: 'richtext', label: '富文本' },
  { key: 'html', label: 'HTML' },
  { key: 'markdown', label: 'Markdown' },
]

function startEditingEntry() {
  if (!focusedEntry.value) return
  const e = focusedEntry.value
  entryEditForm.title = e.title
  entryEditForm.htmlContent = e.htmlContent || ''
  entryEditForm.markdownContent = e.markdownContent || ''
  entryEditForm.richtextContent = e.richtextContent || ''
  entryEditForm.contentType = e.contentType || 'html'
  entryEditForm.categoryId = e.categoryId
  editingEntry.value = true
  nextTick(() => {
    if (entryEditorRef.value && e.contentType === 'richtext') {
      entryEditorRef.value.innerHTML = e.richtextContent || ''
    }
  })
}

function cancelEditingEntry() { editingEntry.value = false }

async function saveEntryEdit() {
  if (!focusedEntry.value) return
  if (entryEditForm.contentType === 'richtext') {
    entryEditForm.richtextContent = entryEditorRef.value?.innerHTML || ''
  }
  const id = focusedEntry.value.id
  focusedEntry.value = {
    ...focusedEntry.value,
    title: entryEditForm.title,
    htmlContent: entryEditForm.htmlContent,
    markdownContent: entryEditForm.markdownContent,
    richtextContent: entryEditForm.richtextContent,
    contentType: entryEditForm.contentType as any,
    categoryId: entryEditForm.categoryId,
    categoryName: allCategories.value.find(c => c.id === entryEditForm.categoryId)?.name || focusedEntry.value.categoryName,
  }
  editingEntry.value = false
  await $fetch(`/api/knowledge/${id}`, {
    method: 'PUT',
    body: {
      title: entryEditForm.title,
      htmlContent: entryEditForm.htmlContent,
      markdownContent: entryEditForm.markdownContent,
      richtextContent: entryEditForm.richtextContent,
      contentType: entryEditForm.contentType,
      categoryId: entryEditForm.categoryId,
    },
  })
}

function switchEntryMode(mode: string) {
  if (entryEditForm.contentType === 'richtext' && mode !== 'richtext') {
    entryEditForm.richtextContent = entryEditorRef.value?.innerHTML || ''
  }
  entryEditForm.contentType = mode
  if (mode === 'richtext') {
    nextTick(() => {
      if (entryEditorRef.value) entryEditorRef.value.innerHTML = entryEditForm.richtextContent || ''
    })
  }
}

function onEntryRichTextInput() {
  entryEditForm.richtextContent = entryEditorRef.value?.innerHTML || ''
}

function onEntryPaste(e: ClipboardEvent) {
  e.preventDefault()
  const items = e.clipboardData?.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = () => {
            document.execCommand('insertHTML', false, `<img src="${reader.result}" style="max-width:100%" />`)
            onEntryRichTextInput()
          }
          reader.readAsDataURL(file)
          return
        }
      }
    }
  }
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertHTML', false, text)
}

function execEntryCmd(cmd: string, value?: string) {
  entryEditorRef.value?.focus()
  document.execCommand(cmd, false, value)
  onEntryRichTextInput()
}

function insertEntryCode() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && sel.toString()) {
    const range = sel.getRangeAt(0)
    const code = document.createElement('code')
    code.className = 'bg-slate-100 px-1 py-0.5 rounded text-sm text-rose-600'
    code.textContent = sel.toString()
    range.deleteContents()
    range.insertNode(code)
    onEntryRichTextInput()
  }
}

function insertEntryCodeBlock() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const text = sel.toString() || '代码'
    const range = sel.getRangeAt(0)
    const pre = document.createElement('pre')
    pre.className = 'bg-slate-800 text-slate-100 p-3 rounded-lg text-sm my-2 overflow-x-auto'
    pre.setAttribute('contenteditable', 'false')
    const code = document.createElement('code')
    code.textContent = text
    pre.appendChild(code)
    range.deleteContents()
    range.insertNode(pre)
    onEntryRichTextInput()
  }
}

function focusEntry(entry: KnowledgeEntry) { focusedEntry.value = entry }

function onSystemCardClick(system: MindMapSystem) {
  selectedSystemId.value = system.id
}

function backToSystems() {
  selectedSystemId.value = null
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

</script>
