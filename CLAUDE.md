# UnionVault — standing facts for every Claude Code session

Read the latest `docs/sessions/HANDOFF_SESSION*.md` and `docs/CLAUDE_CODE_CONTEXT.md` for full context. The facts below are settled — do not ask the user about them again.

## Supabase (project `hzafdlfprtzfxtyaebmc`, ap-southeast-2)

- **`RESEND_API_KEY` edge function secret is SET** (since 24 Oct 2026, SHA256 digest starts `45658b6c3e93…`). Never ask the user for the Resend key. Never write its value into this repo — the repo is public.
- **`unionvault.app` is verified in Resend** (DNS done). Appointment emails send from `UnionVault <appointments@unionvault.app>` (default in `supabase/functions/send-appointment-email/index.ts`; overridable via an `EMAIL_FROM` secret, not set).
- **Storage `photos` SELECT RLS policy EXISTS** ("Users can read own photos", plus "Users manage own photos …" SELECT/INSERT/UPDATE/DELETE). Parked item P2 is done.

## Conventions (short form)

- Single file `index.html`, no build step, no imports. Branch `main` only; `git push -u origin main`.
- Bump `APP_BUILD` in `index.html` and `CACHE` in `sw.js` together on every app deploy.
- Visual changes: light + dark preview first, wait for Accept / Reject / Adjust.

## Repo layout

- Root: only what the live site / Supabase needs (`index.html`, `sw.js`, `manifest.webmanifest`, `CNAME`, `.nojekyll`, `og-image.png`, `assets/`, `icons/`, `logos/`, `supabase/`). Keep it that way.
- `docs/` — reference docs (`CLAUDE_CODE_CONTEXT.md`, changelog, decisions).
- `docs/sessions/` — per-session handoffs and new-session prompts. New handoffs go here, not at the root.
- `scripts/` — helper scripts.
