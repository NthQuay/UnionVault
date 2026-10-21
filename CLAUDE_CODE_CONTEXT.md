# CLAUDE_CODE_CONTEXT.md
## UnionVault — Complete Project State Dump for Claude Code Migration
*Generated: 2026-10-22 | Session 5 handoff | Do not truncate or summarise this file.*

---

# 5. INITIALIZATION PROMPT FOR CLAUDE CODE

> **READ THIS SECTION FIRST. It tells you what to do with the rest of this file.**

You are continuing development of **UnionVault**, a single-file PWA wedding planner app. This document is an exhaustive state dump from the claude.ai Project session. Your job is to ingest it fully and pick up without asking redundant questions.

**On every session start, do this:**
1. Read this entire file top to bottom. Do not skim.
2. Locate `index.html` in the working directory (it is `UnionVault - nav logo text fix.html` renamed, or whatever the current build is named). That is your working file.
3. Cross-reference Section 1 (architecture) against the actual file — verify line numbers for the JS sections using the comment markers (e.g. `// ════ VISION BOARD WALLPAPER`).
4. Check Section 2 for any in-progress objectives before asking what to do next.
5. Never ask the user to re-explain anything already in this document.
6. Before making any visual/design change: show a preview mockup (light + dark) in the chat and wait for Accept / Reject / Adjust. Do NOT implement directly.
7. Deliver every build as: `UnionVault - [very short summary].html`
8. Every change must account for both desktop (wide) and mobile (narrow) layouts. Flag if a change risks breaking one.
9. "Park" = add to the Parked Ideas table in Section 4 and confirm it's noted. User will ask for "parked ideas" to retrieve.
10. Bump SW cache name (`union-vault-v10` → `v11`) on the next deploy.

---

# 1. RAW FILE ARCHITECTURE

## 1.1 Files in Scope

| File | Location | Notes |
|---|---|---|
| `UnionVault - nav logo text fix.html` | Delivered to user / upload to GitHub as `index.html` | **Current build. Deploy this one.** ~3.52 MB, 45,099 lines |
| `vb-wallpaper-light.jpeg` | Extracted this session | 99 KB. Upload to GitHub `/assets/` then replace base64 in HTML |
| `vb-wallpaper-dark.jpeg` | Extracted this session | 73 KB. Upload to GitHub `/assets/` then replace base64 in HTML |
| `CLAUDE_CODE_CONTEXT.md` | This file | Migrate with the project |
| GitHub repo | `https://github.com/mandyjane/UnionVault` | Live URL: `https://mandyjane.github.io/UnionVault/` |
| Logos folder | `https://raw.githubusercontent.com/mandyjane/UnionVault/main/Logos/` | See logo table in §1.4 |

## 1.2 Single-File Architecture Rules — NEVER VIOLATE

1. **Single HTML file. No build step. No imports.** All CSS, JS, and fonts must be inline or served via `raw.githubusercontent.com`. Do not introduce `<link>` stylesheet imports, ES module imports, or any bundler.
2. **Never clear the entire `mandyjane.github.io` domain cache/storage.** Another app shares this GitHub Pages origin. Only ever target `union-vault-v10` (the named cache) and UnionVault's specific IndexedDB stores.
3. **Always show design previews (light + dark) before implementing visual changes.** Show clickable accept/reject/adjust prompts.
4. **Fonts stay embedded** in `<style id="ea-embedded-fonts">` (lines 29–46, ~373 KB). Do not replace with `<link>` — PWA offline support depends on them being inline.

## 1.3 File Structure — Line Map

