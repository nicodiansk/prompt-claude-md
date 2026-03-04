// ABOUTME: Tests for the TabBar component that shows open file tabs.
// ABOUTME: Verifies tab rendering, dirty state, click, and close behavior.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import TabBar from '@/components/TabBar'

const tabs = [
  { id: '1', filename: 'foo.md', dirty: false },
  { id: '2', filename: 'bar.md', dirty: true }
]

describe('TabBar', () => {
  it('renders nothing when tabs is empty', () => {
    const { container } = render(
      <TabBar tabs={[]} activeTabId={null} onTabClick={() => {}} onTabClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all open tabs', () => {
    const { getByText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={() => {}} onTabClose={() => {}} />
    )
    expect(getByText('foo.md')).toBeTruthy()
  })

  it('shows dirty indicator on unsaved tabs', () => {
    const { getByText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={() => {}} onTabClose={() => {}} />
    )
    expect(getByText('bar.md *')).toBeTruthy()
  })

  it('calls onTabClick when a tab is clicked', () => {
    const onTabClick = vi.fn()
    const { getByText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={onTabClick} onTabClose={() => {}} />
    )
    fireEvent.click(getByText('foo.md'))
    expect(onTabClick).toHaveBeenCalledWith('1')
  })

  it('calls onTabClose when the close button is clicked', () => {
    const onTabClose = vi.fn()
    const { getAllByLabelText } = render(
      <TabBar tabs={tabs} activeTabId="1" onTabClick={() => {}} onTabClose={onTabClose} />
    )
    fireEvent.click(getAllByLabelText(/close/i)[0])
    expect(onTabClose).toHaveBeenCalledWith('1')
  })
})
