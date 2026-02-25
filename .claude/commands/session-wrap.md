---
description: Wrap up session with documentation updates and next-session prompt
---

End-of-session wrap-up. First read these for context:
- @CLAUDE.md (project rules and file organization)
- @docs/plans/ (current design docs)

Then do the following:

1. **Check recent work**: Run `git log --oneline -10` to see what was accomplished

2. **Archive old session docs**: Move any `docs/session-status-*.md` files to `docs/archive/`

3. **Generate next-session prompt**: Write a clear prompt for resuming work. Include:
   - Branch name
   - What's completed vs what's next
   - Key file references using `@path/to/file` format
   - How to run services

4. **Output the prompt**: Display directly in chat (NOT in a file) so user can copy it

5. **Commit**: Stage and commit archive changes with message "chore: archive session docs"

Format the next-session prompt like this:
```
@CLAUDE.md  Continue [PROJECT] - [CURRENT TASK]

Branch: `branch-name`

Completed:
- Item 1
- Item 2

Next Task: [Description]

Context Files:
- @path/to/design-doc.md (implementation plan)
- @path/to/relevant-code.tsx

Research Tools:
- **Web Search**: Use for December 2025 documentation on libraries/frameworks being implemented
- **Context7 MCP**: Check library docs before implementing features (React, FastAPI, Supabase, etc.)
- **Supabase MCP**: Inspect database schema, validate migrations, check table data when needed

Run Services:
[commands]

**Mandatory Rules**:
1. Use **TodoWrite tool** immediately to track all pending tasks
2. For long files (>200 lines), read only the **specific line ranges** needed - never read full files
3. After completing each task, **STOP and ask Nicholas** if he wants to continue or wrap up
4. Check context usage between tasks
```

**Important**: Always include `@CLAUDE.md` at the start of the prompt so Claude reads project rules automatically.
