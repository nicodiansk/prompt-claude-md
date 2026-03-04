// ABOUTME: Walks a directory tree and returns a flat list of all file paths.
// ABOUTME: Used by @ autocomplete to provide file reference suggestions.

import { readdir } from 'fs/promises'
import { join, relative } from 'path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'build'])

export async function listProjectFiles(rootPath) {
  const results = []
  await walk(rootPath, rootPath, results)
  return results.sort()
}

async function walk(currentPath, rootPath, results) {
  const entries = await readdir(currentPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walk(fullPath, rootPath, results)
      }
    } else if (entry.isFile()) {
      results.push(relative(rootPath, fullPath).replace(/\\/g, '/'))
    }
  }
}
