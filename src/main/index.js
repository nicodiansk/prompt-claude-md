// ABOUTME: Electron main process entry point. Creates the browser window
// ABOUTME: and manages application lifecycle, file I/O, and IPC.

import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, resolve, basename, dirname } from 'path'
import { watch } from 'fs'
import { homedir } from 'os'
import { readFileContent, writeFileContent } from './fileOps.js'
import { readDirTree } from './dirTree.js'
import { detectProjectRoot } from './projectRoot.js'
import { getProjects, saveProject } from './projectHistory.js'
import windowStateKeeper from 'electron-window-state'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null
let filePath = null
let projectRoot = null
let projectsFilePath = null

function parseFilePath() {
  // In dev, CLI args include electron path. In production, args start with app path.
  const args = process.argv.slice(isDev ? 2 : 1)
  const fileArg = args.find(arg => !arg.startsWith('-'))
  if (fileArg) {
    return resolve(fileArg)
  }
  return null
}

function createWindow() {
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

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
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

  ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    filePath = result.filePaths[0]
    const content = await readFileContent(filePath)
    updateWindowTitle()
    startFileWatcher()

    return { filePath, content }
  })

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

  ipcMain.handle('read-file-at', async (_event, path) => {
    try {
      return await readFileContent(path)
    } catch {
      return ''
    }
  })

  ipcMain.handle('write-file-at', async (_event, path, content) => {
    await writeFileContent(path, content)
  })
}

let fileWatcher = null

function startFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = null
  }

  if (!filePath) return

  let debounceTimer = null

  fileWatcher = watch(filePath, (eventType) => {
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

function updateWindowTitle() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const title = filePath ? `${basename(filePath)} — MD Viewer` : 'MD Viewer'
    mainWindow.setTitle(title)
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

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

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
