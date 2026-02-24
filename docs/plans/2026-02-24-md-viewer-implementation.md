# md-viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local markdown viewer/editor as an Electron desktop app with split-pane editing, live preview, file watching, auto-save, and polished dark UI.

**Architecture:** Electron main process handles file I/O and window management. React renderer with CodeMirror 6 editor and markdown-it preview, styled with Tailwind CSS and Magic UI components. IPC bridge via preload script. Built with electron-vite.

**Tech Stack:** Electron, React, Vite (electron-vite), CodeMirror 6, markdown-it, highlight.js, Tailwind CSS v4, Magic UI, Vitest

**Reference docs:**
- Design: `docs/plans/2026-02-24-md-viewer-design.md`
- Spec: `docs.txt`
- Project rules: `CLAUDE.md`

---

## Progress

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Initialize project and install dependencies | Done | `30450e1` |
| 2 | Configure electron-vite | Done | `f032cbd` |
| 3 | Set up Tailwind CSS v4 | Done | `0c614f4` |
| 4 | Set up Magic UI utilities | Done | `fbb6a07` |
| 5 | Configure Vitest | Done | `2bd79a5` |
| 6 | Create Electron main process skeleton | Done | `252110b` |
| 7 | Create preload script | Done | `95f939f` |
| 8 | Create React entry point | Done | `ce8fde2` |
| 9 | Create useMarkdown hook (TDD) | Done | `19f4792` |
| 10 | Create Preview component (TDD) | Done | `70f0644` |
| 11 | Create Editor component (TDD) | Done | `0886f02` |
| 12 | Create StatusBar component (TDD) | Done | `62c2271` |
| 13 | Wire up live editor-to-preview rendering | Done | `d06351b` |
| 14 | Add preview styles and code highlighting | Done | `44db9af` |
| 15 | Add Magic UI elements to shell | Done | `169a86a` |
| 16 | Phase 1 verification and merge to develop | Done | `efeb306` |
| 17 | Create feature branch | Done | — |
| 18 | Add IPC file read/write handlers (TDD) | Done | `c6e1c1e` |
| 19 | Wire IPC handlers into main process | Done | `a5c55a1` |
| 20 | Expand preload API | Done | `ba103e1` |
| 21 | Create useDebounce hook (TDD) | Done | `4571da1` |
| 22 | Create useFile hook | Done | `5aa3994` |
| 23 | Add file watching to main process | Done | `a47c182` |
| 24 | Integrate useFile into App | Done | `bf269d4` |
| 25 | Phase 2 verification and merge to develop | Done | `e4379f1` |

**Notes:**
- npm `script-shell` set to Git Bash globally (`~/.npmrc`) to fix nvm4w symlink issues on Windows
- Node v20.19.6 — @electron/rebuild warns about wanting Node >= 22.12.0 (non-blocking)
- Using subagent-driven development for task execution
- electron-vite v5 removed `is` from `electron-vite/utils` — use `process.env.NODE_ENV` instead

---

## Branch Strategy

Each phase maps to a feature branch off `develop`. Merge to `develop` when phase is complete.

| Phase | Branch | Description |
|---|---|---|
| 0+1 | `feature/minimal-editor` | Scaffolding + working split-pane editor |
| 2 | `feature/file-operations` | File read/write, auto-save, watching |
| 3 | `feature/cli` | CLI entry point, single instance |
| 4 | `feature/polish` | Shortcuts, scroll sync, window state |
| 5 | `feature/extended-rendering` | Mermaid, KaTeX (deferred) |

---

## Phase 0: Project Scaffolding

> Branch: `feature/minimal-editor` (off `develop`)

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`

**Step 1: Create feature branch**

```bash
git checkout develop
git checkout -b feature/minimal-editor
```

**Step 2: Initialize package.json**

```bash
npm init -y
```

Then edit `package.json`:

```json
{
  "name": "md-viewer",
  "version": "0.1.0",
  "description": "Local markdown viewer/editor with live preview",
  "type": "module",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["markdown", "editor", "viewer", "electron"],
  "license": "MIT"
}
```

**Step 3: Install dependencies**

```bash
# Electron + build
npm install --save-dev electron electron-builder electron-vite

# React
npm install react react-dom
npm install --save-dev @vitejs/plugin-react

# Editor + markdown
npm install codemirror @codemirror/lang-markdown @codemirror/theme-one-dark @codemirror/language
npm install markdown-it highlight.js

# Styling
npm install tailwindcss @tailwindcss/vite
npm install motion clsx tailwind-merge

# Testing
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Initialize project with core dependencies"
```

---

### Task 2: Configure electron-vite

**Files:**
- Create: `electron.vite.config.js`

**Step 1: Create electron-vite config**

```js
// ABOUTME: Build configuration for Electron main, preload, and renderer processes.
// ABOUTME: Uses electron-vite to coordinate Vite builds across all three contexts.

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    }
  }
})
```

**Step 2: Create directory structure**

```bash
mkdir -p src/main src/preload src/renderer/components src/renderer/hooks src/renderer/styles src/renderer/lib
mkdir -p tests/hooks tests/components tests/main
```

**Step 3: Commit**

```bash
git add electron.vite.config.js
git commit -m "Add electron-vite build configuration"
```

---

### Task 3: Set up Tailwind CSS v4

**Files:**
- Create: `src/renderer/styles/globals.css`

**Step 1: Create global CSS with Tailwind**

```css
/* ABOUTME: Global styles and Tailwind CSS v4 import. */
/* ABOUTME: Dark theme base with CSS custom properties for theming. */

