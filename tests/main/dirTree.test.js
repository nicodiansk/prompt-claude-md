// ABOUTME: Tests for the directory tree reader used by the sidebar file browser.
// ABOUTME: Verifies .md filtering, directory skipping, and sort order.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readDirTree } from '../../src/main/dirTree.js'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('readDirTree', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dirtree-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('returns empty array for empty directory', async () => {
    const result = await readDirTree(tempDir)
    expect(result).toEqual([])
  })

  it('returns .md files', async () => {
    await writeFile(join(tempDir, 'foo.md'), '')
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'foo.md', type: 'file' })
  })

  it('skips non-.md files', async () => {
    await writeFile(join(tempDir, 'foo.md'), '')
    await writeFile(join(tempDir, 'bar.js'), '')
    await writeFile(join(tempDir, 'baz.txt'), '')
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(1)
  })

  it('returns nested directory containing .md files', async () => {
    const sub = join(tempDir, 'agents')
    await mkdir(sub)
    await writeFile(join(sub, 'foo.md'), '')
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'agents', type: 'dir' })
    expect(result[0].children).toHaveLength(1)
  })

  it('omits directories with no .md descendants', async () => {
    const sub = join(tempDir, 'empty-dir')
    await mkdir(sub)
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(0)
  })

  it('skips node_modules, .git, out, dist, build', async () => {
    for (const name of ['node_modules', '.git', 'out', 'dist', 'build']) {
      const sub = join(tempDir, name)
      await mkdir(sub)
      await writeFile(join(sub, 'foo.md'), '')
    }
    const result = await readDirTree(tempDir)
    expect(result).toHaveLength(0)
  })

  it('sorts directories before files alphabetically', async () => {
    await writeFile(join(tempDir, 'z.md'), '')
    await writeFile(join(tempDir, 'a.md'), '')
    const sub = join(tempDir, 'mdocs')
    await mkdir(sub)
    await writeFile(join(sub, 'x.md'), '')
    const result = await readDirTree(tempDir)
    expect(result[0].type).toBe('dir')
    expect(result[1].name).toBe('a.md')
    expect(result[2].name).toBe('z.md')
  })
})
