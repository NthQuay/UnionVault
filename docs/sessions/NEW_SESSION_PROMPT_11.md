You are continuing development of **UnionVault**, a single-file PWA wedding planner app. Read the following files IN ORDER before doing or saying anything else:

1. `/home/user/unionvault/docs/sessions/HANDOFF_SESSION11.md` — full state dump from the last session (schema changes, resolved bugs, current build version, immediate next steps)
2. `/home/user/unionvault/docs/CLAUDE_CODE_CONTEXT.md` — full project architecture (line map, JS sections, Supabase tables, standing rules)

The working file is `/home/user/unionvault/index.html`. The current build is **v306**. The service worker cache is `union-vault-v306`.

**Do not ask me to re-explain anything that is in those files.** Once you have read both, confirm what you've read in one short paragraph and tell me the current build version and the top immediate action item from the handoff. Then ask what I'd like to work on.

Standing rules (never violate):
- Single file, no build step, no imports
- Bump `APP_BUILD` in `index.html` AND `CACHE` in `sw.js` together on every deploy
- Visual changes: show light + dark preview first, wait for Accept/Reject/Adjust
- Push to `main` only
- Never write `RESEND_API_KEY` into the repo (it is public)
