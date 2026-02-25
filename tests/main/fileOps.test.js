// ABOUTME: Tests for file operation functions used by the main process.
// ABOUTME: Tests read, write, and create-if-missing behavior using real temp files.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileContent, writeFileContent } from '../../src/main/fileOps.js'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('fileOps', () => {
  let tempDir

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'md-viewer-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  describe('readFileContent', () => {
    it('reads existing file content', async () => {
      const filePath = join(tempDir, 'test.md')
      await writeFileContent(filePath, '# Hello')
      const content = await readFileContent(filePath)
      expect(content).toBe('# Hello')
    })

    it('creates file and returns empty string if file does not exist', async () => {
      const filePath = join(tempDir, 'new.md')
      const content = await readFileContent(filePath)
      expect(content).toBe('')
      // Verify file was created
      const diskContent = await readFile(filePath, 'utf-8')
      expect(diskContent).toBe('')
    })
  })

  describe('writeFileContent', () => {
    it('writes content to file', async () => {
      const filePath = join(tempDir, 'output.md')
      await writeFileContent(filePath, '# Written')
      const content = await readFile(filePath, 'utf-8')
      expect(content).toBe('# Written')
    })

    it('overwrites existing content', async () => {
      const filePath = join(tempDir, 'overwrite.md')
      await writeFileContent(filePath, 'first')
      await writeFileContent(filePath, 'second')
      const content = await readFile(filePath, 'utf-8')
      expect(content).toBe('second')
    })
  })
})
