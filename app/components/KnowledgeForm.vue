<template>
  <Modal :open="open" :title="isEditing ? '编辑知识条目' : '新建知识条目'" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">标题 <span class="text-red-400">*</span></label>
        <input
          v-model="form.title"
          type="text"
          placeholder="请输入标题"
          class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">分类 <span class="text-red-400">*</span></label>
        <select
          v-model="form.categoryId"
          class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
        >
          <option value="" disabled>请选择分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <!-- Content type switch -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-sm font-medium text-slate-700">内容</label>
          <div class="flex bg-slate-100 rounded-lg p-0.5">
            <button
              v-for="mode in modes"
              :key="mode.key"
              type="button"
              :class="[
                'px-3 py-1 text-xs font-medium rounded-md transition-all',
                form.contentType === mode.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600',
              ]"
              @click="switchMode(mode.key)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <!-- HTML textarea -->
        <textarea
          v-if="form.contentType === 'html'"
          v-model="form.htmlContent"
          rows="10"
          placeholder="请输入 HTML 内容..."
          class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y font-mono"
        />

        <!-- Markdown textarea -->
        <textarea
          v-else-if="form.contentType === 'markdown'"
          v-model="form.markdownContent"
          rows="10"
          placeholder="请输入 Markdown 内容..."
          class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-y font-mono"
        />

        <!-- Rich text editor -->
        <div v-else class="border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <!-- Toolbar -->
          <div class="flex flex-wrap gap-0.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="粗体" @click="execCmd('bold')">
              <Bold :size="15" />
            </button>
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="斜体" @click="execCmd('italic')">
              <Italic :size="15" />
            </button>
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="删除线" @click="execCmd('strikeThrough')">
              <Strikethrough :size="15" />
            </button>
            <span class="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="无序列表" @click="execCmd('insertUnorderedList')">
              <List :size="15" />
            </button>
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="有序列表" @click="execCmd('insertOrderedList')">
              <ListOrdered :size="15" />
            </button>
            <span class="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="内联代码" @click="insertCode()">
              <Code2 :size="15" />
            </button>
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="代码块" @click="insertCodeBlock()">
              <Terminal :size="15" />
            </button>
            <span class="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="标题" @click="execCmd('formatBlock', '<h3>')">
              <Heading :size="15" />
            </button>
            <button type="button" class="p-1.5 rounded hover:bg-white hover:shadow-sm transition-colors text-slate-500" title="引用" @click="execCmd('formatBlock', '<blockquote>')">
              <Quote :size="15" />
            </button>
          </div>
          <!-- Contenteditable area -->
          <div
            ref="editorRef"
            class="px-4 py-3 min-h-[200px] text-sm text-slate-700 outline-none prose prose-sm max-w-none"
            contenteditable="true"
            @input="onRichTextInput"
            @paste="onPaste"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2.5 pt-2">
        <button
          type="button"
          class="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          @click="$emit('close')"
        >
          取消
        </button>
        <button
          type="submit"
          :disabled="!form.title.trim() || !form.categoryId"
          class="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200"
        >
          {{ isEditing ? '保存修改' : '创建条目' }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import type { KnowledgeCategory, KnowledgeFormData, ContentType } from '~/types/knowledge'
import { Bold, Italic, Strikethrough, List, ListOrdered, Code2, Terminal, Heading, Quote } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  entry?: KnowledgeFormData | null
  categories: KnowledgeCategory[]
}>()

const emit = defineEmits<{
  submit: [data: KnowledgeFormData]
  close: []
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const isEditing = computed(() => !!props.entry?.id)

const modes = [
  { key: 'richtext' as ContentType, label: '富文本' },
  { key: 'html' as ContentType, label: 'HTML' },
  { key: 'markdown' as ContentType, label: 'Markdown' },
]

const form = reactive<KnowledgeFormData>({
  id: undefined,
  title: '',
  htmlContent: '',
  markdownContent: '',
  richtextContent: '',
  contentType: 'richtext',
  categoryId: '',
})

watch(() => props.open, (isOpen) => {
  if (isOpen && props.entry) {
    form.id = props.entry.id
    form.title = props.entry.title
    form.htmlContent = props.entry.htmlContent || ''
    form.markdownContent = props.entry.markdownContent || ''
    form.richtextContent = props.entry.richtextContent || ''
    form.contentType = props.entry.contentType || 'richtext'
    form.categoryId = props.entry.categoryId
  } else if (isOpen) {
    form.id = undefined
    form.title = ''
    form.htmlContent = ''
    form.markdownContent = ''
    form.richtextContent = ''
    form.contentType = 'richtext'
    form.categoryId = ''
  }
})

watch(() => form.contentType, (newType) => {
  if (newType === 'richtext') {
    nextTick(() => {
      if (editorRef.value) {
        editorRef.value.innerHTML = form.richtextContent || ''
      }
    })
  }
})

function switchMode(mode: ContentType) {
  if (form.contentType === 'richtext' && mode !== 'richtext') {
    form.richtextContent = editorRef.value?.innerHTML || ''
  }
  form.contentType = mode
}

function onRichTextInput() {
  form.richtextContent = editorRef.value?.innerHTML || ''
}

function onPaste(e: ClipboardEvent) {
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
            onRichTextInput()
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

function execCmd(cmd: string, value?: string) {
  editorRef.value?.focus()
  document.execCommand(cmd, false, value)
  onRichTextInput()
}

function insertCode() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && sel.toString()) {
    const range = sel.getRangeAt(0)
    const code = document.createElement('code')
    code.className = 'bg-slate-100 px-1 py-0.5 rounded text-sm text-rose-600'
    code.textContent = sel.toString()
    range.deleteContents()
    range.insertNode(code)
    onRichTextInput()
  }
}

function insertCodeBlock() {
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
    onRichTextInput()
  }
}

function handleSubmit() {
  if (form.contentType === 'richtext') {
    form.richtextContent = editorRef.value?.innerHTML || ''
  }
  emit('submit', { ...form })
}
</script>
