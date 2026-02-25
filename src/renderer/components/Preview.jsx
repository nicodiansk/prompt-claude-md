// ABOUTME: Renders markdown content as formatted HTML in the preview pane.
// ABOUTME: Uses markdown-it for rendering and mermaid for diagram SVG generation.

import { useMemo, useEffect, useState } from 'react'
import { renderMarkdown } from '@/hooks/useMarkdown'
import mermaid from 'mermaid'

let renderCounter = 0
let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({ startOnLoad: false, theme: 'dark' })
  mermaidInitialized = true
}

async function processHtmlWithMermaid(html) {
  if (!html || !html.includes('mermaid-diagram')) return html

  initMermaid()

  // Process mermaid blocks in a detached element to avoid fighting React's DOM
  const temp = document.createElement('div')
  temp.innerHTML = html

  const diagrams = temp.querySelectorAll('.mermaid-diagram')
  if (diagrams.length === 0) return html

  renderCounter++
  const batchId = renderCounter

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

  return temp.innerHTML
}

export default function Preview({ content }) {
  const rawHtml = useMemo(() => renderMarkdown(content), [content])
  const [html, setHtml] = useState(rawHtml)

  // Synchronously update html when rawHtml changes (React pattern for derived state)
  const [prevRawHtml, setPrevRawHtml] = useState(rawHtml)
  if (rawHtml !== prevRawHtml) {
    setPrevRawHtml(rawHtml)
    setHtml(rawHtml)
  }

  useEffect(() => {
    let cancelled = false

    processHtmlWithMermaid(rawHtml).then(processed => {
      if (!cancelled && processed !== rawHtml) {
        setHtml(processed)
      }
    })

    return () => { cancelled = true }
  }, [rawHtml])

  return (
    <div
      data-testid="preview"
      className="p-6 overflow-auto h-full prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
