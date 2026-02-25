// ABOUTME: Tests for the Preview component that renders markdown as HTML.
// ABOUTME: Verifies content rendering and empty state handling.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Preview from '@/components/Preview'

describe('Preview', () => {
  it('renders markdown content as HTML', () => {
    const { container } = render(<Preview content="# Hello World" />)
    expect(container.querySelector('h1')).toHaveTextContent('Hello World')
  })

  it('renders empty state when no content', () => {
    const { container } = render(<Preview content="" />)
    const preview = container.querySelector('[data-testid="preview"]')
    expect(preview.innerHTML).toBe('')
  })

  it('updates when content changes', () => {
    const { container, rerender } = render(<Preview content="# First" />)
    expect(container.querySelector('h1')).toHaveTextContent('First')

    rerender(<Preview content="# Second" />)
    expect(container.querySelector('h1')).toHaveTextContent('Second')
  })
})
