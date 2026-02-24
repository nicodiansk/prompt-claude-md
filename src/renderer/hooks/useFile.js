// ABOUTME: Manages file state, auto-save, and external change detection.
// ABOUTME: Coordinates IPC file operations with debounced writes.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from './useDebounce'

export function useFile() {
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState(null)
  const [dirty, setDirty] = useState(false)
  const lastSavedRef = useRef('')

  const saveToFile = useCallback(async (text) => {
    if (!window.api || !filename) return
    await window.api.writeFile(text)
    lastSavedRef.current = text
    setDirty(false)
  }, [filename])

  const { trigger: debouncedSave, flush: flushSave } = useDebounce(saveToFile, 500)

  // Load file on mount if one was passed via CLI
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

  const openFile = useCallback(async () => {
    if (!window.api) return

    const result = await window.api.openFile()
    if (!result) return

    const name = result.filePath.split(/[/\\]/).pop()
    setFilename(name)
    setContent(result.content)
    lastSavedRef.current = result.content
    setDirty(false)
  }, [])

  return {
    content,
    filename,
    hasFile: filename !== null,
    dirty,
    handleChange,
    forceSave,
    openFile
  }
}
