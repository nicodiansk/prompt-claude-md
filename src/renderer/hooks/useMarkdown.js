// ABOUTME: Configures markdown-it with GFM features and syntax highlighting.
// ABOUTME: Exports a renderMarkdown function used by the Preview component.

import markdownit from 'markdown-it'
import hljs from 'highlight.js'
import taskLists from 'markdown-it-task-lists'
import texmath from 'markdown-it-texmath'
import katex from 'katex'

const md = markdownit({
  html: true,
  linkify: true,
  typographer: false,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre><code class="hljs language-' + lang + '">' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
      } catch (_) { /* fall through */ }
    }
    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

md.enable(['table', 'strikethrough'])
md.use(taskLists)
md.use(texmath, { engine: katex, delimiters: 'dollars' })

export function renderMarkdown(source) {
  if (!source) return ''
  return md.render(source)
}
