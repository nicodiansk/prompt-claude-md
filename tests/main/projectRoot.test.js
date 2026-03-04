// ABOUTME: Tests for project root detection by walking up the directory tree.
// ABOUTME: Verifies detection of .git, package.json, and .claude markers.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectProjectRoot } from '../../src/main/projectRoot.js'
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('detectProjectRoot', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'projroot-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('detects root from package.json marker', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}')
    const sub = join(tempDir, 'src', 'deep')
    await mkdir(sub, { recursive: true })
    const root = await detectProjectRoot(sub)
    expect(root).toBe(tempDir)
  })

  it('detects root from .git marker', async () => {
    await mkdir(join(tempDir, '.git'))
    const sub = join(tempDir, 'docs')
    await mkdir(sub)
    const root = await detectProjectRoot(sub)
    expect(root).toBe(tempDir)
  })

  it('detects root from .claude marker', async () => {
    await mkdir(join(tempDir, '.claude'))
    const sub = join(tempDir, 'nested')
    await mkdir(sub)
    const root = await detectProjectRoot(sub)
    expect(root).toBe(tempDir)
  })

  it('prefers closest marker when multiple exist up the tree', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}')
    const inner = join(tempDir, 'sub')
    await mkdir(inner)
    await mkdir(join(inner, '.git'))
    const root = await detectProjectRoot(inner)
    expect(root).toBe(inner)
  })
})
