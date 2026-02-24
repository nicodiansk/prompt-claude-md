// ABOUTME: Animated glowing border effect from Magic UI.
// ABOUTME: Applied to the main application shell for visual polish.

import { cn } from '@/lib/utils'

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = '#7aa2f7',
  className,
  children,
  ...props
}) {
  return (
    <div
      style={{
        '--border-radius': `${borderRadius}px`,
        '--border-width': `${borderWidth}px`,
        '--duration': `${duration}s`,
        '--mask-linear-gradient':
          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        '--background-radial-gradient':
          `radial-gradient(transparent, transparent, ${Array.isArray(color) ? color.join(',') : color}, transparent, transparent)`,
      }}
      className={cn(
        'relative rounded-[--border-radius] p-[--border-width]',
        'before:absolute before:inset-0 before:rounded-[--border-radius]',
        'before:p-[--border-width] before:will-change-[background-position]',
        'before:[background-image:--background-radial-gradient]',
        'before:[background-size:300%_300%]',
        'before:animate-[shine-border_var(--duration)_infinite_linear]',
        'before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]',
        'before:[-webkit-mask:--mask-linear-gradient]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
