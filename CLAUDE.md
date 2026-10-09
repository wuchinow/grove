# Grove — instructions for Claude Code

This repo's Claude Code sessions run on Opus 5.5, subagents included. Don't
delegate to lower-tier models.

Before touching any screen, read `UX-RULES.md` (repo root) and the runbook's
"Product rules worth not breaking" section (Notion: `flight school` → `grove`
→ `runbook`). If a request conflicts with either, say so and flag the
conflict rather than complying silently.

What to build is on the roadmap (Notion: `flight school` → `grove` →
`roadmap`): "The map" gives the build order and "Pushes" holds each open
push's detail. Standing calls a session must not reverse are on the
decisions page (`grove` → `decisions`). How work gets done — the loop, the
retired patterns, the rules that keep costing us when broken, deploy
verification — is on the runbook. Read all three before planning a build;
plan against the real files in this repo, not against the roadmap's prose
alone.

Every build stage starts in plan mode and waits for approval before writing
any code.

After every push: add one row to the changelog database (Notion: `flight
school` → `grove` → `changelog`) with a page create, never edit another row,
and update the "Production" line under the roadmap's "Where we are". Then
remove the shipped push from the map and Pushes, flip its feedback rows to
shipped, and refresh the next session page. The to-do list holds admin items
only, so touch it only when an admin item changes. The runbook's closeout
step has the full list. The roadmap stays under about 20,000 characters and
ends with the line `end of page`; edit it with targeted replacements, never
a full rewrite.
