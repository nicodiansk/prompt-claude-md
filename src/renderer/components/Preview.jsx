// ABOUTME: Renders markdown content as formatted HTML in the preview pane.
// ABOUTME: Uses markdown-it via the useMarkdown hook for rendering.

import { useMemo } from 'react'
import { renderMarkdown } from '@/hooks/useMarkdown'

export default function Preview({ content }) {
  const html = useMemo(() => renderMarkdown(content), [content])

  return (
    <div
      data-testid="preview"
      className="p-6 overflow-auto h-full prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