```
Lines     1–   28  DOCTYPE + <head> meta tags, favicons, manifest link, viewport
Lines    29–   46  <style id="ea-embedded-fonts"> — Cormorant Garamond, Lato, Montserrat (~373 KB embedded, KEEP)
Lines    47– 2435  Main <style> block — full app CSS
Lines  2436– 2712  Dark calendar CSS (FullCalendar overrides, dark mode media query)
Lines  2713– 3637  HTML structure:
                     #app — root app shell
                       #sidebar-overlay — mobile drawer backdrop
                       #sidebar — left nav sidebar
                         #nav-list — nav items (see §1.5)
                         #couple-display-btn — avatar + names
                         #sidebar-signout-pop — sign-out popup
                       #topbar-eyebrow, #topbar-title, #topbar-actions — top bar
                       #main-content — page content rendered here by JS
                     #welcome-overlay — app loading screen
                     #lp-wrap — landing page / login page
                       #top, #heroCanvas, #auth (sign-in/create forms)
                       #features, #pricing, #faq, #contact, #contactCanvas
                     #setup-modal-overlay — first-run couple setup modal
                     #auth-modal-overlay — in-app sign-in modal
Lines  3638– 3644  <script> block 1: VB Wallpapers
                     const VB_WALLPAPER_LIGHT = "data:image/jpeg;base64,..." (~101 KB)  ← PENDING EXTRACTION
                     const VB_WALLPAPER_DARK  = "data:image/jpeg;base64,..." (~74 KB)   ← PENDING EXTRACTION
Lines  3645– 3824  STATE object — default values for all app state
Lines  3825– 4217  UTILS — helper functions, formatting, date math
Lines  4218– 4331  NAVIGATION — navigate(page), sidebar toggle, page title map
Lines  4332– 5340  DASHBOARD — renderDashboard(), widgets, Budget at a Glance
Lines  5341– 5540  EVENT DETAILS — event info form rendering + save
Lines  5541–10863  GUEST LIST — guest table, cards, edit sheet, import prep
Lines 10864–14039  RSVP MANAGER — RSVP tracking, invitations, send flows
Lines 14040–23195  CHECKLIST — tasks, links to budget, linked tick flows (v179–v181)
Lines 23196–27195  BUDGET — budget categories, four-figure summary, owed list
Lines 27196–31064  SEATING CHART — floor plan, seat assignments, drag-drop
Lines 31065–31776  INSPIRATION — mood board, saved links
Lines 31777–31884  VISION BOARD — renderVisionboard(), photo grid, wallpaper use
Lines 31885–36504  WEBSITE BUILDER — wedding website preview + RSVP page
Lines 36505–37994  INVITATIONS — invitation builder (folded to rsvp-mgr in nav)
Lines 37995–39062  SETTINGS — all settings sections, toggles, storage card
Lines 39063–43024  GUEST SPREADSHEET IMPORT — CSV/XLS parse, normalise, apply
Lines 43025–44311  AUTH MODAL JS — in-app sign-in/sign-up modal logic
Lines 44312–45099  WELCOME PAGE + BOOT — landing page JS, hash/URL intercept, SW registration
```

## 1.4 Logo Assets (GitHub Repo `/Logos/` Folder)

All logos served from: `https://raw.githubusercontent.com/mandyjane/UnionVault/main/Logos/`

| File | Used Where | Theme |
|---|---|---|
| `Gold%20Full.png` | Login hero, sidebar, apple-touch-icon, RSVP card, logo hydration | Light |
| `Gold%20logo.png` | Wedding site crest | Light |
| `Gold%20text.png` | Available, not yet assigned | — |
| `Black%20full%20(Light%20mode).png` | Footer logo | Light |
| `Black%20logo%20(Light%20mode).png` | Nav crest (left of divider) | Light |
| `Black%20text%20(Light%20mode).png` | Nav wordmark (right of divider) ✅ Fixed Session 5 | Light |
| `White%20full%20(Dark%20mode).png` | Logo hydration (dark), nav wordmark (dark) | Dark |
| `White%20logo%20(Dark%20mode).png` | Wedding site crest, nav crest (dark) | Dark |
| `White%20text%20(Dark%20mode).png` | Nav wordmark (right of divider) ✅ Fixed Session 5 | Dark |
| `Favicon_iphone.png` | `<link rel="icon">` (light) | — |
| `Favicon_Samsung.png` | `<link rel="icon">` (dark swap) | — |

