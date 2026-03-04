// ABOUTME: Manages the recent projects list persisted to a JSON file.
// ABOUTME: Stores up to 10 projects sorted by last opened time.

import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname, basename } from 'path'

const MAX_PROJECTS = 10

export async function getProjects(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function saveProject(filePath, projectPath) {
  const projects = await getProjects(filePath)
  const name = basename(projectPath)
  const now = new Date().toISOString()

  const idx = projects.findIndex(p => p.path === projectPath)
  if (idx >= 0) {
    projects[idx].lastOpened = now
  } else {
    projects.push({ path: projectPath, name, lastOpened: now })
  }

  projects.sort((a, b) => b.lastOpened.localeCompare(a.lastOpened))
  const trimmed = projects.slice(0, MAX_PROJECTS)

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(trimmed, null, 2), 'utf-8')
  return trimmed
}
