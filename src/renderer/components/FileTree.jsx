// ABOUTME: Renders a labelled, scrollable tree of .md file nodes for the sidebar.
// ABOUTME: Delegates individual node rendering to FileTreeNode.

import FileTreeNode from './FileTreeNode'

export default function FileTree({ label, nodes, onFileClick, activeFilePath }) {
  return (
    <div>
      <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider select-none">
        {label}
      </div>
      {nodes.map(node => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  )
}
