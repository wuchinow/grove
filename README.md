# Grove

AI study coach for kids. A student photographs their schoolwork, the app pulls out
the key concepts, then runs a Socratic tutoring session (question, hint, explain,
check) on each one. Progress shows as a grove of trees: taller with more days
practiced, greener/fuller with higher mastery.

Adapted from Phil's original single-file prototype (`grove-demo.jsx`) into a real
Next.js app that can run outside the Claude sandbox.

## Required setup: four environment variables

The browser never sees any of these; only the server routes do. In the Vercel
dashboard for this project, Settings -> Environment Variables, add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic API key (console.anthropic.com) |
| `SUPABASE_URL` | `https://xpawazygyvupevgjusyv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> project grove -> Settings -> API -> service_role key |
| `SUPABASE_ANON_KEY` | Supabase -> project grove -> Settings -> API -> anon / public key |

Tick Production on each, then Deployments -> Redeploy. Env var changes only take
effect on the next deployment.

## Accounts

Everyone signs in with a username and password. The username is the
`student_id`; the email is only for account recovery. Supabase Auth holds the
credentials (Email provider on, confirmation off for the beta), reached over its
REST API from `app/lib/auth.js` and the routes under `app/api/auth/`. The session
is an httpOnly cookie. Every data route resolves who is asking from that cookie
and never trusts an id sent by the browser.

- **Guest** (no account): the full app, held in memory, gone on refresh. Signing
  up mid-session saves whatever the guest built to the new account.
- **Beta links** (`?student=NAME`): still work for a row that no account has
  claimed. Signing up with that same username claims it, with its groves and
  history, and the link stops working. The admin dashboard has an "attach"
  control for anyone who signed up under a different name.
- **Admin**: `students.role = 'admin'` shows a Dashboard entry in the account
  menu and unlocks `/admin` and `/api/admin/*`. Everyone else gets a 404 there.

Database: `students` (identity, grade, interests, insights) and `groves` (one
row per grove, several per student). Row level security is on with no policies,
so only the service role can read or write. Migrations live in `supabase/migrations/`.

## How it works

- `app/page.js` is a router; `app/lib/useGrove.js` owns all client state; one
  file per screen under `app/screens/`.
- `app/api/anthropic/route.js` is the server proxy for the Anthropic key. Model
  is `claude-sonnet-5`, set in `app/lib/ai.js`.
- Three AI calls, all through the proxy: concept extraction from a photo,
  typed-topic breakdown, and the tutor turn. The whole conversation is resent
  each turn. The tutor returns `{ message, phase, understanding, options,
  correctOption, visual, reflection }`.

## Current limitations

- **No password reset yet.** Ask David.
- **No spaced repetition yet.** "Next review" labels are placeholders.
- **No COPPA-specific handling yet.** Fine for family and friends, not for
  distribution beyond that.

## Local development

```
npm install
npm run dev
```

Add a `.env.local` file with the same four variables to test locally.

## Deploying

Connected to `github.com/wuchinow/grove` on the `main` branch. Vercel deploys
automatically on every push to `main`.
