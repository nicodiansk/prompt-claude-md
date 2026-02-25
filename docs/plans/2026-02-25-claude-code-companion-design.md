# md-viewer Phase 6: Claude Code Companion Design

## Overview

Transform md-viewer from a single-file editor into a Claude Code companion app. The app gains a file tree sidebar for browsing all `.md` files in a project alongside global `~/.claude/` files, multi-tab editing, and a dedicated editor mode that integrates with Claude Code's `Ctrl+G` (`chat:externalEditor`) keybinding.

## Goals

- Browse and edit all Claude Code prompt files (agents, skills, commands, CLAUDE.md) alongside project docs in one place
- Multi-tab editing so multiple files can be open simultaneously
- Act as Claude Code's `$EDITOR` — Ctrl+G opens the current prompt in md-viewer with live preview, Ctrl+Enter returns it
- Auto-detect project from launch directory, with manual project switching

## Non-Goals (this phase)

- Drag-to-resize sidebar
- Search/filter within the file tree
- Creating or deleting files from the sidebar
- Vim keybindings, TOC sidebar, export features

---

## UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  [project-name ▼]                                        │
├─────────────────┬────────────────────────────────────────┤
│ ~/.claude/      │ CLAUDE.md ×  │ agent.md ×  │          │
│ ├── agents/     ├───────────────────────┬────────────────┤
│ │   └── foo.md  │                       │                │
│ ├── skills/     │   CodeMirror 6        │  Preview       │
│ └── plans/      │   Editor              │                │
│                 │                       │                │
│ project-name/   │                       │                │
│ ├── CLAUDE.md   ├───────────────────────┴────────────────┤
│ ├── .claude/    │  notes.md  •  42 words  │  EDIT        │
│ └── docs/       │                                        │
│     └── *.md    │                                        │
└─────────────────┴────────────────────────────────────────┘
```

- **Sidebar**: ~220px fixed width. Two root nodes: `~/.claude/` (always present) and the current project directory. Collapsible folder nodes. Active file highlighted.
- **Project switcher**: dropdown at top of sidebar. Shows current project name, click to switch.
- **Tab bar**: open files as closeable tabs. Click a file in the tree to open it (or focus it if already open). No duplicate tabs.
- **Status bar**: unchanged — filename, word count, mode indicator.
- **Ctrl+Shift+B**: toggle sidebar visibility.

---

## Components

### New Components

| Component | File | Description |
|---|---|---|
| `Sidebar` | `src/renderer/components/Sidebar.jsx` | Shell for the left panel — contains ProjectSwitcher and FileTree |
| `ProjectSwitcher` | `src/renderer/components/ProjectSwitcher.jsx` | Dropdown showing recent projects + Browse option |
| `FileTree` | `src/renderer/components/FileTree.jsx` | Recursive collapsible tree of `.md` files |
| `FileTreeNode` | `src/renderer/components/FileTreeNode.jsx` | Single node (file or folder) in the tree |
| `TabBar` | `src/renderer/components/TabBar.jsx` | Horizontal tab strip with closeable tabs |

### Modified Components

| Component | Change |
|---|---|
| `App.jsx` | Add sidebar, tab bar; replace `useFile` with `useFileManager` |
| `StatusBar.jsx` | Add editor mode indicator display |

### New Hooks

| Hook | File | Description |
|---|---|---|
| `useFileManager` | `src/renderer/hooks/useFileManager.js` | Manages array of open tabs; replaces `useFile` in App |
| `useProjectTree` | `src/renderer/hooks/useProjectTree.js` | Fetches and manages the file tree for a project path |

### Existing Hooks (unchanged)

`useFile`, `useDebounce`, `useMarkdown`, `useScrollSync` — still used internally.

---

## State Model

### Tab

```js
{
  id: string,           // uuid
  path: string,         // absolute file path
  filename: string,     // display name
  content: string,
  dirty: boolean,
  isEditorMode: boolean // true when opened via --editor-mode
}
```

### useFileManager

```js
{
  tabs: Tab[],
  activeTabId: string | null,
  openTab(path),        // opens file or focuses existing tab
  closeTab(id),         // close with dirty check (skip for editor mode)
  setActiveTab(id),
  updateContent(id, content),
  markSaved(id)
}
```

**Persistence**: open tab paths and active tab ID are saved to `userData/tabs.json` on change and restored on launch (non-editor-mode only).

**Duplicate prevention**: `openTab(path)` checks if a tab with that path already exists and switches to it instead of opening a second tab.

---

## Project Model

### Detection

On launch, the project root is determined by:

1. If a file path is passed as CLI arg: walk up from that file's directory
2. Otherwise: start from `cwd`
3. Walk up looking for `package.json`, `.git`, or `.claude/` directory — first match wins
4. If nothing found: use the starting directory itself

### Recent Projects

Stored at `userData/projects.json`:

```json
[
  { "path": "/abs/path/to/project", "name": "project-name", "lastOpened": "ISO8601" }
]
```

- Max 10 entries, sorted by `lastOpened` descending
- On project switch: save current project, close its tabs (with dirty check), restore tabs for new project

### File Tree

`read-dir-tree(dirPath)` returns:

```js
{
  name: string,
  path: string,
  type: 'file' | 'dir',
  children?: TreeNode[]  // only for dirs
}
```

- Filtered to `.md` files only (dirs included only if they contain `.md` descendants)
- Skips: `node_modules/`, `.git/`, `out/`, `dist/`, `build/`
- Sorted: directories first, then files, alphabetically within each group

---

## Editor Mode

### Setup (user one-time config)

Add to shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export EDITOR="md-viewer --editor-mode"
```

