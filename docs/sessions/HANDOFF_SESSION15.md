# HANDOFF — Session 15
*Generated: 2026-11-04 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a wedding planning PWA. This file is the complete state dump from Session 15. Read it top to bottom before doing anything. Cross-reference `CLAUDE.md` (root) for standing facts, `docs/CLAUDE_CODE_CONTEXT.md` for the architecture map, and `docs/sessions/HANDOFF_SESSION14.md` for the session before this one.

**Standing rules (never violate):**
- No build step, no bundler. `index.html` is the app shell; CSS in `css/`, JS in `js/`, loaded via `<script>` tags.
- Every deploy: bump `APP_BUILD` in `js/autocomplete.js` **and** `CACHE` in `sw.js` together.
- Visual/design changes: show a light + dark mockup first — and when real send/preview logic is involved (branded HTML emails, anything token-filled), **render it with the actual production code**, not a hand-built approximation. A hand-styled mockup that leaves out a mechanically-appended block (see §4 below) reads as "you removed something" even when nothing in the real app changed — this cost real trust this session. Wait for Accept / Reject / Adjust before merging.
- **Deploy branch is `main`.** GitHub Pages auto-deploys from `main` root (~30s after push), no `.github/workflows` involved — it's not an Actions-based deploy, so there's no workflow run to check, just confirm `main`'s HEAD matches what you pushed.
- Never write `RESEND_API_KEY` into the repo — it is public. It's already set as a Supabase edge function secret — never ask the user for it.
- The **real** effective-tier logic for a user lives in the `get_my_subscription()` Postgres RPC, not the raw `user_profiles.tier` column (see §3). A new edge function that needs to know if a user is paid must call `compute_tier(p_user_id)` via service role — never read the column directly.

---

## 1. Context & Project Scope

**UnionVault** is a wedding planning PWA for couples. Features include guest list management, online RSVP, RSVP manager with Resend email invites, budget tracker, wishing well, appointments, checklist, mood board, a public wedding website builder, vendor brief generator, day-of timeline, Stripe subscriptions, automated cloud backups, and (built two sessions ago) a **Communications page** — one place to edit and preview every templated guest/vendor message.

**Infrastructure:**
- Supabase project `hzafdlfprtzfxtyaebmc` (ap-southeast-2)
- GitHub Pages at `https://unionvault.app`, custom domain, auto-deploys from `main`
- GitHub repo: `NthQuay/UnionVault`
- Resend: `unionvault.app` verified; edge functions in `supabase/functions/`, all deployed directly via `mcp__Supabase__deploy_edge_function` (no CI pipeline for functions)

---

## 2. Current Technical State

| Item | Value |
|---|---|
| `APP_BUILD` | `v461` |
| `sw.js` CACHE | `union-vault-v461` |
| `main` HEAD | `dbfb70a` (merge commit) — pushed, working tree clean |
| Session branch | `ccr-b19b9ede-kyqh3v` — merged into `main`, still exists, in sync as of the merge |
| Edge functions (all deployed, matching disk) | `send-guest-email` v17, `send-appointment-email` v13, `send-vendor-brief-email` v3, `rsvp-confirm-email` v7, `ww-email-details` v7 |
| `compute_tier(uuid)` SQL function | Applied, `service_role`-only |

No DB schema changes this session (the `compute_tier` function was added, but no table changes).

---

## 3. Session 15 Changes

Follow-on work to the Communications page (built two sessions ago). The user's original request was a long, itemized list; **everything in it was fully built, not a non-functional mock**, and deployed:

### Tier-lookup bug (root cause of two separate bug reports)
Every one of the 5 email edge functions computed free/paid branding by reading `user_profiles.tier` directly via REST — which ignores `granted_access_until` and the `subscriptions` table. The real logic lives only in `get_my_subscription()` (SECURITY DEFINER RPC, `auth.uid()`-scoped). Added `compute_tier(p_user_id uuid)`, a new SQL function that mirrors that exact logic but takes an explicit `p_user_id` (so service role can call it for an arbitrary user from inside an edge function); `EXECUTE` revoked from `public`/`anon`/`authenticated`, granted to `service_role` only. All 5 functions' tier lookup swapped to call it via `/rest/v1/rpc/compute_tier`.
This was the actual cause of: "Planned with UnionVault doesn't disappear on a paid account" and "unchecking Show logo removes the image but not the branding text" — neither was a UI bug; `showLogo` (cosmetic) and `showBranding` (server-computed, buggy) were always correctly independent, the server side was just wrong.

