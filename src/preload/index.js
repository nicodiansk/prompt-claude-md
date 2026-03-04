// ABOUTME: Preload script that bridges main and renderer processes.
// ABOUTME: Exposes a safe API via contextBridge for file operations and IPC.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Single-file operations
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

  // File listing for @ autocomplete
  listProjectFiles: () => ipcRenderer.invoke('list-project-files'),
})
