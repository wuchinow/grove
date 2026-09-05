# Grove

AI study coach for kids. A student photographs their schoolwork, the app pulls out
the key concepts, then runs a Socratic tutoring session (question, hint, explain,
check) on each one. Progress shows as a grove of trees: taller with more days
practiced, greener/fuller with higher mastery.

Adapted from Phil's original single-file prototype (`grove-demo.jsx`) into a real
Next.js app that can run outside the Claude sandbox.

## Required setup: three environment variables

The original prototype called the Anthropic API directly from the browser with no
key, relying on the Claude sandbox to inject one. That only works inside Claude's
sandbox. This version calls a server route instead (`app/api/anthropic/route.js`),
which needs a real API key set as an environment variable.

Saved groves live in Supabase (project `grove`, ref `xpawazygyvupevgjusyv`), reached
through a second server route (`app/api/grove/route.js`) with the service role key.

In the Vercel dashboard for this project, Settings -> Environment Variables, add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic API key (console.anthropic.com) |
| `SUPABASE_URL` | `https://xpawazygyvupevgjusyv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> project grove -> Settings -> API -> service_role key |

Tick Production on each, then Deployments -> Redeploy. Env var changes only take
effect on the next deployment. The browser never sees any of these; only the
server routes do.

## Per-child groves (no login yet)

Open the app with `?child=<name>` (for example `/?child=asher`) and that grove is
loaded from and saved to Supabase under that name. Without `?child=`, the app runs
as a session-only demo. Names are lowercased and stripped to letters, digits, `-`
and `_`. Anyone with a link can open that grove, so treat links as unlisted URLs:
fine for family testing, not for strangers. Real parent-owned accounts with child
profiles are the next phase.

Database: one table, `groves(child_id text primary key, concepts jsonb, updated_at)`,
with row level security on so only the service role can touch it.

## How it works

- `app/page.js` is the whole kid-facing app (client component). Same UI, logic,
  and visuals as the original prototype, just adapted to fetch from `/api/anthropic`
  instead of calling Anthropic directly.
- `app/api/anthropic/route.js` is the server proxy. It reads `ANTHROPIC_API_KEY`
  from the environment, forwards the request to Anthropic's Messages API, and
  returns the response as-is.
- Two AI calls, both through the proxy:
  - **Concept extraction** (vision): photo in, returns
    `{ subject, concepts: [{ name, note }] }`.
  - **Tutor turn** (chat): the whole conversation is resent each turn (the API is
    stateless). Returns `{ message, phase, understanding, options }`, where `phase`
    drives the question/hint/explain/check/done flow and `understanding` drives the
    mastery score.

## Current limitations (expected for this phase)

- **No accounts.** Groves are keyed by the name in the link, not by a login.
- **No spaced repetition yet.** "Next review" labels are placeholders.
- **No COPPA-specific handling yet.** Fine for testing with your own kid under your
  own roof, not for distribution beyond that.

These map to the next build phases (persistence, auth) rather than being bugs.

## Local development

```
npm install
npm run dev
```

Add a `.env.local` file with the same three variables to test locally.

## Deploying

Connected to `github.com/wuchinow/grove` on the `main` branch. Vercel deploys
automatically on every push to `main`.
