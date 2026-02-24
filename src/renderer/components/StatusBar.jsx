// ABOUTME: Displays filename, word count, and edit/preview mode in the status bar.
// ABOUTME: Thin bar at the bottom of the window.

import { cn } from '@/lib/utils'

export default function StatusBar({ filename, wordCount, mode, saveStatus }) {
  return (
    <div className="h-6 bg-surface border-t border-border px-3 flex items-center justify-between text-xs text-text-muted select-none">
      <div className="flex items-center gap-3">
        <span>{filename}</span>
        {saveStatus === 'saved' && <span className="text-accent">Saved</span>}
        <span>{wordCount} words</span>
      </div>
      <div>
        <span className={cn(
          'uppercase tracking-wider',
          mode === 'edit' ? 'text-accent' : 'text-text-muted'
        )}>
          {mode}
        </span>
      </div>
    </div>
  )
}
