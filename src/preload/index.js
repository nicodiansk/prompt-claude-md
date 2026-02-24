// ABOUTME: Preload script that bridges main and renderer processes.
// ABOUTME: Exposes a safe API via contextBridge for file operations and IPC.

import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // File operations will be added in Phase 2
})