Claude Code's `Ctrl+G` (`chat:externalEditor`) writes the current prompt to a temp file and runs `$EDITOR <tmpfile>`, waiting for the process to exit.

### Launch Detection

Main process checks `process.argv` for `--editor-mode` flag. If present:

- Skips single-instance lock (allows a second window alongside an open md-viewer)
- Opens a dedicated editor mode window (600×500, centered, no window state restore)
- Loads the temp file path from the next argv value
- Passes `{ isEditorMode: true, filePath }` to renderer via `get-editor-mode` IPC

### Editor Mode Window

- Sidebar hidden by default
- The temp file opens as a special tab with label `● Prompt` (not the temp filename)
- Status bar shows: `● EDITOR MODE  ·  Ctrl+Enter to submit  ·  Esc to cancel`
- Normal file tabs are not shown (editor mode window is single-purpose)

### Submit (Ctrl+Enter)

1. Write current content to the temp file
2. Call `submit-editor` IPC → main process calls `app.quit()`
3. Claude Code reads the file and inserts content as the prompt

### Cancel (Esc)

1. Restore original file content (saved at load time)
2. Write original content back to temp file
3. Call `cancel-editor` IPC → main process calls `app.quit()`
4. Claude Code gets back the original unchanged content

---

## IPC Changes

### New Handlers (main process)

| Channel | Args | Returns | Description |
|---|---|---|---|
| `read-dir-tree` | `dirPath: string` | `TreeNode` | Recursive `.md` file tree |
| `get-projects` | — | `Project[]` | Recent projects list |
| `save-project` | `path: string` | — | Add/update project, trim to 10 |
| `browse-for-project` | — | `string \| null` | Native directory picker |
| `get-editor-mode` | — | `{ isEditorMode, filePath }` | Editor mode state |
| `submit-editor` | — | — | Save file + quit |
| `cancel-editor` | — | — | Restore original + quit |

### New Preload Exposures

`readDirTree`, `getProjects`, `saveProject`, `browseForProject`, `getEditorMode`, `submitEditor`, `cancelEditor`

### Unchanged

`readFile`, `writeFile`, `openFile`, `getFilePath`, `onFileChanged` — tabs reuse existing file I/O.

---

## New Main Process Files

| File | Description |
|---|---|
| `src/main/dirTree.js` | `readDirTree()` implementation — recursive walk, filtering, sorting |
| `src/main/projectHistory.js` | Read/write `userData/projects.json` |

---

## Implementation Phases

### Phase 6a: Sidebar + Tabs (this document)

1. Add `dirTree.js` and `projectHistory.js` to main
2. Add new IPC handlers and preload exposures
3. Build `FileTree`, `FileTreeNode`, `ProjectSwitcher`, `Sidebar` components
4. Build `TabBar` component
5. Build `useFileManager` and `useProjectTree` hooks
6. Refactor `App.jsx` to use new layout and hooks
7. Verify all existing tests still pass; add new tests for new components/hooks

### Phase 6b: Editor Mode (next session)

1. Add `--editor-mode` detection in main process
2. Add editor mode IPC handlers
3. Add editor mode window behavior
4. Add editor mode tab styling and status bar indicator
5. Add Ctrl+Enter / Esc keybindings for editor mode

---

## Testing Strategy

- `dirTree.js`: unit tests with real temp directories (same pattern as `fileOps.test.js`)
- `projectHistory.js`: unit tests with temp `userData` path
- `FileTree`: component tests — renders tree structure, clicking opens tab
- `ProjectSwitcher`: component tests — shows projects, selects project
- `TabBar`: component tests — renders tabs, close button, active state
- `useFileManager`: hook tests — openTab, closeTab, duplicate prevention
- Editor mode: manual verification (requires real Electron + Claude Code)