**Nav logo CSS classes** (lines 2866–2894):
- `.nav-logo-mono-light` — crest, light mode
- `.nav-logo-mono-dark` — crest, dark mode
- `.nav-logo-wordmark-light` — text wordmark, light mode
- `.nav-logo-wordmark-dark` — text wordmark, dark mode
- `.nav-logo-divider` — the `|` separator between crest and wordmark

## 1.5 App Pages (from `navigate()` titles object)

| Page key | Display title |
|---|---|
| `dashboard` | Dashboard |
| `details` | Event Details |
| `timeline` | Day-of Timeline |
| `guests` | Guest List |
| `rsvp-mgr` | RSVP & Invites |
| `checklist` | Checklist |
| `calendar` | Calendar |
| `budget` | Budget |
| `vendors` | Vendors |
| `seating` | Seating Plan |
| `inspo` | Inspiration |
| `visionboard` | Vision Board |
| `wishingwell` | Wishing Well |
| `settings` | Settings |
| `events` | Events |
| `website` | Website |
| `invitation` | → redirects to `rsvp-mgr` |

## 1.6 Tech Stack

| Layer | Detail |
|---|---|
| Auth + DB | Supabase — `https://hzafdlfprtzfxtyaebmc.supabase.co` |
| User ID | `_sbSession.user.id` used as `couple_id` everywhere |
| Photo storage | Supabase Storage bucket: `photos`. Path: `<user_id>/<photo_id>` |
| Local cache | IndexedDB `MEDIA` store; `MEDIA[id]` = blob object URL |
| State | `STATE` object → `_save()` persists to Supabase `cloud_saves` table |
| Hash routing | `#liam-amanda` = wedding website; `#rsvp-liam-amanda` = RSVP direct |
| URL params | `?runsheet=<coupleId>` · `?vendor=<token>` · `?rsvp=<slug>` — intercepted at boot (~line 44997) |
| Dark mode | `data-theme="light"` on `<html>` for light; removed for dark. Guards `@media(prefers-color-scheme:dark) :root:not([data-theme="light"])` (~line 2769) |
| SW cache | `union-vault-v10` (current). **Bump to v11 on next deploy** |
| App build | `APP_BUILD = 'v184'` |

## 1.7 Supabase Tables

| Table | Key Columns | Notes |
|---|---|---|
| `cloud_saves` | `couple_id`, `data` (JSONB), `updated_at` | Main STATE store |
| `rsvp_responses` | `couple_id`, guest data | RLS: couple reads own; public inserts |
| `vendor_tokens` | `token` (PK), `couple_id`, `vendor_name`, `sections TEXT[]`, `expires_at`, `created_at` | RLS: couple manages own; public reads by token |
| `photos` (Storage) | Path: `<user_id>/<photo_id>` | **Needs SELECT RLS policy — see §4 P2** |

## 1.8 Vision Board Key Functions

| Function | Purpose |
|---|---|
| `renderVisionboard()` | Main render; checks `MEDIA[id]` for blob URLs |
| `_sbPhotoUpload(id, blob)` | Uploads photo to Supabase Storage on save |
| `_mediaCloudSync()` | Downloads missing photos from Supabase on sign-in |
| `_vbPhotoRetry()` | User-triggered retry for missing photos (added Session 5) |
| `_mediaRefs(STATE,'id')` | Returns all photo ID references in STATE |
| `_sbPhotoFetch(id)` | Fetches one photo by ID from Supabase Storage |

Photo sync trigger: `setTimeout(_mediaCloudSync, 800)` after cloud data loads on sign-in (~line 3362), also ~lines 27861, 45016.

---

# 2. SYSTEM STATE & CURRENT OBJECTIVES

## 2.1 Immediate — Wallpaper Deduplication (IN PROGRESS)

**Status:** Wallpaper files extracted. Awaiting user to upload to GitHub.

**What was done this session:**
- Extracted `VB_WALLPAPER_LIGHT` (101 KB) and `VB_WALLPAPER_DARK` (74 KB) from base64 at lines 3642–3643
- Saved as `vb-wallpaper-light.jpeg` and `vb-wallpaper-dark.jpeg` — delivered to user
- User needs to upload both to `https://github.com/mandyjane/UnionVault/assets/` (or `/Logos/` — their choice)

