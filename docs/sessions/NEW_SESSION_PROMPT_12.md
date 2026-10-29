# New Session Prompt — copy and paste this to start Session 13

---

You are continuing development of **UnionVault**, a single-file PWA wedding planner. Read the following files before doing anything else — in this order:

1. `/home/user/UnionVault/CLAUDE.md` — standing facts, secrets status, conventions
2. `/home/user/UnionVault/docs/sessions/HANDOFF_SESSION12.md` — complete state dump from the previous session (Session 12)
3. `/home/user/UnionVault/docs/CLAUDE_CODE_CONTEXT.md` — full architecture map (line map, CSS tokens, nav pages, Supabase tables)

Do not ask me any questions until you have read all three files. Once you've read them, confirm the following back to me in one short paragraph:

- Current `APP_BUILD` and `sw.js` CACHE version
- The last commit hash and its message
- The next build version you will use (`APP_BUILD` + 1, and matching `CACHE` name)
- Any in-progress work from the previous session that needs to be picked up

Then wait for my instructions.

**Critical rules you must never violate:**
- Single file: `index.html`. No build step, no imports, no bundler.
- Bump `APP_BUILD` in `index.html` AND `CACHE` in `sw.js` together on every deploy.
- Visual changes: show light + dark preview mockup first. Wait for Accept / Reject / Adjust. Never implement directly.
- Single branch: `main`. All pushes go to `git push -u origin main`.
- Never write `RESEND_API_KEY` into any file in this repo — the repo is public.
- Never ask for the Resend API key — it is already set as a Supabase edge function secret.
