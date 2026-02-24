// ABOUTME: Preload script that bridges main and renderer processes.
// ABOUTME: Exposes a safe API via contextBridge for file operations and IPC.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getFilePath: () => ipcRenderer.invoke('get-file-path'),
  readFile: () => ipcRenderer.invoke('read-file'),
  writeFile: (content) => ipcRenderer.invoke('write-file', content),
  openFile: () => ipcRenderer.invoke('open-file'),
  onFileChanged: (callback) => {
    const handler = (_event, content) => callback(content)
    ipcRenderer.on('file-changed', handler)
    return () => ipcRenderer.removeListener('file-changed', handler)
  }
})