**What to do once user confirms upload location:**
Replace lines 3642–3643 in the HTML:
```js
// BEFORE:
const VB_WALLPAPER_LIGHT="data:image/jpeg;base64,/9j/4AAQ...";
const VB_WALLPAPER_DARK="data:image/jpeg;base64,/9j/4AAQ...";

// AFTER (example if uploaded to /assets/):
const VB_WALLPAPER_LIGHT="https://raw.githubusercontent.com/mandyjane/UnionVault/main/assets/vb-wallpaper-light.jpeg";
const VB_WALLPAPER_DARK="https://raw.githubusercontent.com/mandyjane/UnionVault/main/assets/vb-wallpaper-dark.jpeg";
```
This will reduce file size by a further ~175 KB (3.52 MB → ~3.34 MB).

**VB_WALLPAPER is used in two places** (not just the declaration):
- Line ~4387: `const _dashWall = isDark ? VB_WALLPAPER_DARK : VB_WALLPAPER_LIGHT;` (Dashboard background)
- Line ~36332: `const vbWall = isDark ? VB_WALLPAPER_DARK : VB_WALLPAPER_LIGHT;` (Vision Board)

No changes needed to those lines — they already read the constants.

## 2.2 Deploy Checklist (before pushing to GitHub Pages)

- [ ] Wallpaper deduplication complete (§2.1)
- [ ] Bump SW cache: `union-vault-v10` → `union-vault-v11`
- [ ] Remove debug `console.log` from `_lpSignIn()` (deferred since Session 2)
- [ ] Add Supabase Storage SELECT RLS policy (§4 P2)

## 2.3 No Active Multi-File Split Planned

There is **no current plan to split the single HTML file into multiple files**. The single-file architecture is intentional (see §1.2 constraints). All features are added to the single `index.html`. If this changes, update this section.

---

# 3. COMPLETE CHRONOLOGICAL PROJECT LOG

## Pre-Session History (App name: "Elegant Affair Planner" → "UnionVault")

The app began as "Elegant Affair Planner" and was later rebranded to "UnionVault". Core features were built across many sessions before the formal changelog system. The full feature set inherited at Session 1 of the changelog era includes:

- Supabase auth (email/password sign-up, sign-in, session persistence)
- Cloud save/load (STATE ↔ `cloud_saves` table)
- Full app shell: sidebar nav, topbar, main-content area, dark mode toggle
- Landing/login page with hero canvas, features, pricing, FAQ, contact
- First-run setup modal (partner names, date, venue, budget)
- Dashboard with stat tiles and Budget at a Glance widget
- Event Details page
- Guest List (table + card views, RSVP tracking, seating, dietary)
- Checklist (tasks, sub-tasks, categories, due dates, budget links)
- Budget (categories, items, deposits, payments, instalments)
- Seating Plan (floor plan builder, drag-and-drop seats)
- Vision Board (photo grid, Supabase photo storage/sync)
- Wishing Well (contributions, addresses, print labels)
- Website Builder (wedding website preview)
- Invitations (folded into RSVP & Invites in nav)
- Settings (full settings page with toggles)
- CSV guest import
- Day-of Timeline
- Calendar
- Inspiration / Mood Board
- Vendor tracker + vendor brief link generator
- Public run sheet sharing
- PWA service worker (offline support)
- Design tokens: gold accent (`#C9A84C`), dark surface (`#1A1A1F`), cream light (`#FDFBF7`), ink (`#2C2222`)
- Typography: Cormorant Garamond (headings), Lato (body), Montserrat (UI labels)

---

## v177 — Allergy + Other dietary requirements
**Date:** Pre-2026-10-18

