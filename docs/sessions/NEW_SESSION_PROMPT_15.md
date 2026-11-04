# New Session Prompt — pick up from Session 15 (4 Nov 2026)

Read `docs/sessions/HANDOFF_SESSION15.md` and `docs/CLAUDE_CODE_CONTEXT.md` before doing anything else.

Quick orientation:

- **Project:** UnionVault — no-build-step PWA (`index.html` shell + `js/*.js`/`css/*.css`), GitHub Pages, `main` branch of `NthQuay/UnionVault`.
- **Supabase:** project `hzafdlfprtzfxtyaebmc`, ap-southeast-2. One new SQL function this session (`compute_tier`), no table changes.
- **Live build:** v461 (commit `dbfb70a`) — working tree clean, `main` pushed. GitHub Pages deploys straight from `main` root with no Actions workflow, so there's no CI run to check — just confirm the commit SHA.
- **Edge functions:** all 5 (`send-guest-email`, `send-appointment-email`, `send-vendor-brief-email`, `rsvp-confirm-email`, `ww-email-details`) deployed and confirmed matching disk.

**Session 15 finished a follow-on round on the Communications page** (built two sessions ago): fixed a real server-side tier-lookup bug (every email function ignored granted access/subscriptions, explaining two separate "branding won't go away" reports), added lightweight rich-text markup (`**bold**`/`*italic*`/`__underline__`/`"## "` heading) with a toolbar and SMS auto-strip, an ordinal-date toggle, per-email Design overrides, a redesigned color picker, Reset-to-default buttons everywhere, rewrote the default Save the date/Invite/RSVP reminder templates, and gave Invite a real RSVP button plus a new "visit our wedding website" CTA (shown only when the site's actually published).

**THE ONE PENDING TASK IS: none.** Everything requested was built, deployed, verified, merged to `main`, and pushed.

**Important lesson from this session, read before building any mockup of a branded email or anything else assembled from several pieces at send time:** render it with the actual production code (the real `buildParas`/`inviteBlockHtml`-equivalent helpers, run for real and screenshotted), not a hand-built visual approximation. A hand-approximated mockup this session left out a block that's mechanically appended at send time, which read as "you deleted something" even though the real shipped template hadn't changed — see §4 of `HANDOFF_SESSION15.md` for the full story and the local render-verification pattern that fixes it (serve the repo locally, drive `index.html` with Playwright via `_lpContinueOffline()`, no real Supabase session needed).

**First action in this session:** there is nothing to resume — wait for the user's next request. If it touches the Communications page or any of the 5 email edge functions again, skim §3 and §5 of `HANDOFF_SESSION15.md` first for what's there now and where.

Full technical detail, exact helper locations, and the parked-ideas list are all in `docs/sessions/HANDOFF_SESSION15.md`.
