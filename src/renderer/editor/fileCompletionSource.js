// ABOUTME: CodeMirror completion source for @ file references.
// ABOUTME: Triggers on @, fetches project file list, and fuzzy-filters results.

const CACHE_TTL = 5000

export function createFileCompletionSource(listFiles) {
  let cachedFiles = null
  let cacheTime = 0

  return async function fileCompletionSource(context) {
    const match = context.matchBefore(/@[\w./\-]*/)
    if (!match) return null

    const query = match.text.slice(1).toLowerCase()

    if (!cachedFiles || Date.now() - cacheTime > CACHE_TTL) {
      cachedFiles = await listFiles()
      cacheTime = Date.now()
    }

    const filtered = cachedFiles.filter(f => f.toLowerCase().includes(query)).sort()

    return {
      from: match.from,
      options: filtered.map(f => ({
        label: f,
        apply: `@${f}`,
        type: 'file'
      })),
      filter: false
    }
  }
}
