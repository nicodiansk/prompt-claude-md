// ABOUTME: Utility function for conditional CSS class merging.
// ABOUTME: Used by Magic UI and shadcn-style components throughout the renderer.

import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
