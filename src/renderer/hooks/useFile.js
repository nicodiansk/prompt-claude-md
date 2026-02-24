// ABOUTME: Manages file state, auto-save, and external change detection.
// ABOUTME: Coordinates IPC file operations with debounced writes.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from './useDebounce'

export function useFile() {
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState('untitled.md')
  const [dirty, setDirty] = useState(false)
  const lastSavedRef = useRef('')

  const saveToFile = useCallback(async (text) => {
    if (!window.api) return
    await window.api.writeFile(text)
    lastSavedRef.current = text
    setDirty(false)
  }, [])

  const { trigger: debouncedSave, flush: flushSave } = useDebounce(saveToFile, 500)

  // Load file on mount
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

  return {
    content,
    filename,
    dirty,
    handleChange,
    forceSave
  }
}