@import "tailwindcss";

@theme inline {
  --color-background: #1a1b26;
  --color-surface: #24283b;
  --color-surface-bright: #2f3347;
  --color-border: #3b3f54;
  --color-text: #c0caf5;
  --color-text-muted: #565f89;
  --color-accent: #7aa2f7;
  --color-accent-dim: #3d59a1;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  height: 100vh;
}

#root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
```

**Step 2: Commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "Add Tailwind CSS v4 with dark theme variables"
```

---

### Task 4: Set up Magic UI utilities

**Files:**
- Create: `src/renderer/lib/utils.js`

**Step 1: Create cn() utility (required by Magic UI components)**

```js
// ABOUTME: Utility function for conditional CSS class merging.
// ABOUTME: Used by Magic UI and shadcn-style components throughout the renderer.

import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

**Step 2: Commit**

```bash
git add src/renderer/lib/utils.js
git commit -m "Add cn() utility for class merging"
```

---

### Task 5: Configure Vitest

**Files:**
- Create: `vitest.config.js`

**Step 1: Create Vitest config**

```js
// ABOUTME: Test configuration for Vitest with jsdom environment.
// ABOUTME: Supports React component testing and Node.js utility testing.

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer')
    }
  }
})
```

**Step 2: Create test setup file**

Create `tests/setup.js`:

```js
// ABOUTME: Test setup file that configures the testing environment.
// ABOUTME: Extends Vitest with DOM-specific matchers from testing-library.

import '@testing-library/jest-dom'
```

**Step 3: Write a smoke test to verify the config works**

Create `tests/setup.test.js`:

```js
// ABOUTME: Smoke test to verify the test framework is configured correctly.
// ABOUTME: Remove once real tests exist.

import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('runs tests', () => {
    expect(true).toBe(true)
  })
})
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run
```

Expected: 1 test passes.

**Step 5: Commit**

```bash
git add vitest.config.js tests/setup.js tests/setup.test.js
git commit -m "Configure Vitest with jsdom and React support"
```

---

### Task 6: Create Electron main process skeleton

**Files:**
- Create: `src/main/index.js`

**Step 1: Create main process**

```js
// ABOUTME: Electron main process entry point. Creates the browser window
// ABOUTME: and manages application lifecycle.

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from 'electron-vite/utils'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 2: Commit**

```bash
git add src/main/index.js
git commit -m "Add Electron main process with window creation"
```

---

### Task 7: Create preload script

**Files:**
- Create: `src/preload/index.js`

**Step 1: Create minimal preload script**

```js
// ABOUTME: Preload script that bridges main and renderer processes.
// ABOUTME: Exposes a safe API via contextBridge for file operations and IPC.

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // File operations will be added in Phase 2
})
```

**Step 2: Commit**

```bash
git add src/preload/index.js
git commit -m "Add preload script skeleton with contextBridge"
```

---

### Task 8: Create React entry point

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.jsx`
- Create: `src/renderer/App.jsx`

**Step 1: Create index.html (Vite entry point)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MD Viewer</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.jsx"></script>
</body>
</html>
```

**Step 2: Create main.jsx (React root mount)**

```jsx
// ABOUTME: React application entry point. Mounts the root component.
// ABOUTME: Imports global styles including Tailwind CSS.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 3: Create App.jsx (placeholder)**

```jsx
// ABOUTME: Root application component. Manages layout mode and top-level state.
// ABOUTME: Renders the split-pane editor/preview layout with status bar.

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-border">
          {/* Editor goes here */}
          <div className="p-4 text-text-muted">Editor placeholder</div>
        </div>
        <div className="w-1/2 overflow-auto">
          {/* Preview goes here */}
          <div className="p-4 text-text-muted">Preview placeholder</div>
        </div>
      </div>
      <div className="h-6 bg-surface border-t border-border px-3 flex items-center text-xs text-text-muted">
        Status bar placeholder
      </div>
    </div>
  )
}
```

**Step 4: Run the app to verify it launches**

```bash
npm run dev
```

Expected: Electron window opens with two placeholder panes and a status bar. Dark background.

**Step 5: Commit**

```bash
git add src/renderer/index.html src/renderer/main.jsx src/renderer/App.jsx
git commit -m "Add React entry point with placeholder split-pane layout"
```

---

## Phase 1: Minimal Viable Editor

> Still on branch: `feature/minimal-editor`

### Task 9: Create useMarkdown hook

**Files:**
- Create: `src/renderer/hooks/useMarkdown.js`
- Create: `tests/hooks/useMarkdown.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for the useMarkdown hook that renders markdown to HTML.
// ABOUTME: Verifies GFM features and syntax highlighting integration.

