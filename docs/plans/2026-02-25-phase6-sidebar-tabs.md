# Phase 6a: Sidebar + Tabs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a collapsible file-tree sidebar and multi-tab editor to md-viewer, turning it into a Claude Code companion app.

**Architecture:** New left sidebar shows `~/.claude/` and the current project's `.md` files in a collapsible tree. A tab bar replaces the single-file model — `useFileManager` manages open tabs. `App.jsx` is refactored to compose sidebar + tabs + existing editor/preview. Three new main-process modules handle directory tree reading, project root detection, and recent-project history.

**Tech Stack:** Electron, React, Vitest, electron-vite, existing IPC/preload patterns

**Reference docs:**
- Design: `docs/plans/2026-02-25-claude-code-companion-design.md`
- Project rules: `CLAUDE.md`

---

## Progress

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Create feature branch | — | — |
| 2 | Add dirTree.js (TDD) | — | — |
| 3 | Add projectRoot.js (TDD) | — | — |
| 4 | Add projectHistory.js (TDD) | — | — |
| 5 | Wire new IPC handlers in main | — | — |
| 6 | Expand preload API | — | — |
| 7 | Build useFileManager hook (TDD) | — | — |
| 8 | Build useProjectTree hook (TDD) | — | — |
| 9 | Build FileTreeNode component (TDD) | — | — |
| 10 | Build FileTree component (TDD) | — | — |
| 11 | Build ProjectSwitcher component (TDD) | — | — |
| 12 | Build Sidebar component | — | — |
| 13 | Build TabBar component (TDD) | — | — |
| 14 | Refactor App.jsx | — | — |
| 15 | Phase 6a verification and merge | — | — |

---

## Task 1: Create feature branch

```bash
git checkout develop
git checkout -b feature/claude-code-companion
```

---

## Task 2: Add dirTree.js

**Files:**
- Create: `src/main/dirTree.js`
- Create: `tests/main/dirTree.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for the directory tree reader used by the sidebar file browser.
// ABOUTME: Verifies .md filtering, directory skipping, and sort order.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readDirTree } from '../../src/main/dirTree.js'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('readDirTree', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dirtree-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('returns empty array for empty directory', async () => {
    const result = await readDirTree(tempDir)
    expect(result).toEqual([])
  })

  it('returns .md files', async () => {
    await writeFile(join(tempDir, 'foo.md'), '')
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'foo.md', type: 'file' })
  })

  it('skips non-.md files', async () => {
    await writeFile(join(tempDir, 'foo.md'), '')
    await writeFile(join(tempDir, 'bar.js'), '')
    await writeFile(join(tempDir, 'baz.txt'), '')
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(1)
  })

  it('returns nested directory containing .md files', async () => {
    const sub = join(tempDir, 'agents')
    await mkdir(sub)
    await writeFile(join(sub, 'foo.md'), '')
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'agents', type: 'dir' })
    expect(result[0].children).toHaveLength(1)
  })

  it('omits directories with no .md descendants', async () => {
    const sub = join(tempDir, 'empty-dir')
    await mkdir(sub)
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(0)
  })

  it('skips node_modules, .git, out, dist, build', async () => {
    for (const name of ['node_modules', '.git', 'out', 'dist', 'build']) {
      const sub = join(tempDir, name)
      await mkdir(sub)
      await writeFile(join(sub, 'foo.md'), '')
    }
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(0)
  })

  it('sorts directories before files alphabetically', async () => {
    await writeFile(join(tempDir, 'z.md'), '')
    await writeFile(join(tempDir, 'a.md'), '')
    const sub = join(tempDir, 'mdocs')
    await mkdir(sub)
    await writeFile(join(sub, 'x.md'), '')
    const result = await readDirTree(tempDir)
    expect(result[0].type).toBe('dir')
    expect(result[1].name).toBe('a.md')
    expect(result[2].name).toBe('z.md')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/dirTree.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement dirTree.js**

```js
// ABOUTME: Reads a directory tree filtered to .md files for the sidebar file browser.
// ABOUTME: Recursively walks directories, skipping common build/dependency folders.

import { readdir } from 'fs/promises'
import { join } from 'path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'build'])

