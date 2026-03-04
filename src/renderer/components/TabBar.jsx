// ABOUTME: Horizontal tab strip for switching between open editor files.
// ABOUTME: Shows filename, dirty indicator, and a close button per tab.

import { cn } from '@/lib/utils'

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose }) {
  if (tabs.length === 0) return null

  return (
    <div className="flex items-center bg-surface border-b border-border overflow-x-auto shrink-0" role="tablist">
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border cursor-pointer shrink-0 max-w-[180px] group',
            tab.id === activeTabId
              ? 'bg-background text-text border-t-2 border-t-accent'
              : 'text-text-muted hover:bg-surface-bright'
          )}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="truncate">{tab.dirty ? `${tab.filename} *` : tab.filename}</span>
          <button
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-auto shrink-0 leading-none"
            onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
            aria-label={`Close ${tab.filename}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
