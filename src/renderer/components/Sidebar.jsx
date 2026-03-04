// ABOUTME: Left panel containing the project switcher and two file trees.
// ABOUTME: Composes ProjectSwitcher and FileTree for the global and project directories.

import ProjectSwitcher from './ProjectSwitcher'
import FileTree from './FileTree'

export default function Sidebar({
  currentProject,
  projects,
  globalTree,
  projectTree,
  activeFilePath,
  onFileClick,
  onProjectSelect,
  onProjectBrowse
}) {
  return (
    <div className="flex flex-col h-full bg-surface border-r border-border overflow-hidden select-none">
      <ProjectSwitcher
        currentProject={currentProject}
        projects={projects}
        onSelect={onProjectSelect}
        onBrowse={onProjectBrowse}
      />
      <div className="flex-1 overflow-y-auto py-1">
        <FileTree
          label="~/.claude"
          nodes={globalTree}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
        />
        {currentProject && (
          <div className="mt-2">
            <FileTree
              label={currentProject.split(/[/\\]/).pop()}
              nodes={projectTree}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          </div>
        )}
      </div>
    </div>
  )
}
