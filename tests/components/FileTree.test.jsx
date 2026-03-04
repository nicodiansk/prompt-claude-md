// ABOUTME: Tests for the FileTree component that renders a labelled tree of nodes.
// ABOUTME: Verifies label rendering, node delegation, and empty state.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileTree from '@/components/FileTree'

const nodes = [
  { name: 'foo.md', path: '/path/foo.md', type: 'file' },
  { name: 'bar.md', path: '/path/bar.md', type: 'file' }
]

describe('FileTree', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <FileTree label="~/.claude" nodes={nodes} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(getByText('~/.claude')).toBeTruthy()
  })

  it('renders all file nodes', () => {
    const { getByText } = render(
      <FileTree label="root" nodes={nodes} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(getByText('foo.md')).toBeTruthy()
    expect(getByText('bar.md')).toBeTruthy()
  })

  it('calls onFileClick when a file is clicked', () => {
    const onFileClick = vi.fn()
    const { getByText } = render(
      <FileTree label="root" nodes={nodes} onFileClick={onFileClick} activeFilePath={null} />
    )
    fireEvent.click(getByText('foo.md'))
    expect(onFileClick).toHaveBeenCalledWith('/path/foo.md')
  })

  it('renders empty message when nodes is empty', () => {
    const { getByText } = render(
      <FileTree label="Empty" nodes={[]} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(getByText('Empty')).toBeTruthy()
  })
})
