# Grove — instructions for Claude Code

This repo's Claude Code sessions run on Opus 5.5, subagents included. Don't
delegate to lower-tier models.

Before touching any screen, read `UX-RULES.md` (repo root) and the runbook's
"Product rules worth not breaking" section (Notion: `flight school` → `grove`
→ `runbook`). If a request conflicts with either, say so and flag the
conflict rather than complying silently.

What to build is on the roadmap (Notion: `flight school` → `grove` →
`roadmap`), under "Now". How work gets done — the loop, the retired
patterns, the rules that keep costing us when broken, deploy verification —
is on the runbook. Read both before planning a build; plan against the real
files in this repo, not against the roadmap's prose alone.

Every build stage starts in plan mode and waits for approval before writing
any code.

After every push: add one row to the changelog database (Notion: `flight
school` → `grove` → `changelog`) with a page create, never edit another row,
and update the "Production as of" line on the roadmap. Then move shipped items
out of "Now" and sync the to-do list so it never disagrees with the roadmap.
