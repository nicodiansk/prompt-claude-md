// ABOUTME: Tests for the @ file reference autocomplete completion source.
// ABOUTME: Verifies trigger detection, file matching, and result formatting.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFileCompletionSource } from '../../src/renderer/editor/fileCompletionSource.js'

describe('createFileCompletionSource', () => {
  let completionSource
  let mockListFiles

  beforeEach(() => {
    mockListFiles = vi.fn().mockResolvedValue([
      'src/main/index.js',
      'src/renderer/App.jsx',
      'CLAUDE.md',
      'package.json',
      'docs/plans/design.md'
    ])
    completionSource = createFileCompletionSource(mockListFiles)
  })

  function makeContext(docText, pos, explicit = false) {
    return {
      state: { doc: { toString: () => docText, length: docText.length } },
      pos,
      explicit,
      matchBefore: (regex) => {
        const textBefore = docText.slice(0, pos)
        const match = textBefore.match(regex)
        if (!match) return null
        return { from: pos - match[0].length, to: pos, text: match[0] }
      }
    }
  }

  it('returns null when no @ prefix found', async () => {
    const result = await completionSource(makeContext('hello world', 11))
    expect(result).toBeNull()
  })

  it('returns all files when just @ is typed', async () => {
    const result = await completionSource(makeContext('check @', 7))
    expect(result).not.toBeNull()
    expect(result.from).toBe(6)
    expect(result.options).toHaveLength(5)
    expect(result.options[0].label).toBe('CLAUDE.md')
  })

  it('filters files by typed query after @', async () => {
    const result = await completionSource(makeContext('look at @App', 12))
    expect(result).not.toBeNull()
    expect(result.options.some(o => o.label === 'src/renderer/App.jsx')).toBe(true)
  })

  it('inserts @ prefix with the file path', async () => {
    const result = await completionSource(makeContext('see @CL', 7))
    const option = result.options.find(o => o.label === 'CLAUDE.md')
    expect(option.apply).toBe('@CLAUDE.md')
  })

  it('caches file list for subsequent calls within cache window', async () => {
    await completionSource(makeContext('see @a', 5))
    await completionSource(makeContext('see @ab', 6))
    expect(mockListFiles).toHaveBeenCalledTimes(1)
  })
})
