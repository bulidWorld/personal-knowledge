import { marked } from 'marked'
import type { KnowledgeEntry } from '~/types/knowledge'
import type { MindMapNode } from '~/types/mindmap'

marked.setOptions({ breaks: true })

export function renderContent(entry: KnowledgeEntry): string {
  return renderRaw(entry.htmlContent, entry.markdownContent, entry.richtextContent, entry.contentType)
}

export function renderNodeContent(node: MindMapNode): string {
  return renderRaw(node.htmlContent, node.markdownContent, node.richtextContent, node.contentType)
}

function renderRaw(html: string, markdown: string, richtext: string, contentType: string): string {
  let raw = ''
  switch (contentType) {
    case 'markdown':
      raw = markdown
      break
    case 'richtext':
      raw = richtext
      break
    default:
      raw = html
      break
  }
  if (contentType === 'markdown') {
    return marked.parse(raw || '') as string
  }
  return raw || ''
}
