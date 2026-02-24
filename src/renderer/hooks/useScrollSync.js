// ABOUTME: Synchronizes scroll position between editor and preview panes.
// ABOUTME: Uses scroll percentage mapping for approximate alignment.

import { useRef, useCallback, useEffect } from 'react'

export function useScrollSync(editorRef, previewRef) {
  const isSyncing = useRef(false)

  const syncScroll = useCallback((source, target) => {
    if (isSyncing.current || !source || !target) return

    isSyncing.current = true

    const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight || 1)
    target.scrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight)

    requestAnimationFrame(() => {
      isSyncing.current = false
    })
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    const preview = previewRef.current
    if (!editor || !preview) return

    const editorScroller = editor.querySelector('.cm-scroller')
    const previewScroller = preview.querySelector('[data-testid="preview"]') || preview
    if (!editorScroller) return

    const handleEditorScroll = () => syncScroll(editorScroller, previewScroller)
    const handlePreviewScroll = () => syncScroll(previewScroller, editorScroller)

    editorScroller.addEventListener('scroll', handleEditorScroll)
    previewScroller.addEventListener('scroll', handlePreviewScroll)

    return () => {
      editorScroller.removeEventListener('scroll', handleEditorScroll)
      previewScroller.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [editorRef, previewRef, syncScroll])
}
