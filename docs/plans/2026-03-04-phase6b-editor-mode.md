# Phase 6b: Editor Mode + @ Autocomplete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `--editor-mode` for Claude Code's Ctrl+G integration, and `@` file reference autocomplete in all editing modes.

**Architecture:** Main process detects `--editor-mode` flag, skips single-instance lock, creates a dedicated window. Renderer conditionally hides sidebar/tab bar and wires Ctrl+Enter (submit) / Esc (cancel). A new `list-project-files` IPC handler walks the project tree returning all files (not just `.md`). CodeMirror's `autocompletion` extension gets a custom completion source triggered by `@` that fuzzy-matches project files.

**Tech Stack:** Electron IPC, CodeMirror 6 (`@codemirror/autocomplete`), React hooks, Vitest + jsdom

---

## Progress

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | `listProjectFiles` main process module | DONE | 00c71b5 |
| 2 | `list-project-files` IPC + preload | DONE | c0eba3e |
| 3 | `@` autocomplete completion source | DONE | 5e9ebd3 |
| 4 | Wire autocomplete into Editor | DONE | 1e0e8da |
| 5 | Editor mode flag detection + window | DONE | f02ace1 |
| 6 | Editor mode IPC handlers (submit/cancel) | DONE | 33e1d1e |
| 7 | Editor mode preload exposures | DONE | 9f146c6 |
| 8 | `useEditorMode` hook | DONE | 7e0a4d7 |
| 9 | App.jsx editor mode layout | DONE | 748ae31 |
| 10 | StatusBar editor mode indicator | DONE | 02b843d |
| 11 | Full integration verification | DONE | — |

---

## Task 1: `listProjectFiles` Main Process Module

**Files:**
- Create: `src/main/listProjectFiles.js`
- Test: `tests/main/listProjectFiles.test.js`

This module walks a directory tree recursively and returns a flat array of relative file paths. Unlike `dirTree.js` (which returns only `.md` in a tree structure), this returns ALL files as flat relative paths for autocomplete.

**Step 1: Write the failing test**

```js
// tests/main/listProjectFiles.test.js

// ABOUTME: Tests for the project file lister used by @ autocomplete.
// ABOUTME: Verifies recursive listing, directory skipping, and relative paths.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { listProjectFiles } from '../../src/main/listProjectFiles.js'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('listProjectFiles', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'listfiles-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('returns empty array for empty directory', async () => {
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual([])
  })

  it('returns all file types as relative paths', async () => {
    await writeFile(join(tempDir, 'index.js'), '')
    await writeFile(join(tempDir, 'README.md'), '')
    await writeFile(join(tempDir, 'style.css'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual(expect.arrayContaining(['index.js', 'README.md', 'style.css']))
    expect(result).toHaveLength(3)
  })

  it('returns nested files with relative paths', async () => {
    const sub = join(tempDir, 'src')
    await mkdir(sub)
    await writeFile(join(sub, 'app.js'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toContain('src/app.js')
  })

  it('skips node_modules, .git, out, dist, build', async () => {
    for (const name of ['node_modules', '.git', 'out', 'dist', 'build']) {
      const sub = join(tempDir, name)
      await mkdir(sub)
      await writeFile(join(sub, 'file.js'), '')
    }
    await writeFile(join(tempDir, 'keep.js'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual(['keep.js'])
  })

  it('sorts results alphabetically', async () => {
    await writeFile(join(tempDir, 'z.js'), '')
    await writeFile(join(tempDir, 'a.js'), '')
    const sub = join(tempDir, 'src')
    await mkdir(sub)
    await writeFile(join(sub, 'b.js'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual(['a.js', 'src/b.js', 'z.js'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/listProjectFiles.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// src/main/listProjectFiles.js

// ABOUTME: Walks a directory tree and returns a flat list of all file paths.
// ABOUTME: Used by @ autocomplete to provide file reference suggestions.

import { readdir } from 'fs/promises'
import { join, relative } from 'path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'build'])

export async function listProjectFiles(rootPath) {
  const results = []
  await walk(rootPath, rootPath, results)
  return results.sort()
}

async function walk(currentPath, rootPath, results) {
  const entries = await readdir(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walk(fullPath, rootPath, results)
      }
    } else if (entry.isFile()) {
      results.push(relative(rootPath, fullPath).replace(/\\/g, '/'))
    }
  }
}
```