- Added `allergy` as a 6th dietary key with `g.allergens` (9 chip options) and `g.allergyNote` (free text)
- Added `dietOther` detail box for Other dietary (free text, gold styling vs allergy red)
- Allergy renders in red (`#A8322A` light / `#E08080` dark) across all 18 data surfaces
- Seating print: **ALLERGY: peanuts** in bold capitals + red (also black for B&W print)
- CSV import: allergies/diets normalised on import via `_normaliseDiet`; legacy guests repaired once on load
- Typed common allergens fold into chips on save; exact match only (no guessing for health safety)
- Fixed: `_guestValueText` was looking up non-existent global `dietLabels`; now uses `_dietText`
- Fixed: event guest list joined raw array without space
- **Decisions logged:** D-v182 series (allergy chip normalisation, print in words not colour-only, parser confidence)

---

## v178 — Budget: Left to Pay, Unallocated, one consistent set of figures
**Date:** Pre-2026-10-18

- `_budgetFourFigures(totalCost, totalPaid, budgetTotal)` — single source of truth for all budget summaries
- Four figures: Committed, Paid, Left to pay, Unallocated (replaces misleading "Remaining")
- Budget page, both dashboard widgets, reports all read from one helper (no drift)
- "Paid in full ✓" shown when Left to pay = $0 (not "Left to pay $0")
- Responsive layout: A (all four side by side) on ≤560px, B (two grouped pairs) above 560px
- Left to Pay drill-down (`openOwedSummary`) — per-item breakdown from `calcBudgetBalance`; soonest due first, overdue in red
- Budget widget fixed (was using faulty `budgetSpent` that summed deposit amounts paid or not)
- Budget Used stat tile fixed (all 4 KPI styles)
- Removed faulty `budgetSpent` / `budgetPct` variables
- **Decisions logged:** $0 always shown, "Remaining" label audit, responsive render-both-CSS approach

---

## v179 — Linked Checklist ↔ Budget: One sheet, three mode setting
**Date:** Pre-2026-10-18

- Replaced chain of up to 5 pop-ups after a budget/checklist tick with one settings-driven behaviour
- **Setting:** Settings → Budget → "When you tick linked checklist and budget items" (`linkedMode`)
  - Mode 1: Automatic + Undo (applies change, toast with Undo/Change)
  - Mode 2: One sheet (default — shows all options in one sheet)
  - Mode 3: Automatic, ask about new costs
- `toggleCheck` → `_linkedTaskTicked` (linked) or `_unlinkedMoneyTicked` (unlinked money task)
- Budget-side ticks → `_askTaskDoneBatch` → `_lkPaymentChanged`
- "Not a cost" option on unlinked sheet; remembered per task
- "Book…" tasks → deposit only, never full amount; ordering: book-test runs before money-test
- Removed: all chained pop-ups, Suggest Deposits setting, invoice pop-up switch
- Added: "Add balance task" in budget item ⋯ menu

---

## v180 — × on linked sheet asks "Keep the task ticked?"
**Date:** Pre-2026-10-18

- × or Escape on any linked sheet now asks: "Keep the task ticked?" (or "Keep the payment change?")
- Buttons: **Undo the tick** / **Keep it** — not silent in either direction
- × on the question itself keeps the tick
- Undo uses `toggleCheck(id, true)` (silent re-toggle) which reverses linked flags

---

## v181 — Linked sheets: one Save button
**Date:** Pre-2026-10-18

- Removed "Just the task" / "Just the payment" buttons from linked sheets
- Now: untick any line you don't want, press **Save**
- Save with everything unticked = same as old "Just the task"
- "Add this to your budget?" sheet keeps **Skip** (radios need a "none" option)

---

## v182 — Budget categories: always show Paid and Left to Pay
**Date:** Pre-2026-10-18

- Every budget category header shows Paid and Left to Pay — even at $0
- "Fully paid" category shows "Paid in full ✓" instead of "Left to pay $0"
- "Owing" → renamed to "Left to pay" everywhere
- "Left" (inside allocated) → renamed to "Unallocated"
- Setting: Settings → "Show Paid / Left to pay on Budget Categories" (persists)
- Mobile stack: `.bi-stack-paid` wrap at ≤560px so long names keep their link icon on same line

---

## v183 — Wishing Well: address on cards, sort control, print labels
**Date:** 2026-10-19

