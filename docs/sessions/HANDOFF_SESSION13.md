# HANDOFF — Session 13
*Generated: 2026-11-03 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a PWA wedding planner. This file is the complete state dump from Session 13. Read it top to bottom before doing anything. Cross-reference `CLAUDE.md` (root) for standing facts and `docs/CLAUDE_CODE_CONTEXT.md` for the architecture map (originated Session 7 — line numbers have drifted but section order and comment markers are still accurate).

**Standing rules (never violate):**
- No build step, no bundler. `index.html` is the app shell; CSS in `css/`, JS in `js/`, loaded via `<script>` tags.
- Every deploy: bump `APP_BUILD` in `js/autocomplete.js` **and** `CACHE` in `sw.js` together.
- Visual changes: show light + dark preview mockup first. Wait for Accept / Reject / Adjust before implementing.
- Branch `main` for deploys. Use feature branch `claude/great-pasteur-73yeqc` for development, then merge to `main`.
- Perform all branch merges for the user — always merge feature branch to main after pushing.
- Add new JS/CSS files to the `SHELL` array in `sw.js`.
- Never write `RESEND_API_KEY` into the repo — it is public.
- `RESEND_API_KEY` is **already set** as a Supabase edge function secret (SHA256 digest starts `45658b6c3e93…`). Never ask the user for it.

---

## 1. Context & Project Scope