Note: `.replace(/\\/g, '/')` normalizes Windows backslashes to forward slashes for consistent `@` references.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/listProjectFiles.test.js`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/main/listProjectFiles.js tests/main/listProjectFiles.test.js
git commit -m "Add listProjectFiles for @ autocomplete file lookup"
```

---

## Task 2: `list-project-files` IPC Handler + Preload

**Files:**
- Modify: `src/main/index.js` (add IPC handler)
- Modify: `src/preload/index.js` (add preload exposure)

**Step 1: No separate test** — IPC handlers are tested via Electron integration (manual). This task wires the module from Task 1 into the IPC layer.

**Step 2: Add import and handler to main process**

In `src/main/index.js`:

Add import at top (after existing imports):
```js
import { listProjectFiles } from './listProjectFiles.js'
```

Add IPC handler inside `registerIpcHandlers()` (after the `write-file-at` handler):
```js
  ipcMain.handle('list-project-files', async () => {
    if (!projectRoot) return []
    try {
      return await listProjectFiles(projectRoot)
    } catch {
      return []
    }
  })
```

**Step 3: Add preload exposure**

In `src/preload/index.js`, add to the `api` object:
```js
  // File listing for @ autocomplete
  listProjectFiles: () => ipcRenderer.invoke('list-project-files'),
```

**Step 4: Run all tests to verify nothing is broken**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All 82+ tests PASS

**Step 5: Commit**

```bash
git add src/main/index.js src/preload/index.js
git commit -m "Wire listProjectFiles IPC handler and preload exposure"
```

---

## Task 3: `@` Autocomplete Completion Source

**Files:**
- Create: `src/renderer/editor/fileCompletionSource.js`
- Test: `tests/editor/fileCompletionSource.test.js`

This is a CodeMirror completion source function. It triggers when the user types `@` followed by characters. It calls `window.api.listProjectFiles()` to get the file list, then filters by the typed query.

**Step 1: Write the failing test**

```js
// tests/editor/fileCompletionSource.test.js

// ABOUTME: Tests for the @ file reference autocomplete completion source.
// ABOUTME: Verifies trigger detection, file matching, and result formatting.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFileCompletionSource } from '../../src/renderer/editor/fileCompletionSource.js'

describe('createFileCompletionSource', () => {
  let completionSource
  let mockListFiles

  beforeEach(() => {
    mockListFiles = vi.fn().mockResolvedValue([
      'src/main/index.js',
      'src/renderer/App.jsx',
      'CLAUDE.md',
      'package.json',
      'docs/plans/design.md'
    ])
    completionSource = createFileCompletionSource(mockListFiles)
  })

  function makeContext(docText, pos, explicit = false) {
    return {
      state: { doc: { toString: () => docText, length: docText.length } },
      pos,
      explicit,
      matchBefore: (regex) => {
        const textBefore = docText.slice(0, pos)
        const match = textBefore.match(regex)
        if (!match) return null
        return { from: pos - match[0].length, to: pos, text: match[0] }
      }
    }
  }

  it('returns null when no @ prefix found', async () => {
    const result = await completionSource(makeContext('hello world', 11))
    expect(result).toBeNull()
  })

  it('returns all files when just @ is typed', async () => {
    const result = await completionSource(makeContext('check @', 7))
    expect(result).not.toBeNull()
    expect(result.from).toBe(6)
    expect(result.options).toHaveLength(5)
    expect(result.options[0].label).toBe('CLAUDE.md')
  })

  it('filters files by typed query after @', async () => {
    const result = await completionSource(makeContext('look at @App', 12))
    expect(result).not.toBeNull()
    expect(result.options.some(o => o.label === 'src/renderer/App.jsx')).toBe(true)
  })

  it('inserts @ prefix with the file path', async () => {
    const result = await completionSource(makeContext('see @CL', 7))
    const option = result.options.find(o => o.label === 'CLAUDE.md')
    expect(option.apply).toBe('@CLAUDE.md')
  })

  it('caches file list for subsequent calls within cache window', async () => {
    await completionSource(makeContext('see @a', 5))
    await completionSource(makeContext('see @ab', 6))
    expect(mockListFiles).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/fileCompletionSource.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// src/renderer/editor/fileCompletionSource.js

// ABOUTME: CodeMirror completion source for @ file references.
// ABOUTME: Triggers on @, fetches project file list, and fuzzy-filters results.

const CACHE_TTL = 5000

export function createFileCompletionSource(listFiles) {
  let cachedFiles = null
  let cacheTime = 0

  return async function fileCompletionSource(context) {
    const match = context.matchBefore(/@[\w./\-]*/)
    if (!match) return null

    const query = match.text.slice(1).toLowerCase()

    if (!cachedFiles || Date.now() - cacheTime > CACHE_TTL) {
      cachedFiles = await listFiles()
      cacheTime = Date.now()
    }

    const filtered = cachedFiles.filter(f => f.toLowerCase().includes(query))

    return {
      from: match.from,
      options: filtered.map(f => ({
        label: f,
        apply: `@${f}`,
        type: 'file'
      })),
      filter: false
    }
  }
}
```

