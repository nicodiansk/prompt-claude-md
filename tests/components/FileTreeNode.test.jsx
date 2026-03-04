// ABOUTME: Tests for the FileTreeNode component rendering files and directories.
// ABOUTME: Verifies click handling, active state, and expand/collapse behavior.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import FileTreeNode from '@/components/FileTreeNode'

describe('FileTreeNode', () => {
  it('renders a file node', () => {
    const node = { name: 'foo.md', path: '/path/foo.md', type: 'file' }
    const { getByText } = render(<FileTreeNode node={node} onFileClick={() => {}} activeFilePath={null} />)
    expect(getByText('foo.md')).toBeTruthy()
  })

  it('calls onFileClick with path when file is clicked', () => {
    const onFileClick = vi.fn()
    const node = { name: 'foo.md', path: '/path/foo.md', type: 'file' }
    const { getByText } = render(<FileTreeNode node={node} onFileClick={onFileClick} activeFilePath={null} />)
    fireEvent.click(getByText('foo.md'))
    expect(onFileClick).toHaveBeenCalledWith('/path/foo.md')
  })

  it('renders a directory with its children', () => {
    const node = {
      name: 'agents', path: '/path/agents', type: 'dir',
      children: [{ name: 'foo.md', path: '/path/agents/foo.md', type: 'file' }]
    }
    const { getByText } = render(<FileTreeNode node={node} onFileClick={() => {}} activeFilePath={null} />)
    expect(getByText('agents')).toBeTruthy()
    expect(getByText('foo.md')).toBeTruthy()
  })

  it('collapses a directory when clicked (depth >= 2 starts collapsed)', () => {
    const node = {
      name: 'deep', path: '/deep', type: 'dir',
      children: [{ name: 'bar.md', path: '/deep/bar.md', type: 'file' }]
    }
    const { getByText, queryByText } = render(
      <FileTreeNode node={node} depth={2} onFileClick={() => {}} activeFilePath={null} />
    )
    expect(queryByText('bar.md')).toBeNull()
    fireEvent.click(getByText('deep'))
    expect(getByText('bar.md')).toBeTruthy()
  })

  it('applies active styling to the active file', () => {
    const node = { name: 'foo.md', path: '/path/foo.md', type: 'file' }
    const { container } = render(
      <FileTreeNode node={node} onFileClick={() => {}} activeFilePath="/path/foo.md" />
    )
    expect(container.querySelector('button').className).toContain('text-accent')
  })
})
