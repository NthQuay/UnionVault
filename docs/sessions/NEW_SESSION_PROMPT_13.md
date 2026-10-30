# New Session Prompt — pick up from Session 10 (30 Oct 2026)

Read `docs/sessions/HANDOFF_SESSION10.md` and `docs/CLAUDE_CODE_CONTEXT.md` before doing anything else.

Quick orientation:

- **Project:** UnionVault — single-file PWA (`index.html`, ~50k lines), GitHub Pages, `main` branch of `mandyjane/UnionVault`. No build step.
- **Supabase:** project `hzafdlfprtzfxtyaebmc`, ap-southeast-2. No schema changes pending.
- **Live build:** v369 (commit `dc8c4a3`) — working tree is clean.

**v369 shipped** at end of last session, fixing two RSVP overlay bugs:
1. "✓ Yes" / "No" pill buttons text-wrapping to two lines — fixed with `white-space:nowrap`
2. Meal chip selection silently failing — fixed by changing template `onclick` attribute to `window._chooseMeal(this)`

**THE ONE PENDING TASK is v370** — restoring the dietary section design in the RSVP overlay wizard. A before/after preview was shown to the user at the end of the previous session. The user has NOT yet said Accept, Reject, or Adjust.

**First action in this session:** Ask the user whether they Accept, Reject, or Adjust the dietary section redesign (chevron accordion + checkbox chips, no border box — matching the standalone RSVP form). Do NOT write any code until you have their answer.

All detail about exactly what lines to change is in `docs/sessions/HANDOFF_SESSION10.md` under "Immediate Action Plan — Step 1".
