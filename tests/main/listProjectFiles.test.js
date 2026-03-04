// ABOUTME: Tests for the project file lister used by @ autocomplete.
// ABOUTME: Verifies recursive listing, directory skipping, and relative paths.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { listProjectFiles } from '../../src/main/listProjectFiles.js'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('listProjectFiles', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'listfiles-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('returns empty array for empty directory', async () => {
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual([])
  })

  it('returns all file types as relative paths', async () => {
    await writeFile(join(tempDir, 'index.js'), '')
    await writeFile(join(tempDir, 'README.md'), '')
    await writeFile(join(tempDir, 'style.css'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual(expect.arrayContaining(['index.js', 'README.md', 'style.css']))
    expect(result).toHaveLength(3)
  })

  it('returns nested files with relative paths', async () => {
    const sub = join(tempDir, 'src')
    await mkdir(sub)
    await writeFile(join(sub, 'app.js'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toContain('src/app.js')
  })

  it('skips node_modules, .git, out, dist, build', async () => {
    for (const name of ['node_modules', '.git', 'out', 'dist', 'build']) {
      const sub = join(tempDir, name)
      await mkdir(sub)
      await writeFile(join(sub, 'file.js'), '')
    }
    await writeFile(join(tempDir, 'keep.js'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual(['keep.js'])
  })

  it('sorts results alphabetically', async () => {
    await writeFile(join(tempDir, 'z.js'), '')
    await writeFile(join(tempDir, 'a.js'), '')
    const sub = join(tempDir, 'src')
    await mkdir(sub)
    await writeFile(join(sub, 'b.js'), '')
    const result = await listProjectFiles(tempDir)
    expect(result).toEqual(['a.js', 'src/b.js', 'z.js'])
  })
})
