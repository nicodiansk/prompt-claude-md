// ABOUTME: Tests for the project tree hook that fetches .md file trees via IPC.
// ABOUTME: Verifies loading state, tree data, and path change behavior.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjectTree } from '@/hooks/useProjectTree'

const mockTree = [{ name: 'foo.md', path: '/path/foo.md', type: 'file' }]

describe('useProjectTree', () => {
  beforeEach(() => {
    window.api = { readDirTree: vi.fn().mockResolvedValue(mockTree) }
  })

  it('returns empty tree and false loading when dirPath is null', () => {
    const { result } = renderHook(() => useProjectTree(null))
    expect(result.current.tree).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('fetches tree when dirPath is provided', async () => {
    const { result } = renderHook(() => useProjectTree('/some/dir'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tree).toEqual(mockTree)
  })

  it('calls readDirTree with the provided path', async () => {
    renderHook(() => useProjectTree('/some/dir'))
    await waitFor(() => expect(window.api.readDirTree).toHaveBeenCalledWith('/some/dir'))
  })

  it('refetches when dirPath changes', async () => {
    const { result, rerender } = renderHook(({ path }) => useProjectTree(path), {
      initialProps: { path: '/dir-a' }
    })
    await waitFor(() => expect(window.api.readDirTree).toHaveBeenCalledWith('/dir-a'))
    rerender({ path: '/dir-b' })
    await waitFor(() => expect(window.api.readDirTree).toHaveBeenCalledWith('/dir-b'))
  })
})
