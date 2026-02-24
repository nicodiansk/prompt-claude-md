// ABOUTME: Root application component. Manages layout mode and top-level state.
// ABOUTME: Renders the split-pane editor/preview layout with status bar.

import { useState, useCallback } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import StatusBar from './components/StatusBar'

const SAMPLE_CONTENT = `# Welcome to MD Viewer

This is a **live preview** markdown editor.

## Features

- Split pane editing
- Syntax highlighting
- GFM support (tables, ~~strikethrough~~, task lists)

### Code Example

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`
}
\`\`\`

### Table

| Feature | Status |
|---------|--------|
| Editor | Working |
| Preview | Working |

### Task List

- [x] Editor component
- [x] Preview component
- [ ] File operations
`

function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export default function App() {
  const [content, setContent] = useState(SAMPLE_CONTENT)
  const [mode, setMode] = useState('edit') // 'edit' or 'preview'

  const handleChange = useCallback((newContent) => {
    setContent(newContent)
  }, [])

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
        filename="untitled.md"
        wordCount={countWords(content)}
        mode={mode}
      />
    </div>
  )
}
