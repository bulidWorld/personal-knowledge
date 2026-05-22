<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <AppSidebar
      :categories="categories"
      :selected-category-id="selectedCategoryId"
      :selected-system-id="selectedSystemId"
      :total-count="total"
      :category-counts="categoryCounts"
      :systems="mindmapSystems"
      @select-category="onSelectCategory"
      @select-system="onSelectSystem"
      @create-system="onCreateSystem"
      @create="showCreateForm = true"
    />

    <main class="flex-1 overflow-y-auto">
      <div class="px-6 py-8 md:px-8 md:py-10">
        <slot />
      </div>
    </main>

    <KnowledgeForm
      :open="showCreateForm"
      :entry="editingEntry"
      :categories="categories"
      @submit="handleFormSubmit"
      @close="closeForm"
    />

    <!-- MindMap node edit modal -->
    <Modal :open="!!editingMindMapNode" title="编辑节点" @close="closeMindMapNodeEdit">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
          <input
            v-model="editingMindMapNode!.title"
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
                  editingMindMapNode!.contentType === mode.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600',
                ]"
                @click="editingMindMapNode!.contentType = mode.key"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>
          <textarea
            v-if="editingMindMapNode!.contentType === 'html'"
            v-model="editingMindMapNode!.htmlContent"
            rows="8"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
            placeholder="HTML 内容..."
          />
          <textarea
            v-else-if="editingMindMapNode!.contentType === 'markdown'"
            v-model="editingMindMapNode!.markdownContent"
            rows="8"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
            placeholder="Markdown 内容..."
          />
          <textarea
            v-else
            v-model="editingMindMapNode!.richtextContent"
            rows="8"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-y"
            placeholder="富文本内容..."
          />
        </div>
        <div class="flex justify-end gap-2.5 pt-2">
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            @click="closeMindMapNodeEdit"
          >取消</button>
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm shadow-teal-200"
            @click="saveMindMapNode"
          >保存</button>
        </div>
      </div>
    </Modal>

    <!-- System create dialog -->
    <Modal :open="showSystemCreate" title="新建系统" @close="showSystemCreate = false">
      <div class="space-y-3">
        <input
          v-model="newSystemName"
          type="text"
          placeholder="请输入系统名称"
          class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
          @keyup.enter="doCreateSystem"
        />
        <div class="flex justify-end gap-2.5 pt-2">
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            @click="showSystemCreate = false"
          >取消</button>
          <button
            :disabled="!newSystemName.trim()"
            class="px-5 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-teal-200"
            @click="doCreateSystem"
          >创建</button>
        </div>
      </div>
    </Modal>

    <!-- Delete confirmation -->
    <Modal :open="!!deletingEntry" title="确认删除" @close="deletingEntry = null">
      <div class="space-y-4">
        <p class="text-slate-600 text-sm">
          确定要删除 <span class="font-semibold text-slate-800">"{{ deletingEntry?.title }}"</span> 吗？此操作不可恢复。
        </p>
        <div class="flex justify-end gap-2.5">
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            @click="deletingEntry = null"
          >取消</button>
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200"
            @click="confirmDelete"
          >确认删除</button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import type { KnowledgeEntry, KnowledgeFormData, ContentType } from '~/types/knowledge'
import type { MindMapNode } from '~/types/mindmap'

const {
  categories,
  selectedCategoryId,
  total,
  createEntry,
  updateEntry,
  deleteEntry,
} = useKnowledge()

const selectedSystemId = ref<string | null>(null)
const mindmap = useMindMap(selectedSystemId)

const mindmapSystems = computed(() => mindmap.systems.value)

// --- Knowledge entry form ---
const showCreateForm = ref(false)
const editingEntry = ref<KnowledgeFormData | null>(null)
const deletingEntry = ref<KnowledgeEntry | null>(null)

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const cat of categories.value) counts[cat.id] = (cat as any).entryCount ?? 0
  return counts
})

async function handleFormSubmit(data: KnowledgeFormData) {
  if (data.id) { await updateEntry(data.id, data) } else { await createEntry(data) }
  closeForm()
}

function closeForm() { showCreateForm.value = false; editingEntry.value = null }

function handleEdit(entry: KnowledgeEntry) {
  editingEntry.value = {
    id: entry.id, title: entry.title,
    htmlContent: entry.htmlContent || '', markdownContent: entry.markdownContent || '', richtextContent: entry.richtextContent || '',
    contentType: entry.contentType, categoryId: entry.categoryId,
    iframeUrl: entry.iframeUrl || '', imageUrl: entry.imageUrl || '',
  }
  showCreateForm.value = true
}

