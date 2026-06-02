'use client'

/**
 * Handles image paste in markdown textareas.
 *
 * Checks clipboard for image data. If found: prevents default paste,
 * uploads the image, and inserts ![](url) at the cursor position.
 * If no image found: returns false so default text paste can proceed.
 */
export async function handleMarkdownImagePaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement,
  onValueChange: (newValue: string) => void
): Promise<boolean> {
  const items = e.clipboardData?.items
  if (!items) return false

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      e.preventDefault()

      const file = item.getAsFile()
      if (!file) continue

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const placeholder = '![](正在上传图片...)'

      // Insert placeholder while uploading
      const currentValue = textarea.value
      const newValue = currentValue.slice(0, start) + placeholder + currentValue.slice(end)
      onValueChange(newValue)

      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.url) {
          const imgMd = `![](${data.url})`
          // Replace placeholder with actual URL
          const replaced = newValue.replace(placeholder, imgMd)
          onValueChange(replaced)

          // Restore cursor position after React re-render
          requestAnimationFrame(() => {
            const cursorPos = start + imgMd.length
            textarea.setSelectionRange(cursorPos, cursorPos)
            textarea.focus()
          })
        } else {
          // Remove placeholder on failure
          const reverted = newValue.replace(placeholder, '')
          onValueChange(reverted)
        }
      } catch {
        // Remove placeholder on error
        const reverted = newValue.replace(placeholder, '')
        onValueChange(reverted)
      }

      return true
    }
  }

  return false
}
