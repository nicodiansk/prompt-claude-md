// ABOUTME: Detects the project root by walking up the directory tree.
// ABOUTME: Looks for .git, package.json, or .claude as root markers.

import { access } from 'fs/promises'
import { join, dirname } from 'path'

const MARKERS = ['.git', 'package.json', '.claude']

export async function detectProjectRoot(startPath) {
  let dir = startPath

  while (true) {
    for (const marker of MARKERS) {
      try {
        await access(join(dir, marker))
        return dir
      } catch {
        // marker not found, continue
      }
    }
    const parent = dirname(dir)
    if (parent === dir) return startPath // reached filesystem root
    dir = parent
  }
}
