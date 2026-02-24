// ABOUTME: Tests for the Editor component wrapper around CodeMirror 6.
// ABOUTME: Tests mounting behavior and prop handling in jsdom.

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Editor from '@/components/Editor'

describe('Editor', () => {
  it('renders a container element', () => {
    const { container } = render(
      <Editor content="hello" onChange={() => {}} />
    )
    expect(container.querySelector('[data-testid="editor"]')).toBeTruthy()
  })

  it('accepts content and onChange props without crashing', () => {
    const onChange = vi.fn()
    expect(() => {
      render(<Editor content="# Test" onChange={onChange} />)
    }).not.toThrow()
  })
})