Note: `filter: false` because we do our own filtering. The `from` is set to `match.from` (the `@` position) so the entire `@query` gets replaced with `@path`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/fileCompletionSource.test.js`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/renderer/editor/fileCompletionSource.js tests/editor/fileCompletionSource.test.js
git commit -m "Add @ file reference autocomplete completion source"
```

---

## Task 4: Wire Autocomplete Into Editor Component

**Files:**
- Modify: `src/renderer/components/Editor.jsx`

This task adds the `@` autocomplete extension to the CodeMirror editor. The `autocompletion` extension is already included via `basicSetup`, but we need to add our custom completion source as an override.

**Step 1: No separate test** — The completion source is tested in Task 3. Wiring it into Editor is integration-level (manual verification). Run existing Editor tests to verify no regression.

**Step 2: Modify Editor.jsx**

Add import at top:
```js
import { autocompletion } from '@codemirror/autocomplete'
import { createFileCompletionSource } from '../editor/fileCompletionSource'
```

Create the completion source outside the component (module-level, since `window.api` is stable):
```js
const fileCompletion = createFileCompletionSource(
  () => window.api?.listProjectFiles() ?? Promise.resolve([])
)
```

Add the autocomplete extension to the `extensions` array in the `EditorState.create` call:
```js
    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        updateListener,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        autocompletion({
          override: [fileCompletion],
          activateOnTyping: true
        })
      ]
    })
```

**Step 3: Run all tests**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS (existing Editor tests still pass)

**Step 4: Commit**

```bash
git add src/renderer/components/Editor.jsx
git commit -m "Wire @ file autocomplete into CodeMirror editor"
```

---

## Task 5: Editor Mode Flag Detection + Window Config

**Files:**
- Modify: `src/main/index.js`

This is the core editor mode change in the main process. When `--editor-mode` is detected:
- Skip single-instance lock
- Create a smaller dedicated window (600×800)
- Store editor mode state and temp file path

**Step 1: No separate test** — Editor mode detection requires Electron runtime (manual test). We verify by running the full test suite to ensure no regressions.

**Step 2: Modify `src/main/index.js`**

Add module-level variables (after existing `let` declarations):
```js
let isEditorMode = false
let editorFilePath = null
```

Modify `parseFilePath()` to also detect `--editor-mode`:
```js
function parseCliArgs() {
  const args = process.argv.slice(isDev ? 2 : 1)
  isEditorMode = args.includes('--editor-mode')
  const fileArg = args.find(arg => !arg.startsWith('-'))
  if (fileArg) {
    const resolved = resolve(fileArg)
    if (isEditorMode) {
      editorFilePath = resolved
    }
    return resolved
  }
  return null
}
```

Rename `parseFilePath` → `parseCliArgs` and update the call in `app.whenReady()`.

