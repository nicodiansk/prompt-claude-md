// ABOUTME: Electron main process entry point. Creates the browser window
// ABOUTME: and manages application lifecycle, file I/O, and IPC.

import { app, BrowserWindow, ipcMain } from 'electron'
import { join, resolve, basename } from 'path'
import { readFileContent, writeFileContent } from './fileOps.js'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null
let filePath = null

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