export async function readDirTree(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })

  const dirs = entries
    .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  const files = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))

  const dirNodes = await Promise.all(
    dirs.map(async dir => {
      const childPath = join(dirPath, dir.name)
      const children = await readDirTree(childPath)
      if (children.length === 0) return null
      return { name: dir.name, path: childPath, type: 'dir', children }
    })
  )

  const fileNodes = files.map(file => ({
    name: file.name,
    path: join(dirPath, file.name),
    type: 'file'
  }))

  return [...dirNodes.filter(Boolean), ...fileNodes]
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/main/dirTree.test.js
```

Expected: All 7 tests pass.

**Step 5: Commit**

```bash
git add src/main/dirTree.js tests/main/dirTree.test.js
git commit -m "Add directory tree reader with .md filtering"
```

---

## Task 3: Add projectRoot.js

**Files:**
- Create: `src/main/projectRoot.js`
- Create: `tests/main/projectRoot.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for project root detection by walking up the directory tree.
// ABOUTME: Verifies detection of .git, package.json, and .claude markers.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectProjectRoot } from '../../src/main/projectRoot.js'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('detectProjectRoot', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'projroot-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('detects root from package.json marker', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}')
    const sub = join(tempDir, 'src', 'deep')
    await mkdir(sub, { recursive: true })
    const root = await detectProjectRoot(sub)
    expect(root).toBe(tempDir)
  })

  it('detects root from .git marker', async () => {
    await mkdir(join(tempDir, '.git'))
    const sub = join(tempDir, 'docs')
    await mkdir(sub)
    const root = await detectProjectRoot(sub)
    expect(root).toBe(tempDir)
  })

  it('detects root from .claude marker', async () => {
    await mkdir(join(tempDir, '.claude'))
    const sub = join(tempDir, 'nested')
    await mkdir(sub)
    const root = await detectProjectRoot(sub)
    expect(root).toBe(tempDir)
  })

  it('returns the start path when no marker is found', async () => {
    const root = await detectProjectRoot(tempDir)
    expect(root).toBe(tempDir)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/projectRoot.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement projectRoot.js**

```js
// ABOUTME: Detects the project root by walking up the directory tree.
// ABOUTME: Looks for .git, package.json, or .claude as root markers.

import { access } from 'fs/promises'
import { join, dirname } from 'path'

const MARKERS = ['.git', 'package.json', '.claude']

export async function detectProjectRoot(startPath) {
  let dir = startPath

  while (true) {
    for (const marker of MARKERS) {
      try {
        await access(join(dir, marker))
        return dir
      } catch {
        // marker not found, continue
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return startPath // reached filesystem root
    dir = parent
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/main/projectRoot.test.js
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add src/main/projectRoot.js tests/main/projectRoot.test.js
git commit -m "Add project root detection via marker files"
```

---

## Task 4: Add projectHistory.js

**Files:**
- Create: `src/main/projectHistory.js`
- Create: `tests/main/projectHistory.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for recent projects list persistence.
// ABOUTME: Verifies add, update, sort, and 10-item trim behavior.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getProjects, saveProject } from '../../src/main/projectHistory.js'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('projectHistory', () => {
  let tempDir
  let filePath

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'projhist-test-'))
    filePath = join(tempDir, 'projects.json')
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  describe('getProjects', () => {
    it('returns empty array when file does not exist', async () => {
      const projects = await getProjects(filePath)
      expect(projects).toEqual([])
    })
  })

  describe('saveProject', () => {
    it('adds a new project entry', async () => {
      const projects = await saveProject(filePath, '/path/to/project')
      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({ path: '/path/to/project', name: 'project' })
    })

    it('updates lastOpened for an existing project', async () => {
      await saveProject(filePath, '/path/to/project')
      const before = (await getProjects(filePath))[0].lastOpened
      await new Promise(r => setTimeout(r, 10))
      await saveProject(filePath, '/path/to/project')
      const after = (await getProjects(filePath))[0].lastOpened
      expect(after > before).toBe(true)
    })

    it('does not create duplicate entries', async () => {
      await saveProject(filePath, '/path/to/project')
      await saveProject(filePath, '/path/to/project')
      const projects = await getProjects(filePath)
      expect(projects).toHaveLength(1)
    })

    it('sorts projects by lastOpened descending', async () => {
      await saveProject(filePath, '/path/old')
      await new Promise(r => setTimeout(r, 10))
      await saveProject(filePath, '/path/new')
      const projects = await getProjects(filePath)
      expect(projects[0].path).toBe('/path/new')
    })

    it('trims to 10 entries', async () => {
      for (let i = 0; i < 12; i++) {
        await saveProject(filePath, `/path/project-${i}`)
      }
      const projects = await getProjects(filePath)
      expect(projects).toHaveLength(10)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/main/projectHistory.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement projectHistory.js**

```js
// ABOUTME: Manages the recent projects list persisted to a JSON file.
// ABOUTME: Stores up to 10 projects sorted by last opened time.

import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname, basename } from 'path'

const MAX_PROJECTS = 10

export async function getProjects(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function saveProject(filePath, projectPath) {
  const projects = await getProjects(filePath)
  const name = basename(projectPath)
  const now = new Date().toISOString()

  const idx = projects.findIndex(p => p.path === projectPath)
  if (idx >= 0) {
    projects[idx].lastOpened = now
  } else {
    projects.push({ path: projectPath, name, lastOpened: now })
  }

  projects.sort((a, b) => b.lastOpened.localeCompare(a.lastOpened))
  const trimmed = projects.slice(0, MAX_PROJECTS)

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(trimmed, null, 2), 'utf-8')
  return trimmed
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/main/projectHistory.test.js
```

Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/main/projectHistory.js tests/main/projectHistory.test.js
git commit -m "Add recent projects history with sorted persistence"
```

---

## Task 5: Wire new IPC handlers in main

**Files:**
- Modify: `src/main/index.js`

**Step 1: Add imports at the top**

Add these to the existing imports in `src/main/index.js`:

```js
import { homedir } from 'os'
import { dirname } from 'path'  // add dirname to existing path import
import { readDirTree } from './dirTree.js'
import { detectProjectRoot } from './projectRoot.js'
import { getProjects, saveProject } from './projectHistory.js'
import { join as joinPath } from 'path'  // already imported as join — just add to existing destructure
```

Note: `join` is already imported. Add `dirname` and `homedir` to the imports. Add the three new module imports.

**Step 2: Add projectRoot variable and detection**

After `let filePath = null`, add:

```js
let projectRoot = null
const projectsFile = joinPath(app.getPath('userData'), 'projects.json')
const globalDir = joinPath(homedir(), '.claude')
```

Wait — `app.getPath` isn't available before `app.whenReady()`. Move `projectsFile` and `globalDir` inside `app.whenReady()`. Add after `filePath = parseFilePath()`:

```js
const startPath = filePath ? dirname(filePath) : process.cwd()
projectRoot = await detectProjectRoot(startPath)
if (projectRoot) {
  const projectsFile = join(app.getPath('userData'), 'projects.json')
  await saveProject(projectsFile, projectRoot)
}
```

And store `projectsFile` as a module-level variable for use in IPC handlers:

```js
let projectsFilePath = null
```

Set it in `app.whenReady()`:

```js
projectsFilePath = join(app.getPath('userData'), 'projects.json')
```

**Step 3: Add new IPC handlers inside registerIpcHandlers()**

Add these handlers to the existing `registerIpcHandlers()` function:

```js
ipcMain.handle('get-project-info', () => ({
  projectRoot,
  globalDir: join(homedir(), '.claude')
}))

ipcMain.handle('read-dir-tree', async (_event, dirPath) => {
  try {
    return await readDirTree(dirPath)
  } catch {
    return []
  }
})

ipcMain.handle('get-projects', async () => {
  if (!projectsFilePath) return []
  return getProjects(projectsFilePath)
})

ipcMain.handle('save-project', async (_event, projectPath) => {
  if (!projectsFilePath) return
  const projects = await saveProject(projectsFilePath, projectPath)
  projectRoot = projectPath
  return projects
})

ipcMain.handle('browse-for-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('read-file-at', async (_event, filePath) => {
  try {
    return await readFileContent(filePath)
  } catch {
    return ''
  }
})

ipcMain.handle('write-file-at', async (_event, filePath, content) => {
  await writeFileContent(filePath, content)
})
```

**Step 4: Update app.whenReady to detect project root**

The full updated `app.whenReady().then()` block:

```js
app.whenReady().then(async () => {
  filePath = parseFilePath()
  projectsFilePath = join(app.getPath('userData'), 'projects.json')

  const startPath = filePath ? dirname(filePath) : process.cwd()
  projectRoot = await detectProjectRoot(startPath)
  if (projectRoot) {
    await saveProject(projectsFilePath, projectRoot)
  }

  registerIpcHandlers()
  createWindow()
  startFileWatcher()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
```

**Step 5: Run all tests to make sure nothing broke**

```bash
npx vitest run
```

Expected: All existing tests still pass.

**Step 6: Commit**

```bash
git add src/main/index.js
git commit -m "Add IPC handlers for dir tree, project info, and file-at operations"
```

---

## Task 6: Expand preload API

**Files:**
- Modify: `src/preload/index.js`

**Step 1: Replace the preload file contents**

```js
// ABOUTME: Preload script that bridges main and renderer processes.
// ABOUTME: Exposes a safe API via contextBridge for file operations and IPC.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Existing file operations
  getFilePath: () => ipcRenderer.invoke('get-file-path'),
  readFile: () => ipcRenderer.invoke('read-file'),
  writeFile: (content) => ipcRenderer.invoke('write-file', content),
  openFile: () => ipcRenderer.invoke('open-file'),
  onFileChanged: (callback) => {
    const handler = (_event, content) => callback(content)
    ipcRenderer.on('file-changed', handler)
    return () => ipcRenderer.removeListener('file-changed', handler)
  },

  // Multi-file tab operations
  readFileAt: (filePath) => ipcRenderer.invoke('read-file-at', filePath),
  writeFileAt: (filePath, content) => ipcRenderer.invoke('write-file-at', filePath, content),

  // Project and directory tree
  getProjectInfo: () => ipcRenderer.invoke('get-project-info'),
  readDirTree: (dirPath) => ipcRenderer.invoke('read-dir-tree', dirPath),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (projectPath) => ipcRenderer.invoke('save-project', projectPath),
  browseForProject: () => ipcRenderer.invoke('browse-for-project'),
})
```

**Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/preload/index.js
git commit -m "Expose dir tree, project, and multi-file APIs in preload"
```

---

## Task 7: Build useFileManager hook

**Files:**
- Create: `src/renderer/hooks/useFileManager.js`
- Create: `tests/hooks/useFileManager.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for the multi-tab file manager hook.
// ABOUTME: Verifies open, close, switch, and content update operations.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileManager } from '@/hooks/useFileManager'

describe('useFileManager', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: {
        readFileAt: vi.fn().mockResolvedValue('# Test Content'),
        writeFileAt: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('starts with no tabs and no active tab', () => {
    const { result } = renderHook(() => useFileManager())
    expect(result.current.tabs).toEqual([])
    expect(result.current.activeTabId).toBeNull()
    expect(result.current.activeTab).toBeNull()
  })

  it('openTab adds a tab and makes it active', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filename).toBe('notes.md')
    expect(result.current.tabs[0].content).toBe('# Test Content')
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
  })

  it('openTab focuses existing tab if path already open', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    const firstId = result.current.tabs[0].id
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.activeTabId).toBe(firstId)
  })

  it('openTab with initialContent skips readFileAt', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md', 'provided content')
    })
    expect(window.api.readFileAt).not.toHaveBeenCalled()
    expect(result.current.tabs[0].content).toBe('provided content')
  })

  it('closeTab removes the tab', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    const tabId = result.current.tabs[0].id
    act(() => { result.current.closeTab(tabId) })
    expect(result.current.tabs).toHaveLength(0)
    expect(result.current.activeTabId).toBeNull()
  })

  it('closeTab switches to adjacent tab when active tab is closed', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/a.md')
      await result.current.openTab('/path/to/b.md')
    })
    const firstId = result.current.tabs[0].id
    const secondId = result.current.tabs[1].id
    act(() => { result.current.closeTab(secondId) })
    expect(result.current.activeTabId).toBe(firstId)
  })

  it('updateContent marks tab dirty and updates content', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    const tabId = result.current.tabs[0].id
    act(() => { result.current.updateContent(tabId, '# Updated') })
    const tab = result.current.tabs.find(t => t.id === tabId)
    expect(tab.content).toBe('# Updated')
    expect(tab.dirty).toBe(true)
  })

  it('setActiveTab switches the active tab', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/a.md')
      await result.current.openTab('/path/to/b.md')
    })
    const firstId = result.current.tabs[0].id
    act(() => { result.current.setActiveTab(firstId) })
    expect(result.current.activeTabId).toBe(firstId)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useFileManager.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement useFileManager.js**