Modify `createWindow()` to handle editor mode:
```js
function createWindow() {
  if (isEditorMode) {
    const title = 'Editing Prompt — MD Viewer'
    mainWindow = new BrowserWindow({
      width: 600,
      height: 800,
      center: true,
      title,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })
  } else {
    // existing window creation code (with windowStateKeeper)
    const title = filePath ? `${basename(filePath)} — MD Viewer` : 'MD Viewer'
    const windowState = windowStateKeeper({
      defaultWidth: 1200,
      defaultHeight: 800
    })
    mainWindow = new BrowserWindow({
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      title,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    windowState.manage(mainWindow)
  }

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
```

Modify the single-instance lock section to skip when in editor mode:
```js
const gotTheLock = isEditorMode ? true : app.requestSingleInstanceLock()
```

**Important:** `parseCliArgs()` must be called BEFORE the single-instance lock check, since `isEditorMode` determines whether to request the lock. Move the parse call to module level:

```js
// Module-level (before gotTheLock)
filePath = parseCliArgs()
```

And remove the `filePath = parseFilePath()` call from inside `app.whenReady()`.

**Step 3: Run all tests**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/main/index.js
git commit -m "Add editor mode flag detection and dedicated window config"
```

---

## Task 6: Editor Mode IPC Handlers (Submit/Cancel)

**Files:**
- Modify: `src/main/index.js`

Add two new IPC handlers and the `get-editor-mode` handler. The submit handler writes content and quits. The cancel handler restores original content and quits.

**Step 1: No separate test** — These handlers call `app.quit()` which requires Electron runtime.

**Step 2: Add `originalEditorContent` variable**

Add to module-level variables:
```js
let originalEditorContent = null
```

In `app.whenReady()`, after `filePath = parseCliArgs()` has already run at module level, load the original content:
```js
    if (isEditorMode && editorFilePath) {
      originalEditorContent = await readFileContent(editorFilePath)
    }
```

**Step 3: Add IPC handlers inside `registerIpcHandlers()`**

```js
  ipcMain.handle('get-editor-mode', () => ({
    isEditorMode,
    filePath: editorFilePath
  }))

  ipcMain.handle('submit-editor', async (_event, content) => {
    if (!isEditorMode || !editorFilePath) return
    await writeFileContent(editorFilePath, content)
    app.quit()
  })

  ipcMain.handle('cancel-editor', async () => {
    if (!isEditorMode || !editorFilePath) return
    if (originalEditorContent !== null) {
      await writeFileContent(editorFilePath, originalEditorContent)
    }
    app.quit()
  })
```

**Step 4: Run all tests**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/main/index.js
git commit -m "Add editor mode submit and cancel IPC handlers"
```

---

## Task 7: Editor Mode Preload Exposures

**Files:**
- Modify: `src/preload/index.js`

**Step 1: Add new API methods to the preload bridge**

```js
  // Editor mode
  getEditorMode: () => ipcRenderer.invoke('get-editor-mode'),
  submitEditor: (content) => ipcRenderer.invoke('submit-editor', content),
  cancelEditor: () => ipcRenderer.invoke('cancel-editor'),
```

**Step 2: Run all tests**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/preload/index.js
git commit -m "Expose editor mode APIs in preload bridge"
```

---

## Task 8: `useEditorMode` Hook

**Files:**
- Create: `src/renderer/hooks/useEditorMode.js`
- Test: `tests/hooks/useEditorMode.test.js`

This hook fetches editor mode state on mount and provides submit/cancel actions.

**Step 1: Write the failing test**

```js
// tests/hooks/useEditorMode.test.js

// ABOUTME: Tests for the editor mode hook that manages submit/cancel flow.
// ABOUTME: Verifies state fetching, submit, and cancel behavior.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEditorMode } from '../../src/renderer/hooks/useEditorMode.js'