- Contribution cards: contributor address shown below note (`x.address` field)
- If no address: "Add address" link opens Edit Contribution sheet
- Sort control: Newest / Oldest / Highest / Lowest / Name A–Z; persists in state
- Print labels button added to Wishing Well header
- **Bug fixed:** `<div class="dots-dropdown">` inside a `<span>` was breaking flex layout
  - Fix: changed to `<span class="dots-dropdown">` (portalled to `<body>` by `toggleDots()` anyway)
- **Bug fixed:** `display:inline-flex` on address line was escaping column; changed to `display:block`
- SVG console errors in `openWwPrintLabels` / `_wwGenerateLabels` (SVG strings through HTML escaper) — flagged but not yet fixed

---

## Session 2 (v184) — Alerts section, Cloud Storage card, toggle fix, dark mode fix
**Date:** 2026-10-21 | Commit: `dd78410` | Cache: v7 → v8

**Changes:**
1. **Alerts & Notifications** — new dedicated settings section for all 5 alert toggles (was scattered in Display & Formatting)
   - Sub-labels: "Banners" (Task/Payment alerts) and "Menu Icons" (Checklist/Budget/Seating)
   - `_SETTINGS_PAGE_MAP` updated; Seating Alert Icon entry added
2. **Cloud Storage card** — signed-in users see cloud storage summary instead of local meter
   - `_cloudStorageCardHtml()` — file count, MB used, 1.5 GB limit, progress bar
   - Thresholds: gold (normal) → amber (≥60%) → red (≥85%)
   - `_CLOUD_LIMIT_BYTES = 1.5 * 1024 * 1024 * 1024`
   - Local meter renamed "Local storage" with stale "old 5 MB limit" sentence removed
3. **Toggle CSS fix** — added `-webkit-appearance:none; appearance:none` to `.toggle-switch input` (fixes Chrome mobile checkbox bleed-through)
4. **Dark mode / `data-theme` fix** — `data-theme="light"` now set on `<html>` whenever light mode is active
   - Fixes: `@media(prefers-color-scheme:dark) :root:not([data-theme="light"])` (~line 2769) was overriding app light mode on OS-dark-mode phones
   - Three touch points: `toggleDarkMode()`, `loadFromStorage()`, fresh-device init
   - Cache bumped: v7 → v8
5. **Deferred:** debug `console.log` in `_lpSignIn()` — still present, remove before production

---

## Session 3 (v184 continued) — Vendor Brief Link Generator
**Date:** 2026-10-21

- Vendor brief link generator: per-vendor tokenised URLs (`?vendor=<token>`)
- Card-level share button + central list view of all active tokens
- `vendor_tokens` Supabase table created
- Async tokens section with 30-second in-memory cache
- Public vendor view (`?vendor=<token>` URL intercept at boot, ~line 44490)
- RLS: couple manages own tokens; public reads by token
- Cache bumped to v9 (pending at time)

---

## Session 4 (v184 continued) — Public Run Sheet Sharing
**Date:** 2026-10-21

- `?runsheet=<coupleId>` URL param intercepted at boot (~line 44997)
- `_showPublicRunSheet()` — fetches STATE from Supabase anon key, renders read-only timeline page
- Share button in timeline topbar (shown when signed in + has public moments)
- Cache bumped to v10 (pending at time)

---

## Session 5 (v185) — Mobile VB Toolbar, Photo Sync, Logo Dedup, Nav Fix
**Date:** 2026-10-22 | Cache: v10 (deploy as v11)

### Change 1: Mobile Vision Board toolbar overflow fix
**Problem:** "Images | Small ▼ | Scrapbook ▼" buttons clipped off left edge on narrow screens (margin-left:auto on inner container)

**Fix:**
- Outer container: `flex-wrap:wrap; overflow-x:auto`
- Inner container: `flex:1; justify-content:flex-end; flex-wrap:wrap; min-width:0`
- `@media(max-width:520px)`:
  - `.vb-trigger-label` hidden (text labels for Size and Layout dropdowns)
  - `.vb-captions-label` hidden (text label for captions toggle)
  - `.vb-captions-icon` SVG shown instead
  - `.vb-layout-trigger` padding reduced (~10px → 6px/9px)
