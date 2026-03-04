// ABOUTME: Manages editor mode state for Claude Code's Ctrl+G integration.
// ABOUTME: Provides submit (Ctrl+Enter) and cancel (Esc) actions.

import { useState, useEffect, useCallback } from 'react'

export function useEditorMode() {
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [filePath, setFilePath] = useState(null)

  useEffect(() => {
    async function init() {
      if (!window.api?.getEditorMode) return
      const mode = await window.api.getEditorMode()
      setIsEditorMode(mode.isEditorMode)
      setFilePath(mode.filePath)
    }
    init()
  }, [])

  const submit = useCallback(async (content) => {
    if (!window.api?.submitEditor) return
    await window.api.submitEditor(content)
  }, [])

  const cancel = useCallback(async () => {
    if (!window.api?.cancelEditor) return
    await window.api.cancelEditor()
  }, [])

  return { isEditorMode, filePath, submit, cancel }
}