### Lightweight rich-text markup for emails
`**bold**`, `*italic*`, `__underline__`, plus a `"## "` line-prefix that renders as a larger (17px) italic "intro" paragraph. Implemented as a duplicated `applyInlineMarkup()`/`buildParas()` pair in every edge function (same duplication pattern the codebase already uses for `escH`/`linkifyWith` — no shared-module mechanism exists), applied **after** escaping/linkifying so typed text can never inject real HTML. A toolbar (B/I/U buttons) above every multi-line template field in `js/comms.js`, plus a one-line legend. SMS/plain-text channels get it auto-stripped via `_stripMd()` (`js/send-sheet.js`) rather than rendering literal asterisks.

### Ordinal date suffix
`STATE.settings.commsOrdinalDates` toggle on the Comms page. `_ordinalSuffix()`/`_commsLongDate()` (`js/send-sheet.js`) — scoped deliberately to `{date}`/`{rsvp_by}` token substitution only, not the app's global `_longDate()`.

### Default template rewrites (Email + SMS)
Save the date (Email gets its own default, separate from SMS, plus a `.ics` calendar attachment built client-side from `_wbIcs()`), Invite, RSVP reminder — see §4 for the two correction rounds this went through.

### Per-email Design override
`STATE.settings.commsDesign[itemKey]` — sparse per-email override of the universal `STATE.settings.emailDesign`. A "Design" button next to "Edit" on every branded email opens a scoped copy of the Email Design modal; auto-created from the current universal values on first edit, with a "Reset to app-wide" option.

### Email Design modal
Redesigned color picker: 8 wedding-palette swatches + a custom swatch (native `<input type=color>`) + a validated hex text field. Fixed a bug where changing `fontFamily`/`showLogo` saved correctly but never re-rendered the modal or the open Comms preview (only `templateId`/`accentColor`/`headerImage` did before) — now every change always re-renders and live-refreshes the Comms preview if open.

### Reset to default
Every template/fixed-text edit modal got a "Reset to default" button (`_commsResetTpl`/`_commsResetFixed`), and the Wishing Well edit modal got a note pointing to the Wishing Well page's own settings for gift-receivable options.

### Comms page layout
Branded-email preview now grows to fit content and scrolls with the page, instead of a fixed-height boxed iframe. Mobile gets a `<select>` dropdown instead of the full template list.

### RSVP reminder + Invite CTA rework (two correction rounds — see §4)
Reminder email's RSVP deadline + link was always mechanically appended (same architecture as Invite, pre-existing from an earlier session) rather than part of the editable body — but used Invite's quiet inline "Kindly RSVP by [date] by clicking here" link. Both now share a real pill-style button (`ctaButtonHtml()` in `send-guest-email/index.ts`), button text just **"RSVP"** (not "RSVP now"). Invite's lead sentence changed to "Kindly RSVP by [date] by clicking the button below." Invite also gained a second CTA — "For all the wedding details, check out our wedding website" + a "Visit our website" button — shown **only** when `STATE.website.published && STATE.website.slug` (mirrors the existing gate pattern from `_ssMessage()`'s savedate branch), so there's never a dead link.

---

## 4. How this session actually went (useful context for picking up)

