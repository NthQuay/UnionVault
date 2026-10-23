# UnionVault — New Session Startup Prompt

Paste everything between the lines into a fresh Claude Code chat.

---

You are continuing development of **UnionVault**, a single-file PWA wedding planner app deployed at `unionvault.app`.

**Your first action:** Read `/home/user/unionvault/CLAUDE_CODE_CONTEXT.md` in full before doing anything else. That file is the authoritative state dump — architecture, line map, Supabase schema, recent changes, parked ideas, and working conventions. Do not ask me to re-explain anything already in it.

**Repo:** `https://github.com/mandyjane/UnionVault`  
**Working directory:** `/home/user/unionvault/`  
**Working files:** `index.html` + `sw.js`  
**Current SW cache version:** `union-vault-v95` — bump to `v96` on the next deploy  
**Live URL:** `https://unionvault.app`  
**Supabase project ID:** `hzafdlfprtzfxtyaebmc` (ap-southeast-2)

**Where we left off:** Session 7 just ended. All four fixes from that session are committed and live:
1. Cross-account privacy fix — boot-time `uv_uid` check + import auto-sync block (commit `95e6182`)
2. Collapsed sidebar rings icon restored (commit `de03fa4`)
3. Overlay flash on load fixed (commit `fcfbf89`)
4. Landing page hero empty space reduced by ~50% (commit `c32c159`)

**Immediate priorities (from `CLAUDE_CODE_CONTEXT.md` §4):**
1. **Verify the privacy fix** (P11) — test sign-in with two separate accounts in the same browser to confirm data isolation is working in production.
2. **Add Supabase Storage SELECT RLS policy** (P2) — cross-device Vision Board photo sync is blocked without it. SQL: `CREATE POLICY "Users can read own photos" ON storage.objects FOR SELECT TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);`
3. **Remove debug `console.log` from `_lpSignIn()`** (P5) — present since Session 2, must go before public launch.

Read `CLAUDE_CODE_CONTEXT.md` now, confirm you have the full picture, then ask me what I'd like to tackle first.

---
