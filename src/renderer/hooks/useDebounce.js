// ABOUTME: Custom hook that debounces a callback with trigger/flush/cancel controls.
// ABOUTME: Used for auto-save to prevent excessive writes during rapid typing.

import { useRef, useCallback, useEffect } from 'react'

export function useDebounce(callback, delay) {
  const callbackRef = useRef(callback)
  const timerRef = useRef(null)
  const pendingArgsRef = useRef(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const trigger = useCallback((...args) => {
    pendingArgsRef.current = args
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      callbackRef.current(...pendingArgsRef.current)
      timerRef.current = null
      pendingArgsRef.current = null
    }, delay)
  }, [delay])

  const flush = useCallback(() => {
    if (timerRef.current && pendingArgsRef.current) {
      clearTimeout(timerRef.current)
      callbackRef.current(...pendingArgsRef.current)
      timerRef.current = null
      pendingArgsRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      pendingArgsRef.current = null
    }
  }, [])

  return { trigger, flush, cancel }
}
