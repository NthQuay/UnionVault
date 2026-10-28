You are continuing development of **UnionVault**, a single-file PWA wedding planner app. Read the following files IN ORDER before doing or saying anything else:

1. `/home/user/UnionVault/docs/sessions/HANDOFF_SESSION12.md` — full state dump from the last session (Supabase RPC changes, resolved bugs, current build version, immediate next steps)
2. `/home/user/UnionVault/docs/CLAUDE_CODE_CONTEXT.md` — full project architecture (line map, JS sections, Supabase tables, standing rules)

The working file is `/home/user/UnionVault/index.html`. The current build is **v323**. The service worker cache is `union-vault-v323`.

**Do not ask me to re-explain anything that is in those files.** Once you have read both, confirm what you've read in one short paragraph and tell me the current build version and the top immediate action item from the handoff. Then ask what I'd like to work on.

Standing rules (never violate):
- Single file, no build step, no imports
- Bump `APP_BUILD` in `index.html` AND `CACHE` in `sw.js` together on every deploy
- Visual changes: show light + dark preview first, wait for Accept/Reject/Adjust
- Working branch: `claude/youthful-turing-7zsmrd` — merge to `main` to deploy to production
- Never write `RESEND_API_KEY` into the repo (it is public)
- Never expose raw `guests`/`settings`/`families`/`wishingwell` rows to `anon` — always use RPCs

**Immediate first action:** v323 is on `claude/youthful-turing-7zsmrd` and has NOT yet been merged to `main`. The very first thing to do is merge the branch to `main` and push so GitHub Pages deploys the latest version to `unionvault.app`. Then verify the live vendor brief is working correctly (contact card, logo, section chips with labels and content, guest count formula).