- Added `class="vb-trigger-label"` to Size dropdown span
- Added `class="vb-trigger-label"` to Layout dropdown span

**Decision:** Wrap over horizontal scroll (hidden controls worse UX than wrapping). Icon-only at ≤520px is standard pattern for three controls on a phone.

---

### Change 2: Missing photos banner + retry
**Problem:** Cross-device photos would fail to load silently — no feedback to user

**Fix:** When VB renders and some `it.image` IDs are not in MEDIA (not local blob, not URL, not data URI):
- Amber info banner injected at top of VB showing count + "Retry" button
- `_vbPhotoRetry()` added: collects missing IDs from STATE, calls `_sbPhotoFetch(id)` for each, re-renders

**Decision:** Non-blocking banner with user-triggered retry. Auto-retry rejected (causes re-render loop if fetch fails). Spinner overlay rejected (blocks board; user may have some photos and want to see them).

---

### Change 3: Logo deduplication — base64 → GitHub URLs
**Problem:** 12 PNG logos embedded as base64 strings totalling ~950 KB

**Fix:** All 12 replaced with `https://raw.githubusercontent.com/mandyjane/UnionVault/main/Logos/<filename>` URLs

**Result:** File size 4.6 MB → 3.52 MB (−950 KB)

**Tradeoff accepted:** Logos won't display offline. Fonts remain embedded so the app is functional; only logo images go missing without network.

---

### Change 4: Nav logo wordmark fix
**Problem:** All 4 nav logo `<img>` tags (2 light + 2 dark) were pointing to the crest image (`Black%20logo%20(Light%20mode).png`), so both sides of the divider showed the crest mark ("UV") instead of crest | wordmark

**Fix:**
- Left of divider (crest): light → `Black%20logo%20(Light%20mode).png` / dark → `White%20logo%20(Dark%20mode).png`
- Right of divider (wordmark): light → `Black%20text%20(Light%20mode).png` / dark → `White%20text%20(Dark%20mode).png`

**Decision:** Use text-only logo (not full lockup) for wordmark — full lockup would duplicate the crest.

---

### Change 5 (IN PROGRESS): VB Wallpaper deduplication
**Problem:** `VB_WALLPAPER_LIGHT` and `VB_WALLPAPER_DARK` still embedded as base64 at lines 3642–3643 (~175 KB)

**Action taken:** Extracted to `vb-wallpaper-light.jpeg` (99 KB) and `vb-wallpaper-dark.jpeg` (73 KB). Delivered to user. Awaiting upload to GitHub then URL replacement in HTML (see §2.1).

---

# 4. UNABRIDGED PARKED IDEAS & BACKLOG

