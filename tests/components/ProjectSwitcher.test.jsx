// ABOUTME: Tests for the ProjectSwitcher dropdown component.
// ABOUTME: Verifies project name display, dropdown, selection, and browse callback.

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ProjectSwitcher from '@/components/ProjectSwitcher'

const projects = [
  { path: '/path/proj1', name: 'proj1', lastOpened: '2026-02-25' },
  { path: '/path/proj2', name: 'proj2', lastOpened: '2026-02-24' }
]

describe('ProjectSwitcher', () => {
  it('shows current project name derived from path', () => {
    const { getByText } = render(
      <ProjectSwitcher currentProject="/path/my-project" projects={[]} onSelect={() => {}} onBrowse={() => {}} />
    )
    expect(getByText('my-project')).toBeTruthy()
  })

  it('shows "No project" when currentProject is null', () => {
    const { getByText } = render(
      <ProjectSwitcher currentProject={null} projects={[]} onSelect={() => {}} onBrowse={() => {}} />
    )
    expect(getByText('No project')).toBeTruthy()
  })

  it('shows project list when button is clicked', () => {
    const { getByText, queryByText } = render(
      <ProjectSwitcher currentProject="/path/proj" projects={projects} onSelect={() => {}} onBrowse={() => {}} />
    )
    expect(queryByText('proj1')).toBeNull()
    fireEvent.click(getByText('proj'))
    expect(getByText('proj1')).toBeTruthy()
    expect(getByText('proj2')).toBeTruthy()
  })

  it('calls onSelect with path when project is clicked', () => {
    const onSelect = vi.fn()
    const { getByText } = render(
      <ProjectSwitcher currentProject="/path/proj" projects={projects} onSelect={onSelect} onBrowse={() => {}} />
    )
    fireEvent.click(getByText('proj'))
    fireEvent.click(getByText('proj1'))
    expect(onSelect).toHaveBeenCalledWith('/path/proj1')
  })

  it('calls onBrowse when Browse is clicked', () => {
    const onBrowse = vi.fn()
    const { getByText } = render(
      <ProjectSwitcher currentProject="/path/proj" projects={projects} onSelect={() => {}} onBrowse={onBrowse} />
    )
    fireEvent.click(getByText('proj'))
    fireEvent.click(getByText('Browse...'))
    expect(onBrowse).toHaveBeenCalled()
  })
})
