// ABOUTME: Tests for the useMarkdown hook that renders markdown to HTML.
// ABOUTME: Verifies GFM features and syntax highlighting integration.

import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@/hooks/useMarkdown'

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('# Hello')
    expect(html).toContain('<h1>Hello</h1>')
  })

  it('renders GFM tables', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  it('renders task lists', () => {
    const md = '- [x] done\n- [ ] todo'
    const html = renderMarkdown(md)
    expect(html).toContain('type="checkbox"')
  })

  it('renders strikethrough', () => {
    const md = '~~deleted~~'
    const html = renderMarkdown(md)
    expect(html).toContain('<s>deleted</s>')
  })

  it('syntax-highlights code blocks', () => {
    const md = '```js\nconst x = 1\n```'
    const html = renderMarkdown(md)
    expect(html).toContain('hljs')
  })

  it('renders inline code', () => {
    const html = renderMarkdown('use `const` here')
    expect(html).toContain('<code>const</code>')
  })

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })

  it('renders inline math with KaTeX', () => {
    const html = renderMarkdown('The equation $E=mc^2$ is famous.')
    expect(html).toContain('katex')
    expect(html).not.toContain('$E=mc^2$')
  })

  it('renders display math with KaTeX', () => {
    const html = renderMarkdown('$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$')
    expect(html).toContain('katex')
    expect(html).toContain('display')
  })

  it('does not affect text without math delimiters', () => {
    const html = renderMarkdown('Just a normal paragraph.')
    expect(html).not.toContain('katex')
    expect(html).toContain('<p>Just a normal paragraph.</p>')
  })
})
