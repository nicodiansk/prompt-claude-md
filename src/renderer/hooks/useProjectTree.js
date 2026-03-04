// ABOUTME: Fetches and manages the .md file tree for a project directory.
// ABOUTME: Returns tree data and loading state for the sidebar file browser.

import { useState, useEffect, useCallback } from 'react'

export function useProjectTree(dirPath) {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!dirPath || !window.api?.readDirTree) return
    setLoading(true)
    try {
      const nodes = await window.api.readDirTree(dirPath)
      setTree(nodes)
    } catch {
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [dirPath])

  useEffect(() => { refresh() }, [refresh])

  return { tree, loading, refresh }
}
