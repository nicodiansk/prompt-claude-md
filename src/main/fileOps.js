// ABOUTME: File read and write operations for the main process.
// ABOUTME: Handles create-if-missing behavior for new files.

import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'

export async function readFileContent(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return await readFile(filePath, 'utf-8')
  } catch {
    // File doesn't exist — create it empty
    await writeFile(filePath, '', 'utf-8')
    return ''
  }
}

export async function writeFileContent(filePath, content) {
  await writeFile(filePath, content, 'utf-8')
}
