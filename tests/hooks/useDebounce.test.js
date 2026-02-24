// ABOUTME: Tests for the useDebounce hook.
// ABOUTME: Verifies debounce timing, cancellation, and immediate flush.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the callback after the delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('hello')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('hello')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('resets the timer on subsequent calls', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('first')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    act(() => {
      result.current.trigger('second')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('flush() fires immediately', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('urgent')
    })

    act(() => {
      result.current.flush()
    })

    expect(callback).toHaveBeenCalledWith('urgent')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancel() prevents the callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounce(callback, 500))

    act(() => {
      result.current.trigger('cancelled')
    })

    act(() => {
      result.current.cancel()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})