```js
// ABOUTME: Manages multiple open file tabs with content, dirty state, and auto-save.
// ABOUTME: Provides open/close/switch/update operations for the tab-based editor.

import { useState, useCallback, useEffect, useRef } from 'react'

const SAVE_DELAY = 500

function makeTab(path, filename, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    path,
    filename,
    content,
    dirty: false
  }
}

export function useFileManager() {
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const tabsRef = useRef(tabs)
  const saveTimersRef = useRef({})

  useEffect(() => { tabsRef.current = tabs }, [tabs])

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  const openTab = useCallback(async (path, initialContent = null) => {
    const existing = tabsRef.current.find(t => t.path === path)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }
    const filename = path.split(/[/\\]/).pop()
    let content = initialContent
    if (content === null) {
      content = (await window.api?.readFileAt(path)) ?? ''
    }
    const tab = makeTab(path, filename, content)
    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
  }, [])

  const closeTab = useCallback((tabId) => {
    if (saveTimersRef.current[tabId]) {
      clearTimeout(saveTimersRef.current[tabId])
      delete saveTimersRef.current[tabId]
    }
    setTabs(prev => prev.filter(t => t.id !== tabId))
    setActiveTabId(prevActive => {
      if (prevActive !== tabId) return prevActive
      const idx = tabsRef.current.findIndex(t => t.id === tabId)
      const remaining = tabsRef.current.filter(t => t.id !== tabId)
      if (remaining.length === 0) return null
      return remaining[Math.min(idx, remaining.length - 1)].id
    })
  }, [])

  const updateContent = useCallback((tabId, newContent) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, content: newContent, dirty: true } : t
    ))
    if (saveTimersRef.current[tabId]) clearTimeout(saveTimersRef.current[tabId])
    saveTimersRef.current[tabId] = setTimeout(async () => {
      const tab = tabsRef.current.find(t => t.id === tabId)
      if (!tab || !window.api?.writeFileAt) return
      await window.api.writeFileAt(tab.path, tab.content)
      setTabs(prev => prev.map(t =>
        t.id === tabId ? { ...t, dirty: false } : t
      ))
      delete saveTimersRef.current[tabId]
    }, SAVE_DELAY)
  }, [])

  const forceSave = useCallback(async (tabId) => {
    if (saveTimersRef.current[tabId]) {
      clearTimeout(saveTimersRef.current[tabId])
      delete saveTimersRef.current[tabId]
    }
    const tab = tabsRef.current.find(t => t.id === tabId)
    if (!tab || !window.api?.writeFileAt) return
    await window.api.writeFileAt(tab.path, tab.content)
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, dirty: false } : t
    ))
  }, [])

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  return { tabs, activeTabId, activeTab, openTab, closeTab, setActiveTab: setActiveTabId, updateContent, forceSave }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/hooks/useFileManager.test.js
```

