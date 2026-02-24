// ABOUTME: Renders markdown content as formatted HTML in the preview pane.
// ABOUTME: Uses markdown-it for rendering and mermaid for diagram SVG generation.

import { useMemo, useRef, useEffect } from 'react'
import { renderMarkdown } from '@/hooks/useMarkdown'

let renderCounter = 0

export default function Preview({ content }) {
  const html = useMemo(() => renderMarkdown(content), [content])
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const diagrams = container.querySelectorAll('.mermaid-diagram:not(.mermaid-rendered)')
    if (diagrams.length === 0) return

    renderCounter++
    const batchId = renderCounter

    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' })

      for (let i = 0; i < diagrams.length; i++) {
        const el = diagrams[i]
        const definition = el.textContent
        try {
          const { svg } = await mermaid.render(`mermaid-${batchId}-${i}`, definition)
          el.innerHTML = svg
          el.classList.add('mermaid-rendered')
        } catch (error) {
          el.innerHTML = '<pre class="mermaid-error">' + error.message + '</pre>'
          el.classList.add('mermaid-rendered')
        }
      }
    }).catch(() => {
      // Mermaid requires a real browser DOM — silently skip in test environments
    })
  }, [html])

  return (
    <div
      data-testid="preview"
      ref={containerRef}
      className="p-6 overflow-auto h-full prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
