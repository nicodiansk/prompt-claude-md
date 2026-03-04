// ABOUTME: Tests for the editor mode hook that manages submit/cancel flow.
// ABOUTME: Verifies state fetching, submit, and cancel behavior.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEditorMode } from '../../src/renderer/hooks/useEditorMode.js'

describe('useEditorMode', () => {
  beforeEach(() => {
    window.api = {
      getEditorMode: vi.fn().mockResolvedValue({
        isEditorMode: true,
        filePath: '/tmp/prompt.md'
      }),
      submitEditor: vi.fn().mockResolvedValue(undefined),
      cancelEditor: vi.fn().mockResolvedValue(undefined)
    }
  })

  it('fetches editor mode state on mount', async () => {
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => {
      expect(result.current.isEditorMode).toBe(true)
    })
    expect(result.current.filePath).toBe('/tmp/prompt.md')
  })

  it('returns false when not in editor mode', async () => {
    window.api.getEditorMode.mockResolvedValue({
      isEditorMode: false,
      filePath: null
    })
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => {
      expect(result.current.isEditorMode).toBe(false)
    })
  })

  it('calls submitEditor with content', async () => {
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => expect(result.current.isEditorMode).toBe(true))
    await act(async () => {
      await result.current.submit('edited prompt content')
    })
    expect(window.api.submitEditor).toHaveBeenCalledWith('edited prompt content')
  })

  it('calls cancelEditor', async () => {
    const { result } = renderHook(() => useEditorMode())
    await waitFor(() => expect(result.current.isEditorMode).toBe(true))
    await act(async () => {
      await result.current.cancel()
    })
    expect(window.api.cancelEditor).toHaveBeenCalled()
  })
})
