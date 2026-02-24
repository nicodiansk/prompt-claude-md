// ABOUTME: Root application component. Manages layout mode and top-level state.
// ABOUTME: Renders the split-pane editor/preview layout with status bar.

import { useState, useEffect, useRef } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import StatusBar from './components/StatusBar'
import { useFile } from './hooks/useFile'
import { useScrollSync } from './hooks/useScrollSync'

function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export default function App() {
  const { content, filename, hasFile, dirty, handleChange, forceSave, openFile } = useFile()
  const [mode, setMode] = useState('edit')
  const editorRef = useRef(null)
  const previewRef = useRef(null)

  useScrollSync(editorRef, previewRef)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        forceSave()
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault()
        openFile()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setMode(prev => prev === 'edit' ? 'preview' : 'edit')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [forceSave, openFile])

  if (!hasFile) {
    return (
      <div className="flex flex-col h-screen bg-background text-text">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text mb-2">MD Viewer</h1>
            <p className="text-text-muted mb-8">Markdown editor with live preview</p>
            <button
              onClick={openFile}
              className="px-6 py-3 bg-accent text-background rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Open File
            </button>
            <p className="text-text-muted text-sm mt-4">
              or press <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">Ctrl+O</kbd> to open a file
            </p>
          </div>
        </div>
        <StatusBar
          filename="No file open"
          wordCount={0}
          mode={mode}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <div className="flex-1 flex overflow-hidden">
        {mode === 'edit' && (
          <div ref={editorRef} className="w-1/2 border-r border-border">
            <Editor content={content} onChange={handleChange} />
          </div>
        )}
        <div ref={previewRef} className={mode === 'edit' ? 'w-1/2' : 'w-full'}>
          <Preview content={content} />
        </div>
      </div>
      <StatusBar
        filename={dirty ? `${filename} *` : filename}
        wordCount={countWords(content)}
        mode={mode}
      />
    </div>
  )
}