describe('useEditorMode', () => {
  beforeEach(() => {
    window.api = {
      getEditorMode: vi.fn().mockResolvedValue({
        isEditorMode: true,
        filePath: '/tmp/prompt.md'
      }),
      submitEditor: vi.fn().mockResolvedValue(undefined),
      cancelEditor: vi.fn().mockResolvedValue(undefined)
    }
  })

  it('fetches editor mode state on mount', async () => {
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => {
      expect(result.current.isEditorMode).toBe(true)
    })
    expect(result.current.filePath).toBe('/tmp/prompt.md')
  })

  it('returns false when not in editor mode', async () => {
    window.api.getEditorMode.mockResolvedValue({
      isEditorMode: false,
      filePath: null
    })
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => {
      expect(result.current.isEditorMode).toBe(false)
    })
  })

  it('calls submitEditor with content', async () => {
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => expect(result.current.isEditorMode).toBe(true))
    await act(async () => {
      await result.current.submit('edited prompt content')
    })
    expect(window.api.submitEditor).toHaveBeenCalledWith('edited prompt content')
  })

  it('calls cancelEditor', async () => {
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => expect(result.current.isEditorMode).toBe(true))
    await act(async () => {
      await result.current.cancel()
    })
    expect(window.api.cancelEditor).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hooks/useEditorMode.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// src/renderer/hooks/useEditorMode.js

// ABOUTME: Manages editor mode state for Claude Code's Ctrl+G integration.
// ABOUTME: Provides submit (Ctrl+Enter) and cancel (Esc) actions.

import { useState, useEffect, useCallback } from 'react'

export function useEditorMode() {
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [filePath, setFilePath] = useState(null)

  useEffect(() => {
    async function init() {
      if (!window.api?.getEditorMode) return
      const mode = await window.api.getEditorMode()
      setIsEditorMode(mode.isEditorMode)
      setFilePath(mode.filePath)
    }
    init()
  }, [])

  const submit = useCallback(async (content) => {
    if (!window.api?.submitEditor) return
    await window.api.submitEditor(content)
  }, [])

  const cancel = useCallback(async () => {
    if (!window.api?.cancelEditor) return
    await window.api.cancelEditor()
  }, [])

  return { isEditorMode, filePath, submit, cancel }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hooks/useEditorMode.test.js`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/renderer/hooks/useEditorMode.js tests/hooks/useEditorMode.test.js
git commit -m "Add useEditorMode hook for submit and cancel flow"
```

---

## Task 9: App.jsx Editor Mode Layout

**Files:**
- Modify: `src/renderer/App.jsx`

In editor mode: hide sidebar, hide tab bar, auto-open the prompt file with tab label `● Prompt`, wire Ctrl+Enter to submit, wire Esc to cancel.

**Step 1: No separate test** — App.jsx is integration-level. Existing tests verify components individually. Manual verification in Electron.

**Step 2: Add imports**

```js
import { useEditorMode } from './hooks/useEditorMode'
```

**Step 3: Add hook call in App component**

After existing hook calls:
```js
  const { isEditorMode, filePath: editorFilePath, submit, cancel } = useEditorMode()
```

**Step 4: Modify init effect**

Replace the existing init effect with one that handles editor mode:
```js
  useEffect(() => {
    async function init() {
      if (!window.api) return
      if (isEditorMode && editorFilePath) {
        openTab(editorFilePath)
        return
      }
      const info = await window.api.getProjectInfo()
      setCurrentProject(info.projectRoot)
      setGlobalDir(info.globalDir)
      const projs = await window.api.getProjects()
      setProjects(projs)
      const fp = await window.api.getFilePath()
      if (fp) openTab(fp)
    }
    init()
  }, [openTab, isEditorMode, editorFilePath])
```

**Step 5: Modify keyboard handler**

Add editor mode keybindings to the existing `handleKeyDown`:
```js
      // Editor mode: Ctrl+Enter to submit
      if (isEditorMode && e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        if (activeTab) submit(activeTab.content)
        return
      }
      // Editor mode: Esc to cancel
      if (isEditorMode && e.key === 'Escape') {
        e.preventDefault()
        cancel()
        return
      }
```

Add `isEditorMode, submit, cancel, activeTab` to the effect's dependency array.

**Step 6: Modify JSX layout**

Conditionally hide sidebar and tab bar:
```jsx
  // In editor mode, override the tab display name
  const displayFilename = isEditorMode
    ? '● Prompt'
    : (activeTab ? (activeTab.dirty ? `${activeTab.filename} *` : activeTab.filename) : 'No file open')
```

In the JSX, wrap sidebar in `!isEditorMode` check:
```jsx
        {sidebarVisible && !isEditorMode && (
          <div className="w-[220px] shrink-0">
            <Sidebar ... />
          </div>
        )}
```

Hide TabBar in editor mode:
```jsx
          {!isEditorMode && (
            <TabBar ... />
          )}
```

Use `displayFilename` instead of `statusFilename` in the StatusBar.

**Step 7: Run all tests**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS

**Step 8: Commit**

```bash
git add src/renderer/App.jsx
git commit -m "Wire editor mode layout with submit and cancel keybindings"
```

---

## Task 10: StatusBar Editor Mode Indicator

**Files:**
- Modify: `src/renderer/components/StatusBar.jsx`
- Test: `tests/components/StatusBar.test.jsx`

**Step 1: Write the failing test**

Add to `tests/components/StatusBar.test.jsx`:
```js
  it('shows editor mode indicator when editorMode is true', () => {
    render(<StatusBar filename="● Prompt" wordCount={10} mode="edit" editorMode={true} />)
    expect(screen.getByText(/EDITOR MODE/)).toBeInTheDocument()
    expect(screen.getByText(/Ctrl\+Enter to submit/)).toBeInTheDocument()
    expect(screen.getByText(/Esc to cancel/)).toBeInTheDocument()
  })

  it('does not show editor mode indicator when editorMode is false', () => {
    render(<StatusBar filename="test.md" wordCount={5} mode="edit" editorMode={false} />)
    expect(screen.queryByText(/EDITOR MODE/)).not.toBeInTheDocument()
  })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/StatusBar.test.jsx`
Expected: FAIL — editor mode indicator not rendered

**Step 3: Modify StatusBar.jsx**

Add `editorMode` prop and render indicator:
```jsx
export default function StatusBar({ filename, wordCount, mode, saveStatus, editorMode }) {
  return (
    <div className="h-6 bg-surface border-t border-border px-3 flex items-center justify-between text-xs text-text-muted select-none">
      <div className="flex items-center gap-3">
        {editorMode && (
          <span className="text-accent font-medium">● EDITOR MODE</span>
        )}
        <span>{filename}</span>
        {saveStatus === 'saved' && <span className="text-accent">Saved</span>}
        <span>{wordCount} words</span>
      </div>
      <div>
        {editorMode ? (
          <span className="text-text-muted">
            Ctrl+Enter to submit · Esc to cancel
          </span>
        ) : (
          <span className={cn(
            'uppercase tracking-wider',
            mode === 'edit' ? 'text-accent' : 'text-text-muted'
          )}>
            {mode}
          </span>
        )}
      </div>
    </div>
  )
}
```

Also update `App.jsx` to pass `editorMode={isEditorMode}` to StatusBar.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/StatusBar.test.jsx`
Expected: PASS

**Step 5: Run all tests**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/renderer/components/StatusBar.jsx tests/components/StatusBar.test.jsx src/renderer/App.jsx
git commit -m "Add editor mode indicator to status bar"
```

---

## Task 11: Full Integration Verification

**Files:** None — verification only

**Step 1: Run the full test suite**

Run: `NODE_OPTIONS="--max-old-space-size=4096" npx vitest run`
Expected: All tests PASS (82 existing + new tests from this plan)

**Step 2: Manual Electron verification checklist**

Run `npm run dev` and verify:
1. Normal mode works as before (sidebar, tabs, file editing)
2. Typing `@` in the editor shows autocomplete dropdown with project files
3. Selecting a completion inserts `@path/to/file`
4. Autocomplete works in all modes (not just editor mode)

Then test editor mode:
1. Create a temp file: `echo "test prompt" > /tmp/test-prompt.md`
2. Run: `npm run dev -- --editor-mode /tmp/test-prompt.md`
3. Verify: smaller window, no sidebar, no tab bar
4. Verify: status bar shows "● EDITOR MODE · Ctrl+Enter to submit · Esc to cancel"
5. Verify: file content loads in editor with preview
6. Edit content, press Ctrl+Enter → window closes, file updated
7. Repeat, press Esc → window closes, file content restored to original

**Step 3: Update progress table at top of this document**

Mark all tasks DONE with commit hashes.

**Step 4: Commit plan update**

```bash
git add docs/plans/2026-03-04-phase6b-editor-mode.md
git commit -m "Update Phase 6b plan with completion status"
```
