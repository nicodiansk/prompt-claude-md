// ABOUTME: Manages multiple open file tabs with content, dirty state, and auto-save.
// ABOUTME: Provides open/close/switch/update operations for the tab-based editor.

import { useState, useCallback, useEffect, useRef } from 'react'

const SAVE_DELAY = 500

function makeTab(path, filename, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    path,
    filename,
    content,
    dirty: false
  }
}

export function useFileManager() {
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const tabsRef = useRef(tabs)
  const saveTimersRef = useRef({})

  useEffect(() => { tabsRef.current = tabs }, [tabs])

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  const openTab = useCallback(async (path, initialContent = null) => {
    const existing = tabsRef.current.find(t => t.path === path)
    if (existing) {
      setActiveTabId(existing.id)
      return
    }
    const filename = path.split(/[/\\]/).pop()
    let content = initialContent
    if (content === null) {
      content = (await window.api?.readFileAt(path)) ?? ''
    }
    const tab = makeTab(path, filename, content)
    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
  }, [])

  const closeTab = useCallback((tabId) => {
    if (saveTimersRef.current[tabId]) {
      clearTimeout(saveTimersRef.current[tabId])
      delete saveTimersRef.current[tabId]
    }
    setTabs(prev => prev.filter(t => t.id !== tabId))
    setActiveTabId(prevActive => {
      if (prevActive !== tabId) return prevActive
      const idx = tabsRef.current.findIndex(t => t.id === tabId)
      const remaining = tabsRef.current.filter(t => t.id !== tabId)
      if (remaining.length === 0) return null
      return remaining[Math.min(idx, remaining.length - 1)].id
    })
  }, [])

  const updateContent = useCallback((tabId, newContent) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, content: newContent, dirty: true } : t
    ))
    if (saveTimersRef.current[tabId]) clearTimeout(saveTimersRef.current[tabId])
    saveTimersRef.current[tabId] = setTimeout(async () => {
      const tab = tabsRef.current.find(t => t.id === tabId)
      if (!tab || !window.api?.writeFileAt) return
      await window.api.writeFileAt(tab.path, tab.content)
      setTabs(prev => prev.map(t =>
        t.id === tabId ? { ...t, dirty: false } : t
      ))
      delete saveTimersRef.current[tabId]
    }, SAVE_DELAY)
  }, [])

  const forceSave = useCallback(async (tabId) => {
    if (saveTimersRef.current[tabId]) {
      clearTimeout(saveTimersRef.current[tabId])
      delete saveTimersRef.current[tabId]
    }
    const tab = tabsRef.current.find(t => t.id === tabId)
    if (!tab || !window.api?.writeFileAt) return
    await window.api.writeFileAt(tab.path, tab.content)
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, dirty: false } : t
    ))
  }, [])

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  return { tabs, activeTabId, activeTab, openTab, closeTab, setActiveTab: setActiveTabId, updateContent, forceSave }
}
