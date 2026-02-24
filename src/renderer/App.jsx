// ABOUTME: Root application component. Manages layout mode and top-level state.
// ABOUTME: Renders the split-pane editor/preview layout with status bar.

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-border">
          {/* Editor goes here */}
          <div className="p-4 text-text-muted">Editor placeholder</div>
        </div>
        <div className="w-1/2 overflow-auto">
          {/* Preview goes here */}
          <div className="p-4 text-text-muted">Preview placeholder</div>
        </div>
      </div>
      <div className="h-6 bg-surface border-t border-border px-3 flex items-center text-xs text-text-muted">
        Status bar placeholder
      </div>
    </div>
  )
}
