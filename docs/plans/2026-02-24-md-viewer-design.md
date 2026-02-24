# md-viewer Design Document

## Overview

Local markdown viewer/editor as an Electron desktop app. Split-pane layout with CodeMirror 6 editor and live markdown-it preview. File watching, auto-save, CLI launch, dark theme with polished UI via React + Magic UI.

## Tech Stack

| Component | Choice | Rationale |
|---|---|---|
| Platform | Electron (v33+, latest stable) | Native window, file system access, single instance |
| Module system | ESM throughout | Modern, CodeMirror 6 is ESM-only |
| UI framework | React + Magic UI | Polished visual design, animated components |
| Build tool | Vite + @vitejs/plugin-react | Fast HMR, native ESM, JSX support |
| Editor | CodeMirror 6 | Extensible, performant, markdown language mode |
| Markdown rendering | markdown-it + highlight.js | GFM support, syntax-highlighted code blocks |
| Testing | Vitest (unit/integration) | Fast, native ESM, E2E deferred to later |
| Packaging | electron-builder | Cross-platform installers |

## Process Model

Electron runs two processes communicating over IPC:

```
CLI args → main.js → BrowserWindow(preload.js) → renderer (React)
               ↕ IPC (invoke/handle + send/on)
           fs.readFile / fs.writeFile / fs.watch
```

### Main Process (`src/main.js`)

- Parses CLI arguments for filepath
- Creates BrowserWindow with preload script
- Handles file I/O via IPC handlers: `readFile`, `writeFile`
- Watches file for external changes via `fs.watch`
- Pushes `file-changed` notifications to renderer
- Manages single instance lock (`app.requestSingleInstanceLock`)
- Loads Vite dev server URL in development, static files in production

### Preload Script (`src/preload.js`)

Bridges main and renderer via `contextBridge.exposeInMainWorld`:

```js
window.api = {
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),
  getFilePath: () => ipcRenderer.invoke('get-file-path'),
  onFileChanged: (callback) => { /* IPC listener */ },
}
```

### Renderer Process (`src/renderer/`)

React application with CodeMirror 6 editor and markdown-it preview.

## Renderer Architecture

```
src/renderer/
├── index.html          # Vite entry point
├── main.jsx            # React root mount
├── App.jsx             # Layout shell (split pane, mode toggle)
├── components/
│   ├── Editor.jsx      # CodeMirror 6 via useRef + useEffect
│   ├── Preview.jsx     # markdown-it rendered output
│   └── StatusBar.jsx   # Filename, word count, mode indicator
├── hooks/
│   ├── useFile.js      # IPC file read/write/watch state
│   └── useDebounce.js  # Debounced auto-save
└── styles/
    ├── globals.css     # Dark theme base, CSS variables
    └── theme.css       # Magic UI overrides, animations
```

### Key Integration Patterns

- **CodeMirror 6 in React**: Mount via `useRef` for container + `useEffect` to create/destroy `EditorView`. Direct integration, no third-party wrapper.
- **markdown-it rendering**: Renders to HTML string, set via `dangerouslySetInnerHTML` on preview pane.
- **Magic UI**: Shell chrome only (borders, status bar, pane transitions). Not applied to editor or preview content.

## UI Layout

```
┌─────────────────────────────────────────┐
│              Window (no menu bar)        │
├───────────────────┬─────────────────────┤
│                   │                     │
│   CodeMirror 6    │   markdown-it       │
│   Editor Pane     │   Preview Pane      │
│   (monospace,     │   (rendered HTML,   │
│    line numbers,  │    scrollable)      │
│    soft wrap)     │                     │
│                   │                     │
├───────────────────┴─────────────────────┤
│  Status bar: filename, word count, mode │
└─────────────────────────────────────────┘
```

- **Split pane**: CSS flexbox, 50/50. No drag-to-resize initially.
- **Ctrl+Shift+P**: Toggle between split mode and full-width read-only preview.
- **No menu bar**: `autoHideMenuBar: true` on BrowserWindow.
- **Dark theme**: Terminal/IDE aesthetic with CSS variables for theming.

## Data Flow

### Startup

```
CLI arg (filepath) → main.js → IPC → renderer
→ useFile hook calls readFile → main reads fs → returns content
→ sets CodeMirror doc + renders preview
```

### Editing

```
User types → CodeMirror onChange → useDebounce(500ms)
→ IPC writeFile → main writes to fs
→ Preview re-renders on every keystroke (no debounce on preview)
```

### External File Change

```
fs.watch detects change → main sends IPC 'file-changed'
→ renderer compares content → if different, updates CodeMirror doc
→ preview re-renders
```

### Keyboard Shortcuts

- **Ctrl+S**: Bypass debounce, immediate save
- **Ctrl+Shift+P**: Toggle edit/preview mode
- **Ctrl+Z / Ctrl+Shift+Z**: Undo/redo (CodeMirror built-in)
- **Ctrl+F**: Find (CodeMirror built-in)

### Conflict Handling

External changes overwrite editor content. The 500ms debounce window makes conflicts extremely unlikely for a single-user local tool. No merge logic.

## Build & Development

### Development

- Vite dev server serves renderer with hot reload
- Electron main process loads Vite's dev URL
- `concurrently` runs both processes via `npm run dev`

### Production

- Vite builds renderer to `dist/renderer/`
- Electron loads `dist/renderer/index.html`
- `electron-builder` packages into installable binaries

### CLI Entry Point

- `package.json` `"bin"` field points to a launcher script
- Script launches Electron with the filepath argument
- `npm link` for local global install during development

## Core Dependencies

```
react, react-dom
vite, @vitejs/plugin-react
electron, electron-builder
codemirror, @codemirror/lang-markdown, @codemirror/theme-one-dark
markdown-it, highlight.js
magicui
vitest
```

## Implementation Phases

### Phase 1: Minimal Viable Editor

Electron window with CodeMirror 6 + markdown-it preview in split pane. Hardcoded sample content. React + Vite + Magic UI shell. Dark theme.

### Phase 2: File Operations

CLI filepath argument, IPC read/write, auto-save with debounce, file watching, create-if-missing.

### Phase 3: CLI Entry Point

Global `md-viewer` command via npm bin. Single instance lock. Window title from filename.

### Phase 4: Polish

Scroll sync between editor and preview. Keyboard shortcuts (Ctrl+S, Ctrl+Shift+P). Window state persistence. Status bar (word count, dirty indicator).

### Phase 5: Extended Rendering

Mermaid diagram support. KaTeX math rendering. Additional markdown-it plugins as needed.

## Testing Strategy

- **Vitest** for all unit and integration tests
- Test file operations (debounce, file watching logic) in isolation
- Test markdown rendering configuration
- Test React components with Vitest + jsdom
- E2E Electron testing deferred to a future phase

## Design Guidelines

- Minimal chrome, no menu bar clutter
- Fast startup (<1 second target)
- Single instance per file
- Window title: `filename.md — MD Viewer`
- Remember window position/size between sessions
