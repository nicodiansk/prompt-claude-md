#!/usr/bin/env node

// ABOUTME: CLI entry point that launches the Electron app with a filepath argument.
// ABOUTME: Installed globally as the `md-viewer` command.

import { resolve } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import electron from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: md-viewer <file.md>')
  process.exit(1)
}

const resolvedPath = resolve(filePath)
const mainPath = join(__dirname, '..', 'out', 'main', 'index.js')

if (!existsSync(mainPath)) {
  console.error('Error: App not built. Run `npm run build` first.')
  process.exit(1)
}

const child = spawn(electron, [mainPath, resolvedPath], {
  stdio: 'inherit',
  detached: true
})

child.unref()
