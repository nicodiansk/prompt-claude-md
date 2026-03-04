// ABOUTME: Tests for the multi-tab file manager hook.
// ABOUTME: Verifies open, close, switch, and content update operations.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileManager } from '@/hooks/useFileManager'

describe('useFileManager', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      api: {
        readFileAt: vi.fn().mockResolvedValue('# Test Content'),
        writeFileAt: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('starts with no tabs and no active tab', () => {
    const { result } = renderHook(() => useFileManager())
    expect(result.current.tabs).toEqual([])
    expect(result.current.activeTabId).toBeNull()
    expect(result.current.activeTab).toBeNull()
  })

  it('openTab adds a tab and makes it active', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filename).toBe('notes.md')
    expect(result.current.tabs[0].content).toBe('# Test Content')
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
  })

  it('openTab focuses existing tab if path already open', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    const firstId = result.current.tabs[0].id
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.activeTabId).toBe(firstId)
  })

  it('openTab with initialContent skips readFileAt', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md', 'provided content')
    })
    expect(window.api.readFileAt).not.toHaveBeenCalled()
    expect(result.current.tabs[0].content).toBe('provided content')
  })

  it('closeTab removes the tab', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    const tabId = result.current.tabs[0].id
    act(() => { result.current.closeTab(tabId) })
    expect(result.current.tabs).toHaveLength(0)
    expect(result.current.activeTabId).toBeNull()
  })

  it('closeTab switches to adjacent tab when active tab is closed', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/a.md')
      await result.current.openTab('/path/to/b.md')
    })
    const firstId = result.current.tabs[0].id
    const secondId = result.current.tabs[1].id
    act(() => { result.current.closeTab(secondId) })
    expect(result.current.activeTabId).toBe(firstId)
  })

  it('updateContent marks tab dirty and updates content', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/notes.md')
    })
    const tabId = result.current.tabs[0].id
    act(() => { result.current.updateContent(tabId, '# Updated') })
    const tab = result.current.tabs.find(t => t.id === tabId)
    expect(tab.content).toBe('# Updated')
    expect(tab.dirty).toBe(true)
  })

  it('setActiveTab switches the active tab', async () => {
    const { result } = renderHook(() => useFileManager())
    await act(async () => {
      await result.current.openTab('/path/to/a.md')
      await result.current.openTab('/path/to/b.md')
    })
    const firstId = result.current.tabs[0].id
    act(() => { result.current.setActiveTab(firstId) })
    expect(result.current.activeTabId).toBe(firstId)
  })
})