import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/hooks/useMarkdown'

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('# Hello')
    expect(html).toContain('<h1>Hello</h1>')
  })

  it('renders GFM tables', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  it('renders task lists', () => {
    const md = '- [x] done\n- [ ] todo'
    const html = renderMarkdown(md)
    expect(html).toContain('type="checkbox"')
  })

  it('renders strikethrough', () => {
    const md = '~~deleted~~'
    const html = renderMarkdown(md)
    expect(html).toContain('<s>deleted</s>')
  })

  it('syntax-highlights code blocks', () => {
    const md = '```js\nconst x = 1\n```'
    const html = renderMarkdown(md)
    expect(html).toContain('hljs')
  })

  it('renders inline code', () => {
    const html = renderMarkdown('use `const` here')
    expect(html).toContain('<code>const</code>')
  })

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useMarkdown.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement renderMarkdown**

```js
// ABOUTME: Configures markdown-it with GFM features and syntax highlighting.
// ABOUTME: Exports a renderMarkdown function used by the Preview component.

import markdownit from 'markdown-it'
import hljs from 'highlight.js'

const md = markdownit({
  html: true,
  linkify: true,
  typographer: false,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs language-' + lang + '">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
      } catch (_) { /* fall through */ }
    }
    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

// Enable GFM features: tables, strikethrough
md.enable(['table', 'strikethrough'])

export function renderMarkdown(source) {
  if (!source) return ''
  return md.render(source)
}
```

Note: markdown-it includes tables and strikethrough support built-in, they just need to be enabled. For task lists, install `markdown-it-task-lists`:

```bash
npm install markdown-it-task-lists
```

Then add to the hook:

```js
import taskLists from 'markdown-it-task-lists'
md.use(taskLists)
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/hooks/useMarkdown.test.js
```

Expected: All 7 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/hooks/useMarkdown.js tests/hooks/useMarkdown.test.js
git commit -m "Add markdown rendering with GFM and syntax highlighting"
```

---

### Task 10: Create Preview component

**Files:**
- Create: `src/renderer/components/Preview.jsx`
- Create: `tests/components/Preview.test.jsx`

**Step 1: Write the failing test**

```jsx
// ABOUTME: Tests for the Preview component that renders markdown as HTML.
// ABOUTME: Verifies content rendering and empty state handling.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Preview from '@/components/Preview'

describe('Preview', () => {
  it('renders markdown content as HTML', () => {
    const { container } = render(<Preview content="# Hello World" />)
    expect(container.querySelector('h1')).toHaveTextContent('Hello World')
  })

  it('renders empty state when no content', () => {
    const { container } = render(<Preview content="" />)
    const preview = container.querySelector('[data-testid="preview"]')
    expect(preview.innerHTML).toBe('')
  })

  it('updates when content changes', () => {
    const { container, rerender } = render(<Preview content="# First" />)
    expect(container.querySelector('h1')).toHaveTextContent('First')

    rerender(<Preview content="# Second" />)
    expect(container.querySelector('h1')).toHaveTextContent('Second')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/Preview.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement Preview**

```jsx
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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/Preview.test.jsx
```

Expected: All 3 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/components/Preview.jsx tests/components/Preview.test.jsx
git commit -m "Add Preview component with markdown rendering"
```

---

### Task 11: Create Editor component

**Files:**
- Create: `src/renderer/components/Editor.jsx`
- Create: `tests/components/Editor.test.jsx`

**Step 1: Write the failing test**

Note: CodeMirror requires a real DOM for full functionality. In jsdom, we test that the component mounts and calls onChange. We do NOT test CodeMirror internals — that's E2E territory.

```jsx
// ABOUTME: Tests for the Editor component wrapper around CodeMirror 6.
// ABOUTME: Tests mounting behavior and prop handling in jsdom.

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Editor from '@/components/Editor'

describe('Editor', () => {
  it('renders a container element', () => {
    const { container } = render(
      <Editor content="hello" onChange={() => {}} />
    )
    expect(container.querySelector('[data-testid="editor"]')).toBeTruthy()
  })

  it('accepts content and onChange props without crashing', () => {
    const onChange = vi.fn()
    expect(() => {
      render(<Editor content="# Test" onChange={onChange} />)
    }).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/Editor.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement Editor**

```jsx
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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/Editor.test.jsx
```

Expected: 2 tests pass. (CodeMirror may produce warnings in jsdom — that's OK as long as tests pass.)

**Step 5: Commit**

```bash
git add src/renderer/components/Editor.jsx tests/components/Editor.test.jsx
git commit -m "Add CodeMirror 6 editor component with markdown mode"
```

---

### Task 12: Create StatusBar component

**Files:**
- Create: `src/renderer/components/StatusBar.jsx`
- Create: `tests/components/StatusBar.test.jsx`

**Step 1: Write the failing test**

```jsx
// ABOUTME: Tests for the StatusBar component.
// ABOUTME: Verifies filename display, word count, and mode indicator.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBar from '@/components/StatusBar'

describe('StatusBar', () => {
  it('displays the filename', () => {
    render(<StatusBar filename="notes.md" wordCount={0} mode="edit" />)
    expect(screen.getByText('notes.md')).toBeTruthy()
  })

  it('displays the word count', () => {
    render(<StatusBar filename="test.md" wordCount={42} mode="edit" />)
    expect(screen.getByText(/42 words/)).toBeTruthy()
  })

  it('displays edit mode indicator', () => {
    render(<StatusBar filename="test.md" wordCount={0} mode="edit" />)
    expect(screen.getByText(/edit/i)).toBeTruthy()
  })

  it('displays preview mode indicator', () => {
    render(<StatusBar filename="test.md" wordCount={0} mode="preview" />)
    expect(screen.getByText(/preview/i)).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/StatusBar.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement StatusBar**

```jsx
// ABOUTME: Displays filename, word count, and edit/preview mode in the status bar.
// ABOUTME: Thin bar at the bottom of the window.

import { cn } from '@/lib/utils'

export default function StatusBar({ filename, wordCount, mode }) {
  return (
    <div className="h-6 bg-surface border-t border-border px-3 flex items-center justify-between text-xs text-text-muted select-none">
      <div className="flex items-center gap-3">
        <span>{filename}</span>
        <span>{wordCount} words</span>
      </div>
      <div>
        <span className={cn(
          'uppercase tracking-wider',
          mode === 'edit' ? 'text-accent' : 'text-text-muted'
        )}>
          {mode}
        </span>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/StatusBar.test.jsx
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/components/StatusBar.jsx tests/components/StatusBar.test.jsx
git commit -m "Add StatusBar component with filename, word count, mode"
```

---

### Task 13: Wire up live editor-to-preview rendering

**Files:**
- Modify: `src/renderer/App.jsx`

**Step 1: Update App to wire Editor, Preview, and StatusBar together**

```jsx
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
```

**Step 2: Run the app and verify**

```bash
npm run dev
```

Expected: Electron window with split-pane layout. Left pane has CodeMirror editor with sample markdown. Right pane shows rendered HTML. Typing in editor updates preview in real-time. Dark theme.

**Step 3: Run all tests to ensure nothing broke**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/renderer/App.jsx
git commit -m "Wire up editor, preview, and status bar with live rendering"
```

---

### Task 14: Add preview styles for rendered markdown and code highlighting

**Files:**
- Create: `src/renderer/styles/preview.css`
- Modify: `src/renderer/main.jsx` (add import)

**Step 1: Create preview-specific styles**

Style the rendered markdown output (headings, code blocks, tables, lists) and import a highlight.js dark theme.

```css
/* ABOUTME: Styles for the markdown preview pane's rendered HTML content. */
/* ABOUTME: Covers typography, code blocks, tables, and task lists. */

/* highlight.js theme — import a dark theme */
@import 'highlight.js/styles/tokyo-night-dark.css';

/* Preview pane rendered content */
[data-testid="preview"] h1 {
  font-size: 2em;
  font-weight: 700;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border);
}

[data-testid="preview"] h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.83em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--color-border);
}

[data-testid="preview"] h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0;
}

[data-testid="preview"] p {
  margin: 0.75em 0;
  line-height: 1.6;
}

[data-testid="preview"] a {
  color: var(--color-accent);
  text-decoration: none;
}

[data-testid="preview"] a:hover {
  text-decoration: underline;
}

[data-testid="preview"] pre {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  margin: 1em 0;
}

[data-testid="preview"] code {
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.9em;
}

[data-testid="preview"] :not(pre) > code {
  background: var(--color-surface-bright);
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

[data-testid="preview"] table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

[data-testid="preview"] th,
[data-testid="preview"] td {
  border: 1px solid var(--color-border);
  padding: 0.5em 0.75em;
  text-align: left;
}

[data-testid="preview"] th {
  background: var(--color-surface);
  font-weight: 600;
}

[data-testid="preview"] ul,
[data-testid="preview"] ol {
  padding-left: 1.5em;
  margin: 0.75em 0;
}

[data-testid="preview"] li {
  margin: 0.25em 0;
  line-height: 1.6;
}

[data-testid="preview"] blockquote {
  border-left: 3px solid var(--color-accent-dim);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--color-text-muted);
}

[data-testid="preview"] hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5em 0;
}

[data-testid="preview"] img {
  max-width: 100%;
  border-radius: 4px;
}

/* Task list checkboxes */
[data-testid="preview"] .task-list-item {
  list-style: none;
  margin-left: -1.5em;
}

[data-testid="preview"] .task-list-item input[type="checkbox"] {
  margin-right: 0.5em;
}
```

**Step 2: Import in main.jsx**

Add to `src/renderer/main.jsx`:

```jsx
import './styles/preview.css'
```

**Step 3: Run the app and verify styled preview**

```bash
npm run dev
```

Expected: Preview pane shows nicely styled markdown with dark code highlighting, bordered tables, styled headings.

**Step 4: Commit**

```bash
git add src/renderer/styles/preview.css src/renderer/main.jsx
git commit -m "Add preview pane styles with code highlighting theme"
```

---

### Task 15: Add Magic UI elements to the shell

**Files:**
- Create: `src/renderer/components/ui/ShineBorder.jsx` (from Magic UI)
- Modify: `src/renderer/App.jsx`

**Step 1: Install Magic UI Shine Border component**

Magic UI components are typically installed via shadcn CLI, but for a non-Next.js project, copy the component source. Check if the CLI works first:

```bash
npx shadcn@latest add @magicui/shine-border
```

If the CLI doesn't work in our project structure (it expects Next.js), create the component manually based on the Magic UI source. The key component for our shell is ShineBorder — a subtle animated glow around the window edge.

Create `src/renderer/components/ui/ShineBorder.jsx`:

```jsx
// ABOUTME: Animated glowing border effect from Magic UI.
// ABOUTME: Applied to the main application shell for visual polish.

import { cn } from '@/lib/utils'

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = '#7aa2f7',
  className,
  children,
  ...props
}) {
  return (
    <div
      style={{
        '--border-radius': `${borderRadius}px`,
        '--border-width': `${borderWidth}px`,
        '--duration': `${duration}s`,
        '--mask-linear-gradient':
          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        '--background-radial-gradient':
          `radial-gradient(transparent, transparent, ${Array.isArray(color) ? color.join(',') : color}, transparent, transparent)`,
      }}
      className={cn(
        'relative rounded-[--border-radius] p-[--border-width]',
        'before:absolute before:inset-0 before:rounded-[--border-radius]',
        'before:p-[--border-width] before:will-change-[background-position]',
        'before:[background-image:--background-radial-gradient]',
        'before:[background-size:300%_300%]',
        'before:animate-[shine-border_var(--duration)_infinite_linear]',
        'before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]',
        'before:[-webkit-mask:--mask-linear-gradient]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

Add the animation keyframe to `src/renderer/styles/globals.css`:

```css
@keyframes shine-border {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}
```

**Step 2: Apply to App shell**

This is optional visual enhancement. Wrap the main container or the divider between panes. The exact application of Magic UI components should be evaluated visually when the app is running. Start subtle — a shine border on the status bar or a subtle glow on the pane divider.

**Step 3: Run the app and evaluate visually**

```bash
npm run dev
```

Evaluate: Does the shine border look good? Adjust color, duration, and placement. Magic UI is about taste — iterate visually.

**Step 4: Commit**

```bash
git add src/renderer/components/ui/ src/renderer/styles/globals.css src/renderer/App.jsx
git commit -m "Add Magic UI shine border to application shell"
```

---

### Task 16: Final Phase 1 verification and merge

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Run the app and verify all Phase 1 features**

```bash
npm run dev
```

Verify:
- [ ] Electron window opens with dark theme
- [ ] Left pane: CodeMirror editor with markdown syntax highlighting
- [ ] Right pane: rendered markdown with styled headings, code, tables
- [ ] Typing in editor updates preview in real-time
- [ ] Status bar shows filename, word count, mode
- [ ] Magic UI visual elements are present and look good
- [ ] No console errors

**Step 3: Commit any final adjustments**

**Step 4: Merge to develop**

```bash
git checkout develop
git merge --no-ff feature/minimal-editor -m "Merge feature/minimal-editor: split-pane editor with live preview"
```

---

## Phase 2: File Operations

> Branch: `feature/file-operations` (off `develop`)

### Task 17: Create feature branch

```bash
git checkout develop
git checkout -b feature/file-operations
```

---

### Task 18: Add IPC file read/write handlers to main process

**Files:**
- Modify: `src/main/index.js`
- Create: `tests/main/fileOps.test.js`

**Step 1: Write failing tests for file operations logic**

Test the file operation functions in isolation (not the IPC wiring — that's Electron integration).

```js
// ABOUTME: Tests for file operation functions used by the main process.
// ABOUTME: Tests read, write, and create-if-missing behavior using real temp files.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileContent, writeFileContent } from '../../src/main/fileOps.js'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('fileOps', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-viewer-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  describe('readFileContent', () => {
    it('reads existing file content', async () => {
      const filePath = join(tempDir, 'test.md')
      await writeFileContent(filePath, '# Hello')
      const content = await readFileContent(filePath)
      expect(content).toBe('# Hello')
    })

    it('creates file and returns empty string if file does not exist', async () => {
      const filePath = join(tempDir, 'new.md')
      const content = await readFileContent(filePath)
      expect(content).toBe('')
      // Verify file was created
      const diskContent = await readFile(filePath, 'utf-8')
      expect(diskContent).toBe('')
    })
  })

  describe('writeFileContent', () => {
    it('writes content to file', async () => {
      const filePath = join(tempDir, 'output.md')
      await writeFileContent(filePath, '# Written')
      const content = await readFile(filePath, 'utf-8')
      expect(content).toBe('# Written')
    })

    it('overwrites existing content', async () => {
      const filePath = join(tempDir, 'overwrite.md')
      await writeFileContent(filePath, 'first')
      await writeFileContent(filePath, 'second')
      const content = await readFile(filePath, 'utf-8')
      expect(content).toBe('second')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/fileOps.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement fileOps module**

Create `src/main/fileOps.js`:

```js
// ABOUTME: File read and write operations for the main process.
// ABOUTME: Handles create-if-missing behavior for new files.

import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'

export async function readFileContent(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return await readFile(filePath, 'utf-8')
  } catch {
    // File doesn't exist — create it empty
    await writeFile(filePath, '', 'utf-8')
    return ''
  }
}

export async function writeFileContent(filePath, content) {
  await writeFile(filePath, content, 'utf-8')
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/main/fileOps.test.js
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add src/main/fileOps.js tests/main/fileOps.test.js
git commit -m "Add file read/write operations with create-if-missing"
```

---

### Task 19: Wire IPC handlers into main process

**Files:**
- Modify: `src/main/index.js`

**Step 1: Add IPC handlers for file operations**

Update `src/main/index.js` to register IPC handlers and parse CLI args:

```js
// ABOUTME: Electron main process entry point. Creates the browser window
// ABOUTME: and manages application lifecycle, file I/O, and IPC.

import { app, BrowserWindow, ipcMain } from 'electron'
import { join, resolve, basename } from 'path'
import { is } from 'electron-vite/utils'
import { readFileContent, writeFileContent } from './fileOps.js'

let mainWindow = null
let filePath = null

function parseFilePath() {
  // In dev, CLI args include electron path. In production, args start with app path.
  const args = process.argv.slice(is.dev ? 2 : 1)
  const fileArg = args.find(arg => !arg.startsWith('-'))
  if (fileArg) {
    return resolve(fileArg)
  }
  return null
}

function createWindow() {
  const title = filePath ? `${basename(filePath)} — MD Viewer` : 'MD Viewer'

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers() {
  ipcMain.handle('get-file-path', () => filePath)

  ipcMain.handle('read-file', async () => {
    if (!filePath) return ''
    return readFileContent(filePath)
  })

  ipcMain.handle('write-file', async (_event, content) => {
    if (!filePath) return
    await writeFileContent(filePath, content)
  })
}

app.whenReady().then(() => {
  filePath = parseFilePath()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

**Step 2: Commit**

```bash
git add src/main/index.js
git commit -m "Add IPC handlers for file operations and CLI arg parsing"
```

---

### Task 20: Expand preload API

**Files:**
- Modify: `src/preload/index.js`

**Step 1: Expose file operations to renderer**

```js
// ABOUTME: Preload script that bridges main and renderer processes.
// ABOUTME: Exposes a safe API via contextBridge for file operations and IPC.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getFilePath: () => ipcRenderer.invoke('get-file-path'),
  readFile: () => ipcRenderer.invoke('read-file'),
  writeFile: (content) => ipcRenderer.invoke('write-file', content),
  onFileChanged: (callback) => {
    const handler = (_event, content) => callback(content)
    ipcRenderer.on('file-changed', handler)
    return () => ipcRenderer.removeListener('file-changed', handler)
  }
})
```

**Step 2: Commit**

```bash
git add src/preload/index.js
git commit -m "Expose file read/write/watch API in preload script"
```

---

### Task 21: Create useDebounce hook

**Files:**
- Create: `src/renderer/hooks/useDebounce.js`
- Create: `tests/hooks/useDebounce.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for the useDebounce hook.
// ABOUTME: Verifies debounce timing, cancellation, and immediate flush.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the callback after the delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('hello')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('hello')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('resets the timer on subsequent calls', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('first')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.trigger('second')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('flush() fires immediately', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('urgent')
    })

    act(() => {
      result.current.flush()
    })

    expect(callback).toHaveBeenCalledWith('urgent')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancel() prevents the callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('cancelled')
    })

    act(() => {
      result.current.cancel()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useDebounce.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement useDebounce**

```js
// ABOUTME: Custom hook that debounces a callback with trigger/flush/cancel controls.
// ABOUTME: Used for auto-save to prevent excessive writes during rapid typing.

import { useRef, useCallback, useEffect } from 'react'

export function useDebounce(callback, delay) {
  const callbackRef = useRef(callback)
  const timerRef = useRef(null)
  const pendingArgsRef = useRef(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const trigger = useCallback((...args) => {
    pendingArgsRef.current = args
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      callbackRef.current(...pendingArgsRef.current)
      timerRef.current = null
      pendingArgsRef.current = null
    }, delay)
  }, [delay])

  const flush = useCallback(() => {
    if (timerRef.current && pendingArgsRef.current) {
      clearTimeout(timerRef.current)
      callbackRef.current(...pendingArgsRef.current)
      timerRef.current = null
      pendingArgsRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      pendingArgsRef.current = null
    }
  }, [])

  return { trigger, flush, cancel }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/hooks/useDebounce.test.js
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/hooks/useDebounce.js tests/hooks/useDebounce.test.js
git commit -m "Add useDebounce hook with trigger, flush, and cancel"
```

---

### Task 22: Create useFile hook

**Files:**
- Create: `src/renderer/hooks/useFile.js`

**Step 1: Implement useFile hook**

This hook manages file state and integrates the preload API with the debounced auto-save. Testing this hook directly is complex because it depends on `window.api` (Electron IPC). We test its sub-components (useDebounce) independently and verify integration visually.

```js
// ABOUTME: Manages file state, auto-save, and external change detection.
// ABOUTME: Coordinates IPC file operations with debounced writes.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from './useDebounce'

export function useFile() {
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState('untitled.md')
  const [dirty, setDirty] = useState(false)
  const lastSavedRef = useRef('')

  const saveToFile = useCallback(async (text) => {
    if (!window.api) return
    await window.api.writeFile(text)
    lastSavedRef.current = text
    setDirty(false)
  }, [])

  const { trigger: debouncedSave, flush: flushSave } = useDebounce(saveToFile, 500)

  // Load file on mount
  useEffect(() => {
    async function loadFile() {
      if (!window.api) return

      const filePath = await window.api.getFilePath()
      if (filePath) {
        const name = filePath.split(/[/\\]/).pop()
        setFilename(name)

        const fileContent = await window.api.readFile()
        setContent(fileContent)
        lastSavedRef.current = fileContent
      }
    }

    loadFile()
  }, [])

  // Listen for external file changes
  useEffect(() => {
    if (!window.api) return

    const unsubscribe = window.api.onFileChanged((newContent) => {
      if (newContent !== lastSavedRef.current) {
        setContent(newContent)
        lastSavedRef.current = newContent
        setDirty(false)
      }
    })

    return unsubscribe
  }, [])

  const handleChange = useCallback((newContent) => {
    setContent(newContent)
    setDirty(true)
    debouncedSave(newContent)
  }, [debouncedSave])

  const forceSave = useCallback(() => {
    flushSave()
    if (dirty) {
      saveToFile(content)
    }
  }, [flushSave, dirty, content, saveToFile])

  return {
    content,
    filename,
    dirty,
    handleChange,
    forceSave
  }
}
```

**Step 2: Commit**

```bash
git add src/renderer/hooks/useFile.js
git commit -m "Add useFile hook for file state and auto-save"
```

---

### Task 23: Add file watching to main process

**Files:**
- Modify: `src/main/index.js`

**Step 1: Add fs.watch integration**

Add file watching after window creation. When the file changes on disk, read the new content and send it to the renderer.

Add to `src/main/index.js`, inside `app.whenReady().then()` after `createWindow()`:

```js
import { watch } from 'fs'

// After createWindow():
function startFileWatcher() {
  if (!filePath) return

  let debounceTimer = null

  watch(filePath, (eventType) => {
    if (eventType !== 'change') return

    // Debounce to avoid rapid-fire events
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        const content = await readFileContent(filePath)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('file-changed', content)
        }
      } catch {
        // File may be temporarily unavailable during write
      }
    }, 100)
  })
}
```

Call `startFileWatcher()` after `createWindow()`.

**Step 2: Commit**

```bash
git add src/main/index.js
git commit -m "Add file watching with debounced change notifications"
```

---

### Task 24: Integrate useFile into App

**Files:**
- Modify: `src/renderer/App.jsx`

**Step 1: Replace hardcoded content with useFile hook**

Update App.jsx to use the useFile hook instead of hardcoded sample content:

```jsx
// ABOUTME: Root application component. Manages layout mode and top-level state.
// ABOUTME: Renders the split-pane editor/preview layout with status bar.

import { useState } from 'react'
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
```

**Step 2: Test with a real file**

```bash
npm run dev -- -- ./test-file.md
```

Expected: Opens test-file.md (creates if missing). Edit in the app → file saves after 500ms. Edit file externally → app reloads content.

**Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/renderer/App.jsx
git commit -m "Integrate useFile hook for file-backed editing"
```

---

### Task 25: Phase 2 verification and merge

**Step 1: Run all tests**

```bash
npx vitest run
```

**Step 2: Manual verification checklist**

```bash
npm run dev -- -- ./test-file.md
```

Verify:
- [ ] File content loads in editor
- [ ] Edits auto-save after ~500ms
- [ ] Dirty indicator (*) appears while unsaved
- [ ] External file changes reload in editor
- [ ] Non-existent file is created empty
- [ ] No console errors

**Step 3: Merge to develop**

```bash
git checkout develop
git merge --no-ff feature/file-operations -m "Merge feature/file-operations: file read/write, auto-save, watching"
```

---

## Phase 3: CLI Entry Point

> Branch: `feature/cli` (off `develop`)

### Task 26: Create feature branch

```bash
git checkout develop
git checkout -b feature/cli
```

---

### Task 27: Add CLI launcher script

**Files:**
- Create: `bin/md-viewer.js`
- Modify: `package.json`

**Step 1: Create launcher script**

```js
#!/usr/bin/env node

// ABOUTME: CLI entry point that launches the Electron app with a filepath argument.
// ABOUTME: Installed globally as the `md-viewer` command.

import { resolve } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: md-viewer <file.md>')
  process.exit(1)
}

const resolvedPath = resolve(filePath)
const electronPath = join(__dirname, '..', 'node_modules', '.bin', 'electron')
const mainPath = join(__dirname, '..', 'out', 'main', 'index.js')

spawn(electronPath, [mainPath, resolvedPath], {
  stdio: 'inherit',
  detached: true
}).unref()
```

**Step 2: Update package.json bin field**

Add to `package.json`:

```json
{
  "bin": {
    "md-viewer": "./bin/md-viewer.js"
  }
}
```

**Step 3: Build and test CLI**

```bash
npm run build
node bin/md-viewer.js ./test-file.md
```

Expected: Electron window opens with test-file.md.

**Step 4: Commit**

```bash
git add bin/md-viewer.js package.json
git commit -m "Add CLI launcher script for md-viewer command"
```

---

### Task 28: Add single instance lock

**Files:**
- Modify: `src/main/index.js`

**Step 1: Add single instance lock**

Add near the top of `src/main/index.js`, before `app.whenReady()`:

```js
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Focus existing window when second instance launches
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
```

**Step 2: Test by launching twice**

```bash
npm run dev -- -- ./test-file.md
# In another terminal:
npm run dev -- -- ./test-file.md
```

Expected: Second launch focuses the first window instead of opening a new one.

**Step 3: Commit**

```bash
git add src/main/index.js
git commit -m "Add single instance lock to prevent duplicate windows"
```

---

### Task 29: Phase 3 verification and merge

**Step 1: Verify**

- [ ] `md-viewer ./file.md` opens the file
- [ ] `md-viewer` with no args shows usage error
- [ ] Second instance focuses existing window
- [ ] Window title shows `filename.md — MD Viewer`

**Step 2: Merge to develop**

```bash
git checkout develop
git merge --no-ff feature/cli -m "Merge feature/cli: CLI entry point and single instance"
```

---

## Phase 4: Polish

> Branch: `feature/polish` (off `develop`)

### Task 30: Create feature branch

```bash
git checkout develop
git checkout -b feature/polish
```

---

### Task 31: Add Ctrl+S force save

**Files:**
- Modify: `src/renderer/App.jsx`

**Step 1: Add keyboard event listener**

Add to App component:

```jsx
useEffect(() => {
  function handleKeyDown(e) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      forceSave()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [forceSave])
```

**Step 2: Verify — press Ctrl+S, check file saves immediately**

**Step 3: Commit**

```bash
git add src/renderer/App.jsx
git commit -m "Add Ctrl+S force save shortcut"
```

---

### Task 32: Add Ctrl+Shift+P mode toggle

**Files:**
- Modify: `src/renderer/App.jsx`

**Step 1: Add to the existing keydown handler**

```jsx
if (e.ctrlKey && e.shiftKey && e.key === 'P') {
  e.preventDefault()
  setMode(prev => prev === 'edit' ? 'preview' : 'edit')
}
```

**Step 2: Verify — press Ctrl+Shift+P, editor hides, preview goes full-width**

**Step 3: Commit**

```bash
git add src/renderer/App.jsx
git commit -m "Add Ctrl+Shift+P to toggle edit/preview mode"
```

---

### Task 33: Add scroll sync between editor and preview

**Files:**
- Create: `src/renderer/hooks/useScrollSync.js`

**Step 1: Implement scroll sync hook**

Scroll sync maps the scroll percentage of one pane to the other. This is an approximation — true line-level sync is complex and a future enhancement.

```js
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
    if (!editorScroller) return

    const handleEditorScroll = () => syncScroll(editorScroller, preview)
    const handlePreviewScroll = () => syncScroll(preview, editorScroller)

    editorScroller.addEventListener('scroll', handleEditorScroll)
    preview.addEventListener('scroll', handlePreviewScroll)

    return () => {
      editorScroller.removeEventListener('scroll', handleEditorScroll)
      preview.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [editorRef, previewRef, syncScroll])
}
```

**Step 2: Wire into App.jsx**

Add refs for editor and preview containers. Pass refs to the hook. This requires adding `ref` forwarding to Editor and Preview components, or wrapping them in ref-bearing containers in App.jsx.

**Step 3: Verify — scroll one pane, other follows approximately**

**Step 4: Commit**

```bash
git add src/renderer/hooks/useScrollSync.js src/renderer/App.jsx
git commit -m "Add approximate scroll sync between editor and preview"
```

---

### Task 34: Add window state persistence

**Files:**
- Modify: `src/main/index.js`

**Step 1: Install electron-window-state**

```bash
npm install electron-window-state
```

**Step 2: Use in main process**

```js
import windowStateKeeper from 'electron-window-state'

// In createWindow():
const windowState = windowStateKeeper({
  defaultWidth: 1200,
  defaultHeight: 800
})

mainWindow = new BrowserWindow({
  x: windowState.x,
  y: windowState.y,
  width: windowState.width,
  height: windowState.height,
  // ... rest of options
})

windowState.manage(mainWindow)
```

**Step 3: Verify — move/resize window, close, reopen — position restored**

**Step 4: Commit**

```bash
git add src/main/index.js package.json package-lock.json
git commit -m "Add window position and size persistence"
```

---

### Task 35: Enhance status bar

**Files:**
- Modify: `src/renderer/components/StatusBar.jsx`
- Modify: `tests/components/StatusBar.test.jsx`

**Step 1: Add dirty indicator test**

Add to existing StatusBar tests:

```jsx
it('shows dirty indicator when file has unsaved changes', () => {
  render(<StatusBar filename="notes.md *" wordCount={10} mode="edit" />)
  expect(screen.getByText('notes.md *')).toBeTruthy()
})
```

**Step 2: Run tests to verify they pass** (filename already includes * from App.jsx)

**Step 3: Commit**

```bash
git add src/renderer/components/StatusBar.jsx tests/components/StatusBar.test.jsx
git commit -m "Add dirty indicator test for status bar"
```

---

### Task 36: Phase 4 verification and merge

**Step 1: Run all tests**

```bash
npx vitest run
```

**Step 2: Manual verification**

- [ ] Ctrl+S saves immediately
- [ ] Ctrl+Shift+P toggles between edit and preview mode
- [ ] Scroll sync works approximately between panes
- [ ] Window position/size persists between sessions
- [ ] Status bar shows dirty indicator

**Step 3: Merge to develop**

```bash
git checkout develop
git merge --no-ff feature/polish -m "Merge feature/polish: shortcuts, scroll sync, window state"
```

---

## Phase 5: Extended Rendering (Deferred)

> Branch: `feature/extended-rendering` (off `develop`)
> Implementation deferred — documented for future reference.

### Task 37: Mermaid diagram support

**Dependencies:** `mermaid`

**Approach:** After markdown-it renders, post-process any `<code class="language-mermaid">` blocks. Replace them with rendered SVG using mermaid's `render()` API.

**Files:**
- Modify: `src/renderer/hooks/useMarkdown.js` (or create a post-processor)
- Modify: `src/renderer/components/Preview.jsx`

**Key consideration:** Mermaid rendering is async and requires DOM access. It should run as a `useEffect` after the preview HTML is set, targeting mermaid code blocks and replacing them with SVGs.

---

### Task 38: KaTeX math rendering

**Dependencies:** `katex`, `markdown-it-katex` (or `markdown-it-texmath`)

**Approach:** Add a markdown-it plugin that recognizes `$...$` (inline) and `$$...$$` (display) math syntax and renders via KaTeX.

**Files:**
- Modify: `src/renderer/hooks/useMarkdown.js`
- Add: KaTeX CSS import to `src/renderer/main.jsx`

---

## Dependency Summary

### Production

```
react, react-dom
codemirror, @codemirror/lang-markdown, @codemirror/theme-one-dark, @codemirror/language
markdown-it, markdown-it-task-lists, highlight.js
clsx, tailwind-merge
motion
electron-window-state
```

### Development

```
electron, electron-builder, electron-vite
vite, @vitejs/plugin-react
tailwindcss, @tailwindcss/vite
vitest, @testing-library/react, @testing-library/jest-dom, jsdom
```

### Phase 5 (future)

```
mermaid
katex, markdown-it-texmath
```
