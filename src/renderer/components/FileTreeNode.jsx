// ABOUTME: Renders a single node in the file tree — a file or collapsible directory.
// ABOUTME: Handles expand/collapse for directories and click-to-open for files.

import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function FileTreeNode({ node, depth = 0, onFileClick, activeFilePath }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const indent = depth * 12

  if (node.type === 'file') {
    const isActive = node.path === activeFilePath
    return (
      <button
        className={cn(
          'w-full text-left py-0.5 text-xs truncate hover:bg-surface-bright transition-colors',
          isActive ? 'bg-surface-bright text-accent' : 'text-text-muted'
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => onFileClick(node.path)}
        title={node.path}
      >
        {node.name}
      </button>
    )
  }

  return (
    <div>
      <button
        className="w-full text-left py-0.5 text-xs text-text flex items-center gap-1 hover:bg-surface-bright transition-colors"
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={() => setExpanded(prev => !prev)}
      >
        <span className="text-text-muted shrink-0">{expanded ? '▾' : '▸'}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && node.children?.map(child => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  )
}
