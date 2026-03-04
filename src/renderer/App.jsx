// ABOUTME: Root application component. Manages layout, tab state, and project state.
// ABOUTME: Composes sidebar, tab bar, editor, preview, and status bar.

import { useState, useEffect, useRef } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import StatusBar from './components/StatusBar'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import { useFileManager } from './hooks/useFileManager'
import { useProjectTree } from './hooks/useProjectTree'
import { useScrollSync } from './hooks/useScrollSync'
import { useEditorMode } from './hooks/useEditorMode'

function countWords(text) {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export default function App() {
  const { tabs, activeTabId, activeTab, openTab, closeTab, setActiveTab, updateContent, forceSave } = useFileManager()
  const [mode, setMode] = useState('edit')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [currentProject, setCurrentProject] = useState(null)
  const [globalDir, setGlobalDir] = useState(null)
  const [projects, setProjects] = useState([])
  const editorRef = useRef(null)
  const previewRef = useRef(null)

  const { tree: globalTree } = useProjectTree(globalDir)
  const { tree: projectTree } = useProjectTree(currentProject)

  const { isEditorMode, filePath: editorFilePath, submit, cancel } = useEditorMode()

  useScrollSync(editorRef, previewRef)

  useEffect(() => {
    async function init() {
      if (!window.api) return
      if (isEditorMode && editorFilePath) {
        openTab(editorFilePath)
        return
      }
      const info = await window.api.getProjectInfo()
      setCurrentProject(info.projectRoot)
      setGlobalDir(info.globalDir)
      const projs = await window.api.getProjects()
      setProjects(projs)
      const fp = await window.api.getFilePath()
      if (fp) openTab(fp)
    }
    init()
  }, [openTab, isEditorMode, editorFilePath])

  useEffect(() => {
    if (!window.api) return
    const unsubscribe = window.api.onFileChanged((content) => {
      if (!activeTab) return
      updateContent(activeTab.id, content)
    })
    return unsubscribe
  }, [activeTab, updateContent])

  useEffect(() => {
    function handleKeyDown(e) {
      if (isEditorMode && e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        if (activeTab) submit(activeTab.content)
        return
      }
      if (isEditorMode && e.key === 'Escape') {
        e.preventDefault()
        cancel()
        return
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        if (activeTabId) forceSave(activeTabId)
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault()
        handleOpenFile()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setMode(prev => prev === 'edit' ? 'preview' : 'edit')
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setSidebarVisible(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, forceSave, isEditorMode, submit, cancel, activeTab])

  async function handleOpenFile() {
    if (!window.api) return
    const result = await window.api.openFile()
    if (result) openTab(result.filePath, result.content)
  }

  async function handleProjectSelect(projectPath) {
    if (!window.api) return
    await window.api.saveProject(projectPath)
    setCurrentProject(projectPath)
    const projs = await window.api.getProjects()
    setProjects(projs)
  }

  async function handleProjectBrowse() {
    if (!window.api) return
    const path = await window.api.browseForProject()
    if (path) handleProjectSelect(path)
  }

  const statusFilename = isEditorMode
    ? '● Prompt'
    : (activeTab ? (activeTab.dirty ? `${activeTab.filename} *` : activeTab.filename) : 'No file open')

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <div className="flex-1 flex overflow-hidden">
        {sidebarVisible && !isEditorMode && (
          <div className="w-[220px] shrink-0">
            <Sidebar
              currentProject={currentProject}
              projects={projects}
              globalTree={globalTree}
              projectTree={projectTree}
              activeFilePath={activeTab?.path ?? null}
              onFileClick={openTab}
              onProjectSelect={handleProjectSelect}
              onProjectBrowse={handleProjectBrowse}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {!isEditorMode && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabClick={setActiveTab}
              onTabClose={closeTab}
            />
          )}
          {activeTab ? (
            <div className="flex-1 flex overflow-hidden">
              {mode === 'edit' && (
                <div ref={editorRef} className="w-1/2 border-r border-border">
                  <Editor
                    content={activeTab.content}
                    onChange={newContent => updateContent(activeTabId, newContent)}
                  />
                </div>
              )}
              <div ref={previewRef} className={mode === 'edit' ? 'w-1/2' : 'w-full'}>
                <Preview content={activeTab.content} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-text-muted mb-2">No file open</p>
                <p className="text-xs text-text-muted">
                  Select a file from the sidebar or press{' '}
                  <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs">Ctrl+O</kbd>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <StatusBar
        filename={statusFilename}
        wordCount={activeTab ? countWords(activeTab.content) : 0}
        mode={mode}
        editorMode={isEditorMode}
      />
    </div>
  )
}
