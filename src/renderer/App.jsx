// ABOUTME: Root application component. Manages layout mode and top-level state.
// ABOUTME: Renders the split-pane editor/preview layout with status bar.

import { useState, useEffect } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import StatusBar from './components/StatusBar'
import { useFile } from './hooks/useFile'

function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export default function App() {
  const { content, filename, dirty, handleChange, forceSave } = useFile()
  const [mode, setMode] = useState('edit')

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        forceSave()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setMode(prev => prev === 'edit' ? 'preview' : 'edit')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [forceSave])

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <div className="flex-1 flex overflow-hidden">
        {mode === 'edit' && (
          <div className="w-1/2 border-r border-border">
            <Editor content={content} onChange={handleChange} />
          </div>
        )}
        <div className={mode === 'edit' ? 'w-1/2' : 'w-full'}>
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
