// ABOUTME: Reads a directory tree filtered to .md files for the sidebar file browser.
// ABOUTME: Recursively walks directories, skipping common build/dependency folders.

import { readdir } from 'fs/promises'
import { join } from 'path'

const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'build'])

export async function readDirTree(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })

  const dirs = entries
    .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  const files = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))

  const dirNodes = await Promise.all(
    dirs.map(async dir => {
      const childPath = join(dirPath, dir.name)
      const children = await readDirTree(childPath)
      if (children.length === 0) return null
      return { name: dir.name, path: childPath, type: 'dir', children }
    })
  )

  const fileNodes = files.map(file => ({
    name: file.name,
    path: join(dirPath, file.name),
    type: 'file'
  }))

  return [...dirNodes.filter(Boolean), ...fileNodes]
}
