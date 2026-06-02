import { marked } from 'marked'
import type { KnowledgeEntry } from '@/types/knowledge'
import type { MindMapNode } from '@/types/mindmap'

marked.setOptions({ breaks: true })

export function renderContent(entry: KnowledgeEntry): string {
  return renderRaw(entry.htmlContent, entry.markdownContent, entry.richtextContent, entry.contentType)
}

export function renderNodeContent(node: MindMapNode): string {
  return renderRaw(node.htmlContent, node.markdownContent, node.richtextContent, node.contentType)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * Find <pre><code> blocks in the HTML, try to parse their content as JSON,
 * and pretty-print valid JSON. Non-JSON code blocks are left unchanged.
 */
function formatJsonCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code(\s[^>]*?)?>([\s\S]*?)<\/code><\/pre>/g,
    (match, attrs, content) => {
      const unescaped = unescapeHtml(content)
      let parsed: unknown
      try {
        parsed = JSON.parse(unescaped.trim())
      } catch {
        return match // Not valid JSON, leave unchanged
      }
      const formatted = JSON.stringify(parsed, null, 2)
      // Ensure language-json class is present
      let newAttrs = attrs || ''
      if (newAttrs.includes('class=')) {
        if (!newAttrs.includes('language-json')) {
          newAttrs = newAttrs.replace(/class="([^"]*)"/, 'class="$1 language-json"')
        }
      } else {
        newAttrs = ` class="language-json"`
      }
      return `<pre><code${newAttrs}>${escapeHtml(formatted)}</code></pre>`
    },
  )
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
    let htmlOut = marked.parse(raw || '') as string
    // Format JSON code blocks before other post-processing
    htmlOut = formatJsonCodeBlocks(htmlOut)
    // Add referrerpolicy="no-referrer" to all img tags to avoid hotlinking 403
    htmlOut = htmlOut.replace(/<img /g, '<img referrerpolicy="no-referrer" ')
    return htmlOut.replace(
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
