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
    const html = marked.parse(raw || '') as string
    return html.replace(
      /<(p|li|h[1-6])([^>]*)>(.*?)<\/\1>/gs,
      (match, tag, attrs, content) => {
        let color = ''
        if (content.includes('prompt:')) color = 'text-red-500 font-medium'
        else if (content.includes('promptResponse:')) color = 'text-green-700 font-medium'
        if (!color) return match
        const cls = attrs.includes('class=')
          ? attrs.replace(/class="([^"]*)"/, `class="$1 ${color}"`)
          : `${attrs} class="${color}"`
        return `<${tag}${cls}>${content}</${tag}>`
      },
    )
  }
  return raw || ''
}
