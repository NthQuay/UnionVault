# New Session Prompt — pick up from Session 18 (8 Nov 2026)

Read `docs/sessions/HANDOFF_SESSION18.md` (start with "Session 18 at a glance" and "Lessons") and `docs/CLAUDE_CODE_CONTEXT.md` before doing anything else. `CLAUDE.md` holds the settled facts — don't ask me about them again.

- **Repo:** `NthQuay/UnionVault` (push here). No-build-step PWA, GitHub Pages from `main`. Work on the session branch; fast-forward to `main` only after I say Accept. Visual changes: light + dark preview first.
- **Supabase:** project `hzafdlfprtzfxtyaebmc`, ap-southeast-2. `apply_migration` asks me to confirm destructive SQL and times out — give me the SQL to run in the dashboard SQL editor instead. No SQL is outstanding.
- **Live build:** **v510.2** on `main`. Next deploy is **v510.3** (point releases: .1 each deploy; `APP_BUILD` in `js/autocomplete.js` and `CACHE` in `sw.js` together).
- **Edge functions:** `send-guest-email` (v24) and `send-vendor-brief-email` (v9) share `supabase/functions/_shared/email-templates.ts` — change it once, redeploy both with the shared file included.
- **Never use the native colour picker** — `js/colorpicker.js` handles every `<input type="color">`.
- **Nothing pending** on any branch. `claude/busy-ptolemy-3ri5ri` (SEO pages + social media kit) is kept for later — don't merge or delete it.
- **Worth checking first (real devices):** send myself an Editorial and an Atelier invite + vendor brief; open the RSVP link/QR on my phone (new header + step 1 with plus-one question); create a fresh account through the rewired setup wizard.

First action: confirm the git remote is `NthQuay/UnionVault`, then ask me what to work on next.
