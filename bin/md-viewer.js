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

const args = process.argv.slice(2)
const isEditorMode = args.includes('--editor-mode')
const flags = args.filter(arg => arg.startsWith('-'))
const fileArg = args.find(arg => !arg.startsWith('-'))

if (!fileArg) {
  console.error('Usage: md-viewer [--editor-mode] <file>')
  process.exit(1)
}

const resolvedPath = resolve(fileArg)
const mainPath = join(__dirname, '..', 'out', 'main', 'index.js')

if (!existsSync(mainPath)) {
  console.error('Error: App not built. Run `npm run build` first.')
  process.exit(1)
}

const electronArgs = [mainPath, ...flags, resolvedPath]

if (isEditorMode) {
  // Editor mode: block until Electron exits, but don't inherit stdio to avoid
  // corrupting the parent terminal (Claude Code) when Electron quits
  const child = spawn(electron, electronArgs, { stdio: 'ignore' })
  child.on('exit', (code) => process.exit(code ?? 0))
} else {
  // Normal mode: detach so the terminal is freed
  const child = spawn(electron, electronArgs, {
    stdio: 'inherit',
    detached: true
  })
  child.unref()
}