Expected: All 8 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/hooks/useFileManager.js tests/hooks/useFileManager.test.js
git commit -m "Add useFileManager hook for multi-tab file state"
```

---

## Task 8: Build useProjectTree hook

**Files:**
- Create: `src/renderer/hooks/useProjectTree.js`
- Create: `tests/hooks/useProjectTree.test.js`

**Step 1: Write the failing test**

```js
// ABOUTME: Tests for the project tree hook that fetches .md file trees via IPC.
// ABOUTME: Verifies loading state, tree data, and path change behavior.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjectTree } from '@/hooks/useProjectTree'

const mockTree = [{ name: 'foo.md', path: '/path/foo.md', type: 'file' }]

describe('useProjectTree', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: { readDirTree: vi.fn().mockResolvedValue(mockTree) }
    })
  })

  it('returns empty tree and false loading when dirPath is null', () => {
    const { result } = renderHook(() => useProjectTree(null))
    expect(result.current.tree).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('fetches tree when dirPath is provided', async () => {
    const { result } = renderHook(() => useProjectTree('/some/dir'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tree).toEqual(mockTree)
  })

  it('calls readDirTree with the provided path', async () => {
    renderHook(() => useProjectTree('/some/dir'))
    await waitFor(() => expect(window.api.readDirTree).toHaveBeenCalledWith('/some/dir'))
  })

  it('refetches when dirPath changes', async () => {
    const { result, rerender } = renderHook(({ path }) => useProjectTree(path), {
      initialProps: { path: '/dir-a' }
    })
    await waitFor(() => expect(window.api.readDirTree).toHaveBeenCalledWith('/dir-a'))
    rerender({ path: '/dir-b' })
    await waitFor(() => expect(window.api.readDirTree).toHaveBeenCalledWith('/dir-b'))
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/hooks/useProjectTree.test.js
```

Expected: FAIL — module not found.

**Step 3: Implement useProjectTree.js**

```js
// ABOUTME: Fetches and manages the .md file tree for a project directory.
// ABOUTME: Returns tree data and loading state for the sidebar file browser.

import { useState, useEffect, useCallback } from 'react'

export function useProjectTree(dirPath) {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!dirPath || !window.api?.readDirTree) return
    setLoading(true)
    try {
      const nodes = await window.api.readDirTree(dirPath)
      setTree(nodes)
    } catch {
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [dirPath])

  useEffect(() => { refresh() }, [refresh])

  return { tree, loading, refresh }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/hooks/useProjectTree.test.js
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/hooks/useProjectTree.js tests/hooks/useProjectTree.test.js
git commit -m "Add useProjectTree hook for sidebar file tree"
```

---

## Task 9: Build FileTreeNode component

**Files:**
- Create: `src/renderer/components/FileTreeNode.jsx`
- Create: `tests/components/FileTreeNode.test.jsx`

**Step 1: Write the failing test**

```jsx
// ABOUTME: Tests for the FileTreeNode component rendering files and directories.
// ABOUTME: Verifies click handling, active state, and expand/collapse behavior.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileTreeNode from '@/components/FileTreeNode'

describe('FileTreeNode', () => {
  it('renders a file node', () => {
    const node = { name: 'foo.md', path: '/path/foo.md', type: 'file' }
    const { getByText } = render(<FileTreeNode node={node} onFileClick={() => {}} activeFilePath={null} />)
    expect(getByText('foo.md')).toBeTruthy()
  })

  it('calls onFileClick with path when file is clicked', () => {
    const onFileClick = vi.fn()
    const node = { name: 'foo.md', path: '/path/foo.md', type: 'file' }
    const { getByText } = render(<FileTreeNode node={node} onFileClick={onFileClick} activeFilePath={null} />)
    fireEvent.click(getByText('foo.md'))
    expect(onFileClick).toHaveBeenCalledWith('/path/foo.md')
  })

  it('renders a directory with its children', () => {
    const node = {
      name: 'agents', path: '/path/agents', type: 'dir',
      children: [{ name: 'foo.md', path: '/path/agents/foo.md', type: 'file' }]
    }
    const { getByText } = render(<FileTreeNode node={node} onFileClick={() => {}} activeFilePath={null} />)
    expect(getByText('agents')).toBeTruthy()
    expect(getByText('foo.md')).toBeTruthy()
  })

  it('collapses a directory when clicked (depth >= 2 starts collapsed)', () => {
    const node = {
      name: 'deep', path: '/deep', type: 'dir',
      children: [{ name: 'bar.md', path: '/deep/bar.md', type: 'file' }]
    }
    const { getByText, queryByText } = render(
      <FileTreeNode node={node} depth={2} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(queryByText('bar.md')).toBeNull()
    fireEvent.click(getByText('deep'))
    expect(getByText('bar.md')).toBeTruthy()
  })

  it('applies active styling to the active file', () => {
    const node = { name: 'foo.md', path: '/path/foo.md', type: 'file' }
    const { container } = render(
      <FileTreeNode node={node} onFileClick={() => {}} activeFilePath="/path/foo.md" />
    )
    expect(container.querySelector('button').className).toContain('text-accent')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/FileTreeNode.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement FileTreeNode.jsx**

```jsx
// ABOUTME: Renders a single node in the file tree — a file or collapsible directory.
// ABOUTME: Handles expand/collapse for directories and click-to-open for files.

import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function FileTreeNode({ node, depth = 0, onFileClick, activeFilePath }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const indent = depth * 12

  if (node.type === 'file') {
    const isActive = node.path === activeFilePath
    return (
      <button
        className={cn(
          'w-full text-left py-0.5 text-xs truncate hover:bg-surface-bright transition-colors',
          isActive ? 'bg-surface-bright text-accent' : 'text-text-muted'
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => onFileClick(node.path)}
        title={node.path}
      >
        {node.name}
      </button>
    )
  }

  return (
    <div>
      <button
        className="w-full text-left py-0.5 text-xs text-text flex items-center gap-1 hover:bg-surface-bright transition-colors"
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={() => setExpanded(prev => !prev)}
      >
        <span className="text-text-muted shrink-0">{expanded ? '▾' : '▸'}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && node.children?.map(child => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/FileTreeNode.test.jsx
```

Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/components/FileTreeNode.jsx tests/components/FileTreeNode.test.jsx
git commit -m "Add FileTreeNode component with expand/collapse and active state"
```

---

## Task 10: Build FileTree component

**Files:**
- Create: `src/renderer/components/FileTree.jsx`
- Create: `tests/components/FileTree.test.jsx`

**Step 1: Write the failing test**

```jsx
// ABOUTME: Tests for the FileTree component that renders a labelled tree of nodes.
// ABOUTME: Verifies label rendering, node delegation, and empty state.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileTree from '@/components/FileTree'

const nodes = [
  { name: 'foo.md', path: '/path/foo.md', type: 'file' },
  { name: 'bar.md', path: '/path/bar.md', type: 'file' }
]

describe('FileTree', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <FileTree label="~/.claude" nodes={nodes} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(getByText('~/.claude')).toBeTruthy()
  })

  it('renders all file nodes', () => {
    const { getByText } = render(
      <FileTree label="root" nodes={nodes} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(getByText('foo.md')).toBeTruthy()
    expect(getByText('bar.md')).toBeTruthy()
  })

  it('calls onFileClick when a file is clicked', () => {
    const onFileClick = vi.fn()
    const { getByText } = render(
      <FileTree label="root" nodes={nodes} onFileClick={onFileClick} activeFilePath={null} />
    )
    fireEvent.click(getByText('foo.md'))
    expect(onFileClick).toHaveBeenCalledWith('/path/foo.md')
  })

  it('renders empty message when nodes is empty', () => {
    const { getByText } = render(
      <FileTree label="Empty" nodes={[]} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(getByText('Empty')).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/FileTree.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement FileTree.jsx**

```jsx
// ABOUTME: Renders a labelled, scrollable tree of .md file nodes for the sidebar.
// ABOUTME: Delegates individual node rendering to FileTreeNode.

import FileTreeNode from './FileTreeNode'

export default function FileTree({ label, nodes, onFileClick, activeFilePath }) {
  return (
    <div>
      <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider select-none">
        {label}
      </div>
      {nodes.map(node => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/FileTree.test.jsx
```

Expected: All 4 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/components/FileTree.jsx tests/components/FileTree.test.jsx
git commit -m "Add FileTree component with label and node delegation"
```

---

## Task 11: Build ProjectSwitcher component

**Files:**
- Create: `src/renderer/components/ProjectSwitcher.jsx`
- Create: `tests/components/ProjectSwitcher.test.jsx`

**Step 1: Write the failing test**

```jsx
// ABOUTME: Tests for the ProjectSwitcher dropdown component.
// ABOUTME: Verifies project name display, dropdown, selection, and browse callback.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ProjectSwitcher from '@/components/ProjectSwitcher'

const projects = [
  { path: '/path/proj1', name: 'proj1', lastOpened: '2026-02-25' },
  { path: '/path/proj2', name: 'proj2', lastOpened: '2026-02-24' }
]

describe('ProjectSwitcher', () => {
  it('shows current project name derived from path', () => {
    const { getByText } = render(
      <ProjectSwitcher currentProject="/path/my-project" projects={[]} onSelect={() => {}} onBrowse={() => {}} />
    )
    expect(getByText('my-project')).toBeTruthy()
  })

  it('shows "No project" when currentProject is null', () => {
    const { getByText } = render(
      <ProjectSwitcher currentProject={null} projects={[]} onSelect={() => {}} onBrowse={() => {}} />
    )
    expect(getByText('No project')).toBeTruthy()
  })

  it('shows project list when button is clicked', () => {
    const { getByText, queryByText } = render(
      <ProjectSwitcher currentProject="/path/proj" projects={projects} onSelect={() => {}} onBrowse={() => {}} />
    )
    expect(queryByText('proj1')).toBeNull()
    fireEvent.click(getByText('proj'))
    expect(getByText('proj1')).toBeTruthy()
    expect(getByText('proj2')).toBeTruthy()
  })

  it('calls onSelect with path when project is clicked', () => {
    const onSelect = vi.fn()
    const { getByText } = render(
      <ProjectSwitcher currentProject="/path/proj" projects={projects} onSelect={onSelect} onBrowse={() => {}} />
    )
    fireEvent.click(getByText('proj'))
    fireEvent.click(getByText('proj1'))
    expect(onSelect).toHaveBeenCalledWith('/path/proj1')
  })

  it('calls onBrowse when Browse is clicked', () => {
    const onBrowse = vi.fn()
    const { getByText } = render(
      <ProjectSwitcher currentProject="/path/proj" projects={projects} onSelect={() => {}} onBrowse={onBrowse} />
    )
    fireEvent.click(getByText('proj'))
    fireEvent.click(getByText('Browse...'))
    expect(onBrowse).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ProjectSwitcher.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement ProjectSwitcher.jsx**

```jsx
// ABOUTME: Dropdown for selecting the active project from the recent projects list.
// ABOUTME: Derives the display name from the project directory path.

import { useState } from 'react'

export default function ProjectSwitcher({ currentProject, projects, onSelect, onBrowse }) {
  const [open, setOpen] = useState(false)
  const name = currentProject ? currentProject.split(/[/\\]/).pop() : 'No project'

  return (
    <div className="relative border-b border-border">
      <button
        className="w-full px-3 py-2 text-left text-sm font-medium text-text flex items-center justify-between hover:bg-surface-bright transition-colors"
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="truncate">{name}</span>
        <span className="text-text-muted text-xs ml-1 shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-surface border border-border shadow-lg">
          {projects.map(project => (
            <button
              key={project.path}
              className="w-full px-3 py-1.5 text-left text-xs text-text hover:bg-surface-bright transition-colors truncate block"
              onClick={() => { onSelect(project.path); setOpen(false) }}
              title={project.path}
            >
              {project.name}
            </button>
          ))}
          <div className="border-t border-border">
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-accent hover:bg-surface-bright transition-colors"
              onClick={() => { onBrowse(); setOpen(false) }}
            >
              Browse...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/ProjectSwitcher.test.jsx
```

Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/components/ProjectSwitcher.jsx tests/components/ProjectSwitcher.test.jsx
git commit -m "Add ProjectSwitcher dropdown for recent projects"
```

---

## Task 12: Build Sidebar component

**Files:**
- Create: `src/renderer/components/Sidebar.jsx`

No unit test — this is a pure composition component with no logic of its own.

**Step 1: Implement Sidebar.jsx**

```jsx
// ABOUTME: Left panel containing the project switcher and two file trees.
// ABOUTME: Composes ProjectSwitcher and FileTree for the global and project directories.

import ProjectSwitcher from './ProjectSwitcher'
import FileTree from './FileTree'

export default function Sidebar({
  currentProject,
  projects,
  globalTree,
  projectTree,
  activeFilePath,
  onFileClick,
  onProjectSelect,
  onProjectBrowse
}) {
  return (
    <div className="flex flex-col h-full bg-surface border-r border-border overflow-hidden select-none">
      <ProjectSwitcher
        currentProject={currentProject}
        projects={projects}
        onSelect={onProjectSelect}
        onBrowse={onProjectBrowse}
      />
      <div className="flex-1 overflow-y-auto py-1">
        <FileTree
          label="~/.claude"
          nodes={globalTree}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
        />
        {currentProject && (
          <div className="mt-2">
            <FileTree
              label={currentProject.split(/[/\\]/).pop()}
              nodes={projectTree}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All existing tests pass.

**Step 3: Commit**

```bash
git add src/renderer/components/Sidebar.jsx
git commit -m "Add Sidebar component composing project switcher and file trees"
```

---

## Task 13: Build TabBar component

**Files:**
- Create: `src/renderer/components/TabBar.jsx`
- Create: `tests/components/TabBar.test.jsx`

**Step 1: Write the failing test**

```jsx
// ABOUTME: Tests for the TabBar component that shows open file tabs.
// ABOUTME: Verifies tab rendering, dirty state, click, and close behavior.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import TabBar from '@/components/TabBar'

const tabs = [
  { id: '1', filename: 'foo.md', dirty: false },
  { id: '2', filename: 'bar.md', dirty: true }
]

describe('TabBar', () => {
  it('renders nothing when tabs is empty', () => {
    const { container } = render(
      <TabBar tabs={[]} activeTabId={null} onTabClick={() => {}} onTabClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all open tabs', () => {
    const { getByText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={() => {}} onTabClose={() => {}} />
    )
    expect(getByText('foo.md')).toBeTruthy()
  })

  it('shows dirty indicator on unsaved tabs', () => {
    const { getByText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={() => {}} onTabClose={() => {}} />
    )
    expect(getByText('bar.md *')).toBeTruthy()
  })

  it('calls onTabClick when a tab is clicked', () => {
    const onTabClick = vi.fn()
    const { getByText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={onTabClick} onTabClose={() => {}} />
    )
    fireEvent.click(getByText('foo.md'))
    expect(onTabClick).toHaveBeenCalledWith('1')
  })

  it('calls onTabClose when the close button is clicked', () => {
    const onTabClose = vi.fn()
    const { getAllByLabelText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={() => {}} onTabClose={onTabClose} />
    )
    fireEvent.click(getAllByLabelText(/close/i)[0])
    expect(onTabClose).toHaveBeenCalledWith('1')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/TabBar.test.jsx
```

Expected: FAIL — module not found.

**Step 3: Implement TabBar.jsx**

```jsx
// ABOUTME: Horizontal tab strip for switching between open editor files.
// ABOUTME: Shows filename, dirty indicator, and a close button per tab.

import { cn } from '@/lib/utils'

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose }) {
  if (tabs.length === 0) return null

  return (
    <div className="flex items-center bg-surface border-b border-border overflow-x-auto shrink-0" role="tablist">
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer shrink-0 max-w-[180px] group',
            tab.id === activeTabId
              ? 'bg-background text-text border-t-2 border-t-accent'
              : 'text-text-muted hover:bg-surface-bright'
          )}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="truncate">{tab.dirty ? `${tab.filename} *` : tab.filename}</span>
          <button
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-auto shrink-0 leading-none"
            onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
            aria-label={`Close ${tab.filename}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/TabBar.test.jsx
```

Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add src/renderer/components/TabBar.jsx tests/components/TabBar.test.jsx
git commit -m "Add TabBar component with dirty indicator and close button"
```

---

## Task 14: Refactor App.jsx

**Files:**
- Modify: `src/renderer/App.jsx`

**Step 1: Replace App.jsx contents**

```jsx
// ABOUTME: Root application component. Manages layout, tab state, and project state.
// ABOUTME: Composes sidebar, tab bar, editor, preview, and status bar.

import { useState, useEffect, useRef } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import StatusBar from './components/StatusBar'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import { useFileManager } from './hooks/useFileManager'
import { useProjectTree } from './hooks/useProjectTree'
import { useScrollSync } from './hooks/useScrollSync'

function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export default function App() {
  const { tabs, activeTabId, activeTab, openTab, closeTab, setActiveTab, updateContent, forceSave } = useFileManager()
  const [mode, setMode] = useState('edit')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [currentProject, setCurrentProject] = useState(null)
  const [globalDir, setGlobalDir] = useState(null)
  const [projects, setProjects] = useState([])
  const editorRef = useRef(null)
  const previewRef = useRef(null)

  const { tree: globalTree } = useProjectTree(globalDir)
  const { tree: projectTree } = useProjectTree(currentProject)

  useScrollSync(editorRef, previewRef)

  useEffect(() => {
    async function init() {
      if (!window.api) return
      const info = await window.api.getProjectInfo()
      setCurrentProject(info.projectRoot)
      setGlobalDir(info.globalDir)
      const projs = await window.api.getProjects()
      setProjects(projs)
      const fp = await window.api.getFilePath()
      if (fp) openTab(fp)
    }
    init()
  }, [openTab])

  useEffect(() => {
    if (!window.api) return
    const unsubscribe = window.api.onFileChanged((content) => {
      if (!activeTab) return
      const tab = activeTab
      updateContent(tab.id, content)
    })
    return unsubscribe
  }, [activeTab, updateContent])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        if (activeTabId) forceSave(activeTabId)
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault()
        handleOpenFile()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setMode(prev => prev === 'edit' ? 'preview' : 'edit')
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setSidebarVisible(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, forceSave])

  async function handleOpenFile() {
    if (!window.api) return
    const result = await window.api.openFile()
    if (result) openTab(result.filePath, result.content)
  }

  async function handleProjectSelect(projectPath) {
    if (!window.api) return
    await window.api.saveProject(projectPath)
    setCurrentProject(projectPath)
    const projs = await window.api.getProjects()
    setProjects(projs)
  }

  async function handleProjectBrowse() {
    if (!window.api) return
    const path = await window.api.browseForProject()
    if (path) handleProjectSelect(path)
  }

  const statusFilename = activeTab
    ? (activeTab.dirty ? `${activeTab.filename} *` : activeTab.filename)
    : 'No file open'

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <div className="flex-1 flex overflow-hidden">
        {sidebarVisible && (
          <div className="w-[220px] shrink-0">
            <Sidebar
              currentProject={currentProject}
              projects={projects}
              globalTree={globalTree}
              projectTree={projectTree}
              activeFilePath={activeTab?.path ?? null}
              onFileClick={openTab}
              onProjectSelect={handleProjectSelect}
              onProjectBrowse={handleProjectBrowse}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTab}
            onTabClose={closeTab}
          />
          {activeTab ? (
            <div className="flex-1 flex overflow-hidden">
              {mode === 'edit' && (
                <div ref={editorRef} className="w-1/2 border-r border-border">
                  <Editor
                    content={activeTab.content}
                    onChange={newContent => updateContent(activeTabId, newContent)}
                  />
                </div>
              )}
              <div ref={previewRef} className={mode === 'edit' ? 'w-1/2' : 'w-full'}>
                <Preview content={activeTab.content} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-text-muted mb-2">No file open</p>
                <p className="text-xs text-text-muted">
                  Select a file from the sidebar or press{' '}
                  <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">Ctrl+O</kbd>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <StatusBar
        filename={statusFilename}
        wordCount={activeTab ? countWords(activeTab.content) : 0}
        mode={mode}
      />
    </div>
  )
}
```

**Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass. (App.jsx has no direct unit tests — it's tested via integration.)

**Step 3: Start the app and verify visually**

```bash
npm run dev
```

Verify:
- [ ] Sidebar visible with `~/.claude` and project tree
- [ ] Project switcher shows current project name
- [ ] Clicking a file opens it in a tab
- [ ] Tab bar shows open files with × to close
- [ ] Ctrl+Shift+B hides/shows sidebar
- [ ] Ctrl+O opens file dialog, file opens in new tab
- [ ] Editing marks tab dirty (`*`)
- [ ] Ctrl+S force saves active tab

**Step 4: Commit**

```bash
git add src/renderer/App.jsx
git commit -m "Refactor App.jsx with sidebar, tab bar, and useFileManager"
```

---

## Task 15: Phase 6a verification and merge

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (existing 34 + new tests from this phase).

**Step 2: Manual verification checklist**

```bash
npm run dev
```

- [ ] Sidebar shows `~/.claude/` tree with agents, skills, plans folders
- [ ] Sidebar shows current project tree (all .md files)
- [ ] Project switcher dropdown lists recent projects
- [ ] Browse... opens directory picker, selected project appears in sidebar
- [ ] Click file in sidebar → opens in new tab
- [ ] Clicking same file again → focuses existing tab, no duplicate
- [ ] Tab × button closes tab
- [ ] Closing active tab switches to adjacent tab
- [ ] Ctrl+Shift+B toggles sidebar
- [ ] Ctrl+O dialog opens file as tab
- [ ] Ctrl+S saves active tab
- [ ] Dirty indicator (`*`) appears and clears correctly
- [ ] Split-pane editor/preview still works
- [ ] Ctrl+Shift+P toggles preview mode

**Step 3: Merge to develop**

```bash
git checkout develop
git merge --no-ff feature/claude-code-companion -m "Merge feature/claude-code-companion: sidebar, tabs, project switcher"
```
