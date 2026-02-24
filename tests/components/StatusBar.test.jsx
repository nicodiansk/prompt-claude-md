// ABOUTME: Tests for the StatusBar component.
// ABOUTME: Verifies filename display, word count, and mode indicator.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBar from '@/components/StatusBar'

describe('StatusBar', () => {
  it('displays the filename', () => {
    render(<StatusBar filename="notes.md" wordCount={0} mode="edit" />)
    expect(screen.getByText('notes.md')).toBeTruthy()
  })

  it('displays the word count', () => {
    render(<StatusBar filename="test.md" wordCount={42} mode="edit" />)
    expect(screen.getByText(/42 words/)).toBeTruthy()
  })

  it('displays edit mode indicator', () => {
    render(<StatusBar filename="test.md" wordCount={0} mode="edit" />)
    expect(screen.getByText(/edit/i)).toBeTruthy()
  })

  it('displays preview mode indicator', () => {
    render(<StatusBar filename="test.md" wordCount={0} mode="preview" />)
    expect(screen.getByText(/preview/i)).toBeTruthy()
  })

  it('shows dirty indicator when file has unsaved changes', () => {
    render(<StatusBar filename="notes.md *" wordCount={10} mode="edit" />)
    expect(screen.getByText('notes.md *')).toBeTruthy()
  })

  it('shows saved indicator when saveStatus is saved', () => {
    render(<StatusBar filename="notes.md" wordCount={10} mode="edit" saveStatus="saved" />)
    expect(screen.getByText(/saved/i)).toBeTruthy()
  })

  it('does not show saved indicator when saveStatus is null', () => {
    render(<StatusBar filename="notes.md" wordCount={10} mode="edit" saveStatus={null} />)
    expect(screen.queryByText(/saved/i)).toBeNull()
  })
})