1. The user's spec was one long itemized list ending in "Mock up." Per this project's established convention from earlier sessions, that phrase was interpreted as "build it for real, deploy it, but hold the merge for an explicit instruction" — which is what happened; everything was built, deployed to the 5 edge functions, committed/pushed to the session branch, and reported back for review, without merging.
2. **First mistake, caught by self-verification:** after deploying `send-guest-email`, a manual re-check against disk found the botanical template's dark-mode `.uv-band` color had been mistyped during the deploy call (`#111114` instead of the correct `#151C17`) — a transcription slip from hand-copying a large file into a tool call. Fixed by redeploying with content read fresh from disk immediately before the call, not retyped from memory.
3. The user then asked for an actual HTML mockup ("I want a proper html mockup of the adjustments") after a first round of screenshots from a local offline test harness (static files served locally, `_lpContinueOffline()` + direct `STATE` seeding — no real Supabase session, so the branded-email iframe fell back to a plain-text box, not the real rendered HTML).
4. **Second, more serious mistake:** the hand-built HTML mockup artifact approximated the RSVP reminder email using only its template body text, omitting the RSVP deadline + link block that's actually appended mechanically at send time (pre-existing architecture, not new this session). This made it look like real content had been silently deleted. **The user was right to be frustrated** — not because anything was actually removed from the shipped templates (a `git diff` audit confirmed the only changes were additive, matching the original spec exactly), but because a hand-approximated mockup is not a trustworthy stand-in for what the app actually sends, and presenting it as one was the error.
5. **Recovery:** switched to rendering every default template with the *actual* `buildParas`/`inviteBlockHtml`/`classicTemplate` code (copied verbatim from the deployed function, run in a local Node script, screenshotted with Playwright) rather than a hand-built approximation — this is the standard to hold to going forward for anything that touches real send/preview logic.
6. Follow-up feedback then landed three concrete, specific changes (reminder button wording, Invite's link-vs-button CTA, the new wedding-website CTA) — each implemented, redeployed, and re-verified with the same real-code-render technique before being shown.
7. User then said "build all changes, merge" — version bumped to v461, branch merged into `main` (`--no-ff`), pushed.

**Takeaway for the next session:** when a mockup involves anything that's assembled from multiple pieces at send time (a template body + a separately-composed CTA block, for instance), either render it with the real code, or make unmistakably clear in the mockup which parts are illustrative vs. real — don't let an abbreviated hand-built approximation stand in for "what the user will actually see," especially right after the user has just been told something was built and deployed for real.

---

## 5. Key areas (for next session's reference)

| What | Where |
|---|---|
| Comms page itself | `js/comms.js` — `renderComms`, `_commsEmailPreviewPayload`, `_commsFixedPreviewPayload`, `_commsLoadPreview` |
| Default templates + fill/markup helpers | `js/send-sheet.js` — `_DEFAULT_*_TPL` constants near top, `_stripMd`, `_ordinalSuffix`, `_commsLongDate`, `_fillTemplate`, `_ssBuildPayload` |
| Email Design modal (universal + per-email) | `js/send-sheet.js` — `_openEmailDesignModal`, `_emailDesignSet`, `_emailDesignResetItem`, `_emailDesignHexInput`/`_emailDesignHexCommit` |
| Shared branded-HTML helpers, duplicated per function (no shared module) | `escH`, `linkifyWith`, `applyInlineMarkup`, `buildParas` — present near-identically in all 5 `supabase/functions/*/index.ts` |
| RSVP/website CTA button | `ctaButtonHtml()` + `inviteBlockHtml()` in `supabase/functions/send-guest-email/index.ts` — shared by Invite and RSVP reminder |
| `compute_tier` RPC | Supabase migration `compute_tier_fn` — mirrors `get_my_subscription()`'s logic for an arbitrary `p_user_id` |
| Local render-verification pattern (no real Supabase session needed) | Serve the repo root with `python3 -m http.server`, Playwright to `index.html`, `page.evaluate()` to call `_lpContinueOffline()` + seed `STATE.event`/`STATE.guests` + set `window._uvTier='full'` directly, then `navigate('comms')` — this reaches the real UI without touching production data |

---

## 6. Parked ideas (carried forward, unchanged this session — not touched)

| # | Item | Status |
|---|---|---|
| P3 | VB wallpaper deduplication — extract ~175 KB base64 from HTML, serve from `/assets/` | Pending user upload |
| P5 | Remove debug `console.log` from `_lpSignIn()` | Parked |
| P7 | Test public RSVP flow end-to-end (QR → form → submit → confirmation) | Parked |
| P10 | Move UnionVault repo to its own GitHub org | Parked — redirects already active |
| P11 | Verify cross-account privacy fix in production | Verify |

---

## 7. Immediate Action Plan

1. **No in-progress work.** Session 15 ended cleanly: all 5 edge functions deployed and verified against disk, `v461` merged to `main` (`dbfb70a`) and pushed, working tree clean.
2. **Next task is user-directed** — await the user's next request.
3. **Before showing any mockup of something assembled from real send/preview logic** (branded emails, anything with a mechanically-appended block): render it with the actual production code (copy the real helper functions verbatim into a local script, run it, screenshot the output), not a hand-styled approximation. See §4 for why this matters this time specifically.
4. **Confirm deploys the simple way**: `main`'s HEAD + GitHub Pages' own auto-deploy (no Actions workflow exists for this repo) — just confirm the commit SHA, don't look for a workflow run.
5. Session branch `ccr-b19b9ede-kyqh3v` is merged but still exists on `origin` — fine to keep reusing it for continuity, or the harness may create a fresh one next session; either way, always merge to `main` and push before considering anything "done."
