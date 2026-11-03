# HANDOFF — Session 14
*Generated: 2026-11-03 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a wedding planning PWA. This file is the complete state dump from Session 14. Read it top to bottom before doing anything. Cross-reference `CLAUDE.md` (root) for standing facts, `docs/CLAUDE_CODE_CONTEXT.md` for the architecture map (Session 7 origin — line numbers drift but section order/comment markers hold), and `docs/sessions/HANDOFF_SESSION13.md` for the session immediately before this one.

**Standing rules (never violate):**
- No build step, no bundler. `index.html` is the app shell; CSS in `css/`, JS in `js/`, loaded via `<script>` tags.
- Every deploy: bump `APP_BUILD` in `js/autocomplete.js` **and** `CACHE` in `sw.js` together.
- Visual/design changes: show a light + dark mockup (Artifact tool) first. Wait for Accept / Reject / Adjust before writing code. Pure bug fixes (restoring intended/reported-broken behavior) don't need a mockup — implement and verify directly, but still show before/after evidence in the reply.
- **Deploy branch is `main`.** This session worked on feature branch `claude/website-builder-preview-blank-h0jz4k`, but every commit was immediately merged (fast-forward) into `main` and pushed, since GitHub Pages only deploys from `main`. **Always merge to `main` and push after committing to a feature branch — a feature-branch-only push does NOT go live.** Verify via `mcp__github__actions_list` (`list_workflow_runs`) that the Pages deploy succeeded for the exact commit SHA you expect.
- Never write `RESEND_API_KEY` into the repo — it is public. It's already set as a Supabase edge function secret (SHA256 digest starts `45658b6c3e93…`) — never ask the user for it.
- This is a PWA with an aggressive service worker. Users (including the project owner) can appear to be "on the latest build" per the version number shown in Settings while actually running stale cached JS for specific files — this bit us hard this session (see §6, Caching). When a user reports something you just fixed "still happening," first ask whether they tested signed OUT (owner sessions bypass some gates by design) and in a fresh/incognito context before assuming the fix is wrong.

---

## 1. Context & Project Scope