**UnionVault** is a wedding planning PWA for couples. Features include:
- Guest list management, household groupings, dietary/meal tracking
- Online RSVP (public form -> `rsvp_responses` table -> couple's dashboard)
- RSVP manager with invitation sending via Resend email (3 templates: classic, modern, botanical)
- Budget tracker, wishing well (with Stripe contributions), appointments, checklist
- Mood board (vision board) with Supabase photo storage
- Public wedding site + vendor brief generator
- Day-of timeline with custom categories, songs, vendor linking
- Marketing tracker for directory listings and campaign status
- Automated cloud backups (`planner_backups` table, hourly pg_cron)
- Stripe subscription (create-checkout-session, manage-subscription, stripe-webhook edge functions)
- SEO landing pages in `uses/` directory

**Infrastructure:**
- Supabase project `hzafdlfprtzfxtyaebmc` (ap-southeast-2)
- GitHub Pages at `https://unionvault.app` (custom domain via CNAME, auto-deploys from `main`)
- Resend: `unionvault.app` domain verified; edge functions in `supabase/functions/`

---

## 2. Current Technical State

| Item | Value |
|---|---|
| `APP_BUILD` | `v436` |
| `sw.js` CACHE | `union-vault-v436` |
| GitHub repo | `https://github.com/mandyjane/UnionVault` (redirects from `NthQuay/UnionVault`) |
| Live URL | `https://unionvault.app` |
| Working branch | `main` (deploy) + `claude/great-pasteur-73yeqc` (feature dev) |
| Latest commit | `d36e12b` — "Bump to v436: tighter Timeline Add Moment form layout" |
| Supabase project | `hzafdlfprtzfxtyaebmc` (ap-southeast-2) |

---

## 3. Repo Layout

```
/home/user/UnionVault/
  index.html              App shell
  app.html                (alternate entry)
  maintenance.html        Maintenance page (has own Terms & Privacy copy)
  sw.js                   Service worker
  manifest.webmanifest    PWA manifest
  robots.txt, sitemap.xml, CNAME, .nojekyll, og-image.png

  css/
    app.css               Main app styles
    fonts.css             Embedded fonts
    landing.css           Landing page styles

  js/
    auth.js, budget.js, checklist.js, dashboard.js, details.js,
    dots.js, events.js, export.js, floorplan.js, guests.js,
    import.js, init.js, inspiration.js, invitations.js, landing.js,
    logos.js, media.js, navigation.js, payments.js, rsvp.js,
    seating.js, send-sheet.js, settings.js, state.js, storage.js,
    subscription.js, supabase.js, sw-register.js, tags.js,
    timeline.js, undo.js, utils.js, vendors.js, visionboard.js,
    wallpaper.js, website.js, welcome.js, wishingwell.js,
    autocomplete.js, attachments.js

  assets/                 Email logos, images
  icons/                  App icons
  logos/                  Brand logos

  uses/                   SEO landing pages (pure HTML+CSS, no JS, not in sw.js SHELL)
    index.html            Hub page
    free-vs-full-access/
    free-wedding-website-builder/
    online-wedding-rsvp-tracker/
    wedding-budget-planner-app/
    wedding-checklist-app/
    wedding-day-timeline/
    wedding-guest-list-app/
    wedding-planning-calendar/
    wedding-seating-chart-planner/
    wedding-vendor-manager/
    wedding-wishing-well-tracker/

  supabase/functions/
    create-checkout-session/index.ts
    manage-subscription/index.ts
    rsvp-notify/index.ts
    send-appointment-email/index.ts
    send-guest-email/index.ts
    stripe-webhook/index.ts
    ww-contribute/index.ts

  docs/
    CLAUDE_CODE_CONTEXT.md   Full architecture map (Session 7 origin)
    sessions/                Per-session handoffs
```

---

## 4. Supabase Schema

### Tables

| Table | Purpose | RLS |
|---|---|---|
| `planner_data` | Per-section cloud sync (`user_id`, `section`, `data` jsonb, `updated_at`) | `auth.uid() = user_id` |
| `planner_backups` | Hourly automated backups | Authenticated user reads/inserts/deletes own |
| `rsvp_responses` | Online RSVP form submissions | Couple reads own; public inserts |
| `vendor_tokens` | Per-vendor tokenised share links | Couple manages own; public reads by token |
| `photos` (Storage) | Vision Board images (`<user_id>/<photo_id>`) | Full SELECT + manage policies exist |

### RPCs (anon-safe)

| Function | Returns |
|---|---|
| `public_wedding_extras(uid)` | Guest names/groupings, meal settings, wishing well minus contributions |
| `vendor_brief(token)` | Vendor brief data |

### Edge functions (deployed)

| Function | From address | Auth |
|---|---|---|
| `send-appointment-email` | `<couple names> <appointments@unionvault.app>` | Signed-in only |
| `send-guest-email` | `<couple names> <invites@unionvault.app>` | Signed-in only (supports 3 templates + preview mode) |
| `rsvp-notify` | (alerts couple on new RSVP) | Service role |
| `create-checkout-session` | — | Signed-in only |
| `manage-subscription` | — | Signed-in only |
| `stripe-webhook` | — | Stripe signature |
| `ww-contribute` | — | Wishing well contributions |

All email functions use `RESEND_API_KEY` secret. All send branded HTML built server-side from escaped plain text — never accept raw HTML from client.

### pg_cron job

Fires hourly: creates backup snapshots, keeps 48 most recent per user.

---

## 5. Git State

```
Branch:  main (up to date with origin)
Feature: claude/great-pasteur-73yeqc (merged into main, also pushed)
Remote:  https://github.com/mandyjane/UnionVault

Recent commits (newest first):
d36e12b  Bump to v436: tighter Timeline Add Moment form layout
86898a3  Merge branch 'claude/great-pasteur-73yeqc'
c67d580  Collapse side-nav behind its toggle on mobile instead of wrapping it (v435)
c5fbd67  Fix stale RSVP-by date display and website nav spacing (v434)
afbc0ad  Fix cache-wipe race in Check for update button (v433)
f5bd4fd  Fix website builder preview + guest site blank page (v432)
78c8e5d  Fix smart quotes breaking JS parsing across 14 files (v431)
052cdbd  Update Terms & Privacy: consolidated sections 6 + 7 + date (v430)
912fa1a  v429: auto-detect currency from browser locale for new users
8a791fc  v428: move RSVP templates + email design to Your Invitation card
c261d19  v427: email sending feature — templates, preview, header image, batch send
```

All commits pushed. Working tree clean. GitHub Pages auto-deploys ~30s after push.

---

## 6. Session 13 Changes

### v430 — Terms & Privacy consolidated update
- Updated date to November 2026
- Section 6: added Subscription Terms bullet, expanded Refund Framework with pro-rata refund on termination for convenience
- Section 7: restructured with Discretionary Access bullet, updated As-Is with ACL + beta product language
- Section 9: Maximum Liability wording aligned
- Applied to both `index.html` and `maintenance.html`

### v431 — Critical fix: smart quotes breaking all JS
- **Root cause:** Curly/typographic quotes (U+2018/U+2019/U+201C/U+201D) introduced in v427 were used as JS string delimiters, causing SyntaxError that killed all JS execution
- Fixed across 14 JS files: `auth.js`, `budget.js`, `checklist.js`, `invitations.js`, `media.js`, `send-sheet.js`, `vendors.js`, `attachments.js`, `settings.js`, `export.js`, `import.js`, `rsvp.js`, `autocomplete.js`, `website.js`
- Replaced curly quotes with straight ASCII equivalents; escaped apostrophes inside single-quoted strings with `\'`
- **Key lesson:** Apostrophes in template literal body text do NOT need escaping, but apostrophes inside `${...}` expressions in single-quoted strings DO

### v432–v435 — Various fixes (done in prior continued sessions)
- v432: Fix website builder preview + guest site blank page
- v433: Fix cache-wipe race in Check for update button
- v434: Fix stale RSVP-by date display and website nav spacing
- v435: Collapse side-nav behind its toggle on mobile

### v436 — Tighter Timeline Add Moment form layout
- Moved "Manage categories" button above Time/Category row, right-aligned
- Reduced outer gap from 14px to 2px, added 6px margin-top per section
- Reduced form-group gap to 4px so labels sit closer to fields
- Removed unnecessary `position:relative` wrappers from selects
- Reduced `.add-song-btn` margin-top from 10px to 4px
- Files changed: `js/timeline.js`, `css/app.css`

---

## 7. Parked Ideas (carry forward)

| # | Item | Status |
|---|---|---|
| P3 | VB wallpaper deduplication — extract ~175 KB base64 from HTML, serve from `/assets/` | Pending user upload to GitHub |
| P5 | Remove debug `console.log` from `_lpSignIn()` | Parked |
| P7 | Test public RSVP flow end-to-end (QR -> form -> submit -> confirmation) | Parked |
| P10 | Move UnionVault repo to its own GitHub org (redirects from `mandyjane/UnionVault` to `NthQuay/UnionVault` are already active) | Parked |
| P11 | Verify cross-account privacy fix in production | Verify |
| P12 | Split into ES modules (dedicated session, not mixed with feature work) | Done — app is now multi-file (js/, css/) |

---

## 8. Immediate Action Plan

1. **No in-progress work** — Session 13 ended cleanly with v436 shipped and pushed. Working tree is clean.

2. **Next task is user-directed** — await the user's next request.

3. **Before any visual change** — show light + dark mockup preview. Wait for Accept / Reject / Adjust. Do not implement directly.
