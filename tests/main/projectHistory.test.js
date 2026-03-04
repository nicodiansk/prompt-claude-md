// ABOUTME: Tests for recent projects list persistence.
// ABOUTME: Verifies add, update, sort, and 10-item trim behavior.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getProjects, saveProject } from '../../src/main/projectHistory.js'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('projectHistory', () => {
  let tempDir
  let filePath

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'projhist-test-'))
    filePath = join(tempDir, 'projects.json')
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  describe('getProjects', () => {
    it('returns empty array when file does not exist', async () => {
      const projects = await getProjects(filePath)
      expect(projects).toEqual([])
    })
  })

  describe('saveProject', () => {
    it('adds a new project entry', async () => {
      const projects = await saveProject(filePath, '/path/to/project')
      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({ path: '/path/to/project', name: 'project' })
    })

    it('updates lastOpened for an existing project', async () => {
      await saveProject(filePath, '/path/to/project')
      const before = (await getProjects(filePath))[0].lastOpened
      await new Promise(r => setTimeout(r, 10))
      await saveProject(filePath, '/path/to/project')
      const after = (await getProjects(filePath))[0].lastOpened
      expect(after > before).toBe(true)
    })

    it('does not create duplicate entries', async () => {
      await saveProject(filePath, '/path/to/project')
      await saveProject(filePath, '/path/to/project')
      const projects = await getProjects(filePath)
      expect(projects).toHaveLength(1)
    })

    it('sorts projects by lastOpened descending', async () => {
      await saveProject(filePath, '/path/old')
      await new Promise(r => setTimeout(r, 10))
      await saveProject(filePath, '/path/new')
      const projects = await getProjects(filePath)
      expect(projects[0].path).toBe('/path/new')
    })

    it('trims to 10 entries', async () => {
      for (let i = 0; i < 12; i++) {
        await saveProject(filePath, `/path/project-${i}`)
      }
      const projects = await getProjects(filePath)
      expect(projects).toHaveLength(10)
    })
  })
})
