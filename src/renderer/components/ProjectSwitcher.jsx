// ABOUTME: Dropdown for selecting the active project from the recent projects list.
// ABOUTME: Derives the display name from the project directory path.

import { useState } from 'react'

export default function ProjectSwitcher({ currentProject, projects, onSelect, onBrowse }) {
  const [open, setOpen] = useState(false)
  const name = currentProject ? currentProject.split(/[/\\]/).pop() : 'No project'

  return (
    <div className="relative border-b border-border">
      <button
        className="w-full px-3 py-2 text-left text-sm font-medium text-text flex items-center justify-between hover:bg-surface-bright transition-colors"
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="truncate">{name}</span>
        <span className="text-text-muted text-xs ml-1 shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-surface border border-border shadow-lg">
          {projects.map(project => (
            <button
              key={project.path}
              className="w-full px-3 py-1.5 text-left text-xs text-text hover:bg-surface-bright transition-colors truncate block"
              onClick={() => { onSelect(project.path); setOpen(false) }}
              title={project.path}
            >
              {project.name}
            </button>
          ))}
          <div className="border-t border-border">
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-accent hover:bg-surface-bright transition-colors"
              onClick={() => { onBrowse(); setOpen(false) }}
            >
              Browse...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