| # | Item | Status | Context & Intended Behaviour |
|---|---|---|---|
| **P1** | **Hash routing boot intercept** | 🅿️ Parked | Guests visiting `#liam-amanda` should see the public wedding website, not the login page. QR codes for this are already built. The hash intercept code exists at boot but guest-view rendering is not wired to `location.hash` on initial load. When activated: check `location.hash` before showing LP; if it matches `#liam-amanda` pattern, call the wedding website renderer directly without requiring auth. |
| **P2** | **Supabase Storage SELECT RLS policy** | 🅿️ Parked — BLOCKING cross-device photos | Without this policy, cross-device photo sync fails silently. The amber banner + retry button (Session 5) is a workaround, but the root cause is this missing policy. SQL to add in Supabase dashboard → Storage → photos bucket → Policies: `CREATE POLICY "Users can read own photos" ON storage.objects FOR SELECT TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);` |
| **P3** | **VB wallpaper deduplication** | 🔄 In Progress (see §2.1) | Wallpaper JPEGs extracted and delivered to user. Once uploaded to GitHub and URL updated in HTML, removes ~175 KB from file. |
| **P4** | **Wedding site watermark branding check** | 🅿️ Parked | `WB_CREST_LIGHT` / `WB_CREST_DARK` variables now point to repo logos. Lines ~35083–35089 may still contain old "Elegant Affair" branding text in the watermark HTML. Check and update to "UnionVault" or the couple's custom text. |
| **P5** | **Remove debug `console.log` from `_lpSignIn()`** | 🅿️ Parked (deferred since Session 2) | A `console.log` statement in the login function outputs auth data. Must be removed before production/public launch. Flagged every session, never critical enough to prioritise. |
| **P6** | **Test confirmation email on sign-up** | 🅿️ Parked | The Supabase email confirmation flow has not been tested end-to-end. Need to: create a new test account, receive the confirmation email, click the link, and verify the app handles the redirect/confirmation state correctly. |
| **P7** | **Test guest RSVP flow end-to-end** | 🅿️ Parked | The public RSVP page (`?rsvp=<slug>` or `#rsvp-liam-amanda`) has not been tested from QR code scan → form fill → submit → confirmation. Need to test: QR code renders correct URL, RSVP page loads without auth, form submits to `rsvp_responses` table, couple sees submission in RSVP Manager. |
| **P8** | **SW cache bump to v11** | 🅿️ Parked — DEPLOY BLOCKER | Current code still says `union-vault-v10`. Must be bumped to `union-vault-v11` before deploying Session 5 changes. Otherwise returning users won't get the updated files. |
| **P9** | **SVG console errors in Wishing Well print labels** | 🅿️ Parked (noted v183) | `openWwPrintLabels` / `_wwGenerateLabels` — SVG strings are being passed through the HTML escaper, producing invalid attribute values like `""9""`. Causes console errors but does not affect card layout or core function. Fix: ensure SVG template strings bypass the HTML escaper. |

---

## Design Tokens (Do Not Change Without Review)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--gold` | `#C9A84C` | `#C9A84C` | Primary accent, buttons, highlights |
| `--cream` | `#FDFBF7` | overridden | Page background (light) |
| `--surface` | `#FFFFFF` | `#1A1A1F` | Card/surface background |
| `--ink` | `#2C2222` | overridden | Primary text |
| `--border` | `rgba(0,0,0,0.08)` | overridden | Subtle borders |
| `--sidebar-bg` | `#2C2222` | `#1A1A1F` | Sidebar background |
| Allergy red | `#A8322A` | `#E08080` | Allergy dietary requirement |
| Alert amber | ~`#F5A623` | similar | Missing photos banner, warnings |

## Typography

| Font | Use | Source |
|---|---|---|
| Cormorant Garamond | Headings, section titles, wedding-elegant text | Embedded in HTML (offline) |
| Lato | Body text, paragraphs | Embedded in HTML (offline) |
| Montserrat | UI labels, buttons, nav items | Embedded in HTML (offline) |

## Layout Breakpoints

| Breakpoint | Behaviour |
|---|---|
| ≤ 520px | VB toolbar: hide text labels, show icons only |
| ≤ 560px | Budget summary: switch from B layout (grouped) to A layout (4 side-by-side); budget category card wraps to stack style |
| ≤ 900px | Sidebar: hamburger/drawer mode (collapses after nav tap) |
| > 900px | Sidebar: icon-sidebar mode (persists; only collapses on chevron tap) |

---

## Working Conventions (For Claude Code)

1. **Preview before build** — for any visual/design change, show light + dark mockups in chat first. Clickable prompts: Accept / Reject / Adjust / Use Option A+B
2. **File naming** — deliver as `UnionVault - [very short summary of most recent change].html`
3. **Desktop + mobile** — every change must work at both 1280px+ and 390px widths. Flag if one is at risk
4. **Park = note it** — if user says "park" anything, add it to §4 and confirm it's logged
5. **Single file** — no imports, no build step, no CDN stylesheet links (fonts especially must stay embedded)
6. **SW cache bump** — on every deploy, bump `union-vault-v10` → next version number
7. **Syntax check** — all `<script>` blocks must pass `node --check` before delivery
8. **Changes that touch the same source function** — fix approved surface, prove other surface unchanged, raise it for user to decide (D-v182 "fix what was approved" rule)