function handleDelete(entry: KnowledgeEntry) { deletingEntry.value = entry }

async function confirmDelete() {
  if (!deletingEntry.value) return
  await deleteEntry(deletingEntry.value.id)
  deletingEntry.value = null
}

// --- System selection ---
function onSelectCategory(id: string | null) {
  selectedCategoryId.value = id
  selectedSystemId.value = null
}

function onSelectSystem(id: string | null) {
  selectedCategoryId.value = null
  selectedSystemId.value = id
}


// --- System create ---
const showSystemCreate = ref(false)
const newSystemName = ref('')

function onCreateSystem() { showSystemCreate.value = true; newSystemName.value = '' }

async function doCreateSystem() {
  if (!newSystemName.value.trim()) return
  const s = await mindmap.createSystem(newSystemName.value.trim())
  showSystemCreate.value = false
  selectedCategoryId.value = null
  selectedSystemId.value = s.id
}

// --- MindMap node edit ---
const editingMindMapNode = ref<{
  id: string; title: string; htmlContent: string; markdownContent: string; richtextContent: string; contentType: ContentType
} | null>(null)

const contentModes = [
  { key: 'richtext' as ContentType, label: '富文本' },
  { key: 'html' as ContentType, label: 'HTML' },
  { key: 'markdown' as ContentType, label: 'Markdown' },
]

function handleMindMapNodeDblClick(node: MindMapNode) {
  editingMindMapNode.value = {
    id: node.id, title: node.title,
    htmlContent: node.htmlContent || '', markdownContent: node.markdownContent || '', richtextContent: node.richtextContent || '',
    contentType: node.contentType || 'html',
  }
}

async function saveMindMapNode() {
  if (!editingMindMapNode.value) return
  const n = editingMindMapNode.value
  await mindmap.updateNode(n.id, {
    title: n.title, htmlContent: n.htmlContent, markdownContent: n.markdownContent,
    richtextContent: n.richtextContent, contentType: n.contentType,
  } as any)
  await mindmap.fetchNodes()
  closeMindMapNodeEdit()
}

function closeMindMapNodeEdit() { editingMindMapNode.value = null }

// --- MindMap canvas interactions (provided to page) ---
async function handleNodeMove(id: string, x: number, y: number) {
  mindmap.nodes.value = mindmap.nodes.value.map(n => n.id === id ? { ...n, x, y } : n)
  await mindmap.updateNode(id, { x, y } as any)
}

async function handleAddNode(type: string, x: number, y: number, parentId: string | null) {
  if (!selectedSystemId.value) return
  const typeNames: Record<string, string> = { topic: '新主题', concept: '新概念', operation: '新操作' }
  const colors: Record<string, string> = { topic: '#10b981', concept: '#f59e0b', operation: '#3b82f6' }
  await mindmap.createNode({
    systemId: selectedSystemId.value, title: typeNames[type] || '新节点',
    nodeType: type, parentId, x, y, color: colors[type] || '',
  })
  // Auto-connect to parent
  if (parentId) {
    const newNode = mindmap.nodes.value.find(n => n.parentId === parentId && n.title === (typeNames[type] || '新节点'))
    if (newNode) {
      await mindmap.createConnection(selectedSystemId.value, parentId, newNode.id)
    }
  }
}

async function handleDeleteNode(id: string) {
  await mindmap.deleteNode(id)
}

// Fetch systems on mount
onMounted(async () => {
  await mindmap.fetchSystems()
})

// Fetch nodes when system selected
watch(selectedSystemId, async (newId) => {
  mindmap.nodes.value = []
  mindmap.connections.value = []
  if (newId && newId !== '__all__') {
    await mindmap.fetchNodes()
    await mindmap.fetchConnections()
  }
})

// Provide handlers to page
provide('onEdit', handleEdit)
provide('onDelete', handleDelete)
provide('openCreateForm', () => { showCreateForm.value = true })
provide('selectedSystemId', selectedSystemId)
provide('mindmapSystems', mindmapSystems)
provide('mindmapNodes', mindmap.nodes)
provide('mindmapConnections', mindmap.connections)
provide('handleNodeMove', handleNodeMove)
provide('handleAddNode', handleAddNode)
provide('handleDeleteNode', handleDeleteNode)
provide('handleMindMapNodeDblClick', handleMindMapNodeDblClick)
provide('handleUpdateMindMapNode', async (id: string, updates: any) => {
  await mindmap.updateNode(id, updates)
  await mindmap.fetchNodes()
})
</script>
