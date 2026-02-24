// ABOUTME: CodeMirror 6 editor component with markdown syntax highlighting.
// ABOUTME: Mounts CodeMirror into a ref-managed DOM container.

import { useRef, useEffect } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'

export default function Editor({ content, onChange }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)

  // Keep callback ref current without recreating editor
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        updateListener,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2)
      ]
    })

    const view = new EditorView({
      state,
      parent: containerRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // Mount once — content updates handled separately

  // Update editor content when external changes arrive (file watch)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (content !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content }
      })
    }
  }, [content])

  return (
    <div
      data-testid="editor"
      ref={containerRef}
      className="h-full overflow-auto"
    />
  )
}