**UnionVault** is a wedding planning PWA for couples. Features include guest list management, online RSVP, RSVP manager with Resend email invites, budget tracker, wishing well, appointments, checklist, mood board, **a public wedding website builder** (this session's main focus — both the admin builder UI and the live guest-facing site), vendor brief generator, day-of timeline, Stripe subscriptions, automated cloud backups.

**Infrastructure:**
- Supabase project `hzafdlfprtzfxtyaebmc` (ap-southeast-2)
- GitHub Pages at `https://unionvault.app`, custom domain, auto-deploys from `main` (~30s after push)
- GitHub repo: `NthQuay/UnionVault` (this session's `Repository Scope`; `mandyjane/UnionVault` redirects to it)
- Resend: `unionvault.app` verified; edge functions in `supabase/functions/`

---

## 2. Current Technical State

| Item | Value |
|---|---|
| `APP_BUILD` | `v443` |
| `sw.js` CACHE | `union-vault-v443` |
| Live URL | `https://unionvault.app` |
| `main` HEAD | `5ce0e8e` — confirmed deployed via GitHub Actions (`pages build and deployment` run succeeded for this exact SHA) |
| Feature branch | `claude/website-builder-preview-blank-h0jz4k` — in sync with `main` at the same commit |
| Working tree | Clean, nothing uncommitted |

**Another session worked in parallel on `main` during this session** (branch `claude/great-pasteur-73yeqc`, a Timeline "Add Moment" form layout change, merged as v436/`d36e12b`). It caused one non-fast-forward merge (`47b418e`) partway through — resolved cleanly, both sets of changes intact, verified via `git show`. **Check `main` for other sessions' commits before starting work** — don't assume you're the only one pushing.

---

## 3. Session 14 Changes (v432 → v443)

All work this session was on the **website builder / guest-facing public wedding site**. One function, `_wbBuildSite()` in `js/website.js` (~7000 lines total in that file), builds the entire public site as one big HTML-string template — nearly every fix below is inside it.

### v432 — Website builder preview + guest site were blank
**Root cause:** `_wbBuildSite()` referenced `t2.navPos` at a point in the function before `const t2=t;` was declared (hundreds of lines later in the same function) — a same-scope reference-before-declaration `ReferenceError` (`const`/TDZ), silently aborting the function before any HTML returned. Fixed: changed to `t.navPos` (already in scope). Introduced in an earlier session's commit `c926aa7`.

### v433 — "Check for update" button had a cache-wipe race condition
`_forceAppUpdate()` (Settings page) called `registration.update()`, which only *starts* installing a new SW in the background without waiting — then immediately deleted all caches, racing the new SW's own `caches.addAll(SHELL)` write. Fixed by switching to `registration.unregister()`, matching the pattern already used in `sw-register.js`.

### v434 — Stale RSVP-by date display + website nav spacing
Two bugs: (1) the "Invites & Responses" card's "RSVP by…" line only updated on next page navigation, not when the date was changed in the templates modal — added `_setRsvpByDate()` (`js/send-sheet.js`) which re-renders in place, same pattern as `setRsvpSummaryStyle()`. (2) Side-nav guest sites wrapped nav links into one unreadable horizontal strip with zero spacing at phone width (`gap:0` inherited from the desktop vertical layout, combined with zero link padding at the mobile breakpoint).

### v435 — Side-nav mobile: collapse instead of wrap
Superseded part of v434's fix: instead of trying to fit every nav link on one line at narrow widths, side-nav now collapses behind the same toggle already used for the desktop icon-strip. Hidden by default below 480px, tap reveals a clean vertical dropdown. Click handler checks `window.innerWidth` to decide `.collapsed` (desktop) vs `.mnav-open` (mobile).

### v436 — RSVP Deadline card (new feature, mocked up and approved)
New widget `_rsvpWidgetDeadline()` (`js/rsvp.js`), registered in the existing `_RSVP_SECTIONS`/`_RSVP_DOCKABLE` system as `'deadline'`, defaulted to the first card on the RSVP & Invites page. Replaces the old flow where the RSVP-by date was only editable buried in the "RSVP date & templates" modal. Shows: date, "N weeks before the wedding" readout, a timeline bar from today to the wedding, and a warning if the deadline lands after the wedding (the exact mistake that started this whole thread — see §4). One calendar icon opens a popover with both an exact-date picker and 4/6/8/12-weeks-before presets. Removed the now-redundant "RSVP by…" line from the Invites & Responses widget.

(`d36e12b` in the same range is the *other* session's Timeline form-layout commit, not this session's work.)

### v437 — Page-heading truncation on mobile; dropped redundant "+" on Add Table
**Root cause (systemic, affects every page):** the topbar title-wrapper `<div>` in `index.html` had `min-width:40px`, but every page's button-collapse fitter (Seating, Vendors, Guests — each has its own near-identical `_fitXBtns()` implementation) calculates available space assuming the title reserves ~150px before buttons must shrink. With the real value at 40px, fitters consistently decided buttons had room to stay full-size, so the title got crushed to ~40-100px and ellipsized ("Seating P...", "Webs...") while full-width buttons sat next to it unbothered. Fixed the one shared value (`index.html` line ~152, now `min-width:150px`) — fixes every page in one place. The Website page's "QR Code"/"Preview" buttons had *no* collapse mechanism at all (not even broken); added `_fitWebsiteBtns()` mirroring the existing pattern. Also removed the redundant "+" from the Add Table button's short label ("+ Table" → "Table" — the button already has a plus-circle icon).

### v438 — Hero Names toggle + duplicate footer on side-nav sites
Two bugs found together: (1) `body.sidenav header h1{display:none}` unconditionally hid the hero `<h1>` (the Names toggle in the Home editor) on desktop side-nav regardless of the toggle's actual state — removed the override. (2) `<footer>` was a direct sibling of `<nav>`/`.site-content` under `body.sidenav{display:flex}`, making it a stray third flex column pinned top-right instead of flowing below content, and it printed the couple's name a second time (redundant with `.sidebar-names`, which is always shown). Side-nav sites no longer render this `<footer>` at all — name + branding both already live in the sidebar.

### v439 — Guest-site logo placement (mocked up and approved)
Top-nav: replaced the floating blurred pill (`.madewith`, fixed/rounded) with a full-width bottom band, gradient from the page's own background (solid) to transparent — no longer has a hard edge that can land on top of scrolled content (reported on the Wishing Well section). **Mid-implementation correction:** first pass used a flat 45%-solid gradient stop, which still let part of the logo text sit in the fading zone (not opaque enough — user caught this). Fixed by anchoring the solid/fade boundary to the element's own `padding-top` (`calc(100% - 34px)`) instead of a percentage, so the content area is always fully opaque regardless of its rendered height. Side-nav: collapsing to the 48px icon strip previously hid branding *entirely*; added a crest-only (no text) mark pinned to the bottom of the collapsed strip.

### v440 — Preset switch didn't update site background
**Found while fixing v439, not asked for — flagged and then the user said "Fix it".** `_wbPreset()` resets 6 color roles + `item` when a preset is picked, but not `background` — a separate "Background" role in the Advanced color editor, distinct from "Section" (`page`). `_wbSite()`'s migration defaults `background` to `page` on first-ever render, before any preset is touched, and because `_wbPreset()` never revisits it, that value sticks at whatever preset was active at that first render forever after. Switching presets correctly re-themed every `<section>` (reads `page` directly) while body/nav/footer/RSVP-modal/password-gate (all read `background`) stayed on the old color. Fix: `_wbPreset()` now captures whether `background` still equals the *old* `page` value right before applying the new preset — if so (never customized, just tracking page) it follows the preset; if a user deliberately set a different "Background" via the Advanced editor, it's left untouched, same as any manual override surviving a preset switch.

### v441 — Unpublished site still visible via the RSVP link
There are two public URLs for a guest site: `#slug` (`_showPublicWeddingSite`) and `?rsvp=<uid>` (`_showRsvpForm`). Only the first checked `STATE.website.published`. **The second is the one actually sent to guests** — `_rsvpLink()`, what the `{link}` invite-template token resolves to, always returns the `?rsvp=` form. So "Site published" OFF only hid the site from a link guests never actually receive. Added the identical gate to `_showRsvpForm()` (`js/init.js`). Confirmed by the user afterward, testing signed-out, that this now works correctly — their earlier "still showing" report was them testing while still signed in as the owner (owners can always preview their own unpublished site by design; not a bug).

### v442 — Gated RSVP lock + website password behind Full Access
Neither feature had any tier check — any free account could password-protect their RSVP form or whole site. `STATE.settings.rsvpLockEnabled` even defaults to `true` for every new account; only the empty default password kept it inert. Gated both the same way the existing "Made with Union Vault" badge and High-Chair Tracking features already are: `_uvRequirePaid()` blocks the setter and reverts the UI control; `_wbSite()` and `_wbBuildSite()`'s `_uvLockEnabled` both gained the same "force off for a downgraded account" safety net already used for `brandOff`.

### v443 — Four RSVP modal bugs (mocked up 1/3/4, fixed 2 directly, all approved/verified)
1. **Search button overflow (mobile):** `.search-row input` had no `min-width:0`, claimed browser-default intrinsic width inside the flex row, pushed the button off the modal edge. One-property fix.
2. **Dietary allergy/other text field closed the whole checklist on click** (universal, mobile+desktop): `.diet-accordion`'s wrapper `onclick` toggles the section open/closed on any bubbled click; the dietary chips call `stopPropagation()`, the free-text input wrappers didn't — clicking into the field collapsed the very section you'd just opened. Added `stopPropagation()` to both `.diet-note` wrappers.
3. **"Selected group" banner redesigned:** was a bordered card with name + "Change" button (redundant with the attendance rows right below it); now a quiet line — italic "Not you?" + underlined "Change" link, name hidden via CSS (not removed from DOM — `_uvSelectGroup()` still writes to `#attend-group-name` unconditionally).
4. **Leftover "Enter at least 3 characters…" hint** stayed visible above "Select your group" after a successful search. Now hidden once results render, restored via all three paths back to an empty search (clearing input below 3 chars — which also now clears stale results, a latent bug found in the same spot; clicking "Change"; closing/reopening the modal).

All four verified end-to-end via headless Playwright **driving the real UI** (not just calling functions directly) — search → select → mark attending → dietary step → type in the allergy field — at 390px and 1024px, default preset and dark Noir.

---

## 4. How this session actually went (useful context for picking up)

The user worked through the website builder end-to-end, reporting new issues as each fix landed — this was **one long iterative thread**, not independent tickets:
1. Blank preview/guest site (v432) → still blank, turned out to be a **stale build on the specific tab being tested**, not a code bug (v433's `_forceAppUpdate` race condition was the actual root cause of why "Check for update" wasn't reliably working).
2. Nav side-bar rendering jumbled on mobile → fixed with spacing (v434) → user reported it was "still broken," which led to discovering the deeper fix needed was collapse-not-wrap (v435).
3. Website builder heading truncation on mobile (v437) found while working through nav issues.
4. Names not showing + duplicate footer (v438) found via a screenshot while reviewing the side-nav fix.
5. RSVP Deadline card (v436) was a separate feature request, mocked with 3 distinct design options before the user picked "timeline bar," then one more mockup round to move the controls behind a single icon.
6. Logo placement (v439) → user caught a legibility problem in my first implementation attempt (gradient not opaque enough) → fixed before shipping, not after.
7. Background-on-preset-switch (v440) was found as a side effect while testing v439 in Noir preset, not asked for — flagged explicitly rather than silently fixed, user then said "Fix it."
8. "Still showing when unpublished" (v441 report) → re-verified three times before finding the actual second gap (the RSVP link). After fixing, got a second "still showing" report that turned out to be the user testing signed-in (not a bug) — confirmed via asking a precise clarifying question rather than guessing further.
9. Paid-tier gating (v442) was a new, unprompted-by-bug feature request, not a fix.
10. RSVP modal 4-bug batch (v443) went through full Plan Mode (the user's RSVP modal report was complex enough to warrant it) — a Plan subagent verified exact line numbers and line-accurate CSS/HTML/JS before any code was touched, then a mockup, then implementation, matching the approved plan closely.

**Takeaway for the next session:** this user tests thoroughly and catches real regressions (the v439 opacity issue, the v441 second "still showing" report that turned out to be cache). Don't be defensive when something reported as fixed "still happens" — re-verify via actual render tests before assuming user error, but also don't be afraid to ask a precise clarifying question (e.g., "did you test signed out?") once you've re-verified the code is correct and found nothing.

---

## 5. Key areas of `js/website.js` now (for next session's reference)

| What | Where (approx, drifts — search for these anchors) |
|---|---|
| `_wbBuildSite()` | ~line 4108, the ~1000-line function building the entire public site |
| `_wbSite()` (STATE.website normalizer/migrator) | ~line 93 — this is where `brandOff`/`passwordEnabled` get forced off for non-paid accounts |
| `_wbPreset()` | ~line 1237 |
| RSVP modal markup + `<script>` | inside `_uvModal` template literal, ~lines 4780-5155 |
| `.search-row`, `.selected-banner`, `.search-hint` CSS | ~lines 4799-4815 |
| `_uvDoSearch`, `_uvCheckSearchBtn`, `_uvSelectGroup`, `_uvResetSearch`, `_uvCloseRsvp` | ~lines 5014-5155 |
| Dietary accordion (`.diet-accordion`, chips, notes) | ~lines 5195-5245 |
| Side-nav CSS (`body.sidenav...`) | ~lines 5319-5412 (desktop) + ~5412 (mobile media query) |
| `.madewith` footer (top-nav gradient) | ~line 5629-5637 |
| Collapsed sidebar crest | search `sb-collapsed-crest` |

Per-page topbar button fitters (`_fitSeatingBtns`, `_fitVendorBtns`, `_fitWebsiteBtns`, `_fitGuestBtns`) are each separately implemented (not a shared utility) — this is pre-existing duplication, not something introduced this session. If a similar heading-truncation bug shows up on a page not yet covered, check whether that page has its own fitter wired up at all (Website didn't, before v437).

---

## 6. Caching — a recurring theme this session

This PWA's service worker makes "is this actually the bug, or is this just an old cached file" a live question on almost every report:
- `_forceAppUpdate()` in Settings (now fixed, v433) is the user-facing "Check for update" button.
- `sw-register.js` unregisters + clears caches + re-registers on *every* page load (not just once) — by design, but means a full fix can take **two reloads** to show up (first reload is still served by the dying old SW).
- The owner-signed-in-bypasses-publish-gate behavior (by design, confirmed correct this session) can look identical to a caching bug from the outside — always ask whether testing was done signed out.

---

## 7. Parked ideas (carried forward, unchanged this session — not touched)

| # | Item | Status |
|---|---|---|
| P3 | VB wallpaper deduplication — extract ~175 KB base64 from HTML, serve from `/assets/` | Pending user upload |
| P5 | Remove debug `console.log` from `_lpSignIn()` | Parked |
| P7 | Test public RSVP flow end-to-end (QR → form → submit → confirmation) | Parked (partially covered by this session's Playwright tests, but not a full manual pass) |
| P10 | Move UnionVault repo to its own GitHub org | Parked — redirects already active (`mandyjane/UnionVault` → `NthQuay/UnionVault`) |
| P11 | Verify cross-account privacy fix in production | Verify |

---

## 8. Immediate Action Plan

1. **No in-progress work.** Session 14 ended cleanly with v443 shipped, deployed (confirmed via GitHub Actions), and working tree clean.
2. **Next task is user-directed** — await the user's next request.
3. **Before any new visual/design change:** show a light + dark mockup (Artifact tool). Wait for Accept / Reject / Adjust. This user engages closely with mockups (picks apart specific details, e.g. gradient opacity) — expect iteration, not a single round-trip.
4. **Before any bug-fix claim:** verify via an actual headless-browser render test (Playwright is pre-installed, `executablePath: '/opt/pw-browsers/chromium'`) driving the real UI where feasible, not just reading code or calling internal functions directly — this session's most useful bug-finds (v437's title-truncation root cause, v441's second gate gap, v443's dietary accordion bug) all came from actually rendering and interacting with the page, not from code review alone.
5. **Always confirm the fix is live:** check `git log origin/main` matches what you pushed, and confirm via `mcp__github__actions_list` that the Pages deploy succeeded for that exact SHA, before telling the user something is deployed.
