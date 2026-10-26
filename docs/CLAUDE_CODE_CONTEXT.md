# CLAUDE_CODE_CONTEXT.md
## UnionVault — Complete Project State Dump for Claude Code Migration
*Generated: 2026-10-23 | Session 7 handoff | Do not truncate or summarise this file.*

---

# 5. INITIALIZATION PROMPT FOR CLAUDE CODE

> **READ THIS SECTION FIRST. It tells you what to do with the rest of this file.**

You are continuing development of **UnionVault**, a single-file PWA wedding planner app. This document is an exhaustive state dump from the previous Claude Code cloud session. Your job is to ingest it fully and pick up without asking redundant questions.

**On every session start, do this:**
1. Read this entire file top to bottom. Do not skim.
2. The working file is `index.html` in `/home/user/unionvault/`. That is your primary working file.
3. Cross-reference Section 1 (architecture) against the actual file — verify line numbers for the JS sections using the comment markers (e.g. `// ════ VISION BOARD WALLPAPER`).
4. Check Section 2 for any in-progress objectives before asking what to do next.
5. Never ask the user to re-explain anything already in this document.
6. Before making any visual/design change: show a preview mockup (light + dark) in the chat and wait for Accept / Reject / Adjust. Do NOT implement directly.
7. Every change must account for both desktop (wide) and mobile (narrow) layouts. Flag if a change risks breaking one.
8. "Park" = add to the Parked Ideas table in Section 4 and confirm it's noted. User will ask for "parked ideas" to retrieve.
9. **Always bump SW cache name on deploy** — currently `union-vault-v95`. Bump to `union-vault-v96` on the next deploy.

---

# 1. RAW FILE ARCHITECTURE

## 1.1 Files in Scope

| File | Location | Notes |
|---|---|---|
| `index.html` | `/home/user/unionvault/index.html` | **Current build. ~45K lines.** |
| `sw.js` | `/home/user/unionvault/sw.js` | Service worker. Current cache: `union-vault-v95` |
| `CLAUDE_CODE_CONTEXT.md` | `/home/user/unionvault/` | This file — migrate with the project |
| `CHANGELOG_v185.md` | `/home/user/unionvault/` | Session 5 changelog (sessions 6–7 added below) |
| `DECISIONS_v185.md` | `/home/user/unionvault/` | Design decisions up to Session 5 |
| GitHub repo | `https://github.com/mandyjane/UnionVault` | Live URL: `https://unionvault.app` (custom domain, GitHub Pages) |
| Logos folder | `https://raw.githubusercontent.com/mandyjane/UnionVault/main/Logos/` | See logo table in §1.4 |

## 1.2 Single-File Architecture Rules — NEVER VIOLATE

1. **Single HTML file. No build step. No imports.** All CSS, JS, and fonts must be inline or served via `raw.githubusercontent.com`. Do not introduce `<link>` stylesheet imports, ES module imports, or any bundler.
2. **Never clear the entire `mandyjane.github.io` domain cache/storage.** Another app shares this GitHub Pages origin. Only ever target named SW caches (e.g. `union-vault-v95`) and UnionVault's specific localStorage keys.
3. **Always show design previews (light + dark) before implementing visual changes.** Show clickable accept/reject/adjust prompts.
4. **Fonts stay embedded** in `<style id="ea-embedded-fonts">` (lines 29–46, ~373 KB). Do not replace with `<link>` — PWA offline support depends on them being inline.
5. **Single branch: `main`** — all work goes directly to main and is pushed to origin. No feature branches in current workflow.

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
                     #welcome-overlay — landing page / auth overlay
                       NOTE: welcome-overlay has NO `hidden` class in HTML — visibility
                       is controlled by CSS rule html[data-uv-auth] #welcome-overlay{display:none!important}
                       An early inline <script> (immediately after <body>) sets data-uv-auth on <html>
                       if a Supabase session exists in localStorage, suppressing the overlay flash.
                     #lp-wrap — landing page / login page
                       #top, #heroCanvas, #auth (sign-in/create forms)
                       #features, #pricing, #faq, #contact, #contactCanvas
                     #setup-modal-overlay — first-run couple setup modal
                     #auth-modal-overlay — in-app sign-in modal
Lines  3638– 3644  <script> block 1: VB Wallpapers
                     const VB_WALLPAPER_LIGHT = "data:image/jpeg;base64,..." (~101 KB)  ← STILL EMBEDDED
                     const VB_WALLPAPER_DARK  = "data:image/jpeg;base64,..." (~74 KB)   ← STILL EMBEDDED
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
| Auth + DB | Supabase — `https://hzafdlfprtzfxtyaebmc.supabase.co` (ap-southeast-2) |
| User ID | `_sbSession.user.id` — stored as `uv_uid` in localStorage on sign-in for cross-account guard |
| Photo storage | Supabase Storage bucket: `photos`. Path: `<user_id>/<photo_id>` |
| Local cache | IndexedDB `MEDIA` store; `MEDIA[id]` = blob object URL |
| Local data | `localStorage` key `union_vault_v1` (app STATE), `uv_sb_session` (Supabase auth session), `uv_uid` (last signed-in user ID) |
| Hash routing | `#liam-amanda` = wedding website; `#rsvp-liam-amanda` = RSVP direct |
| URL params | `?runsheet=<coupleId>` · `?vendor=<token>` · `?rsvp=<slug>` — intercepted at boot (~line 44997) |
| Dark mode | `data-theme="light"` on `<html>` for light; removed for dark. Guards `@media(prefers-color-scheme:dark) :root:not([data-theme="light"])` (~line 2769) |
| Overlay flash guard | `data-uv-auth` on `<html>` (set by early inline script) — CSS hides `#welcome-overlay` when this attribute is present |
| SW cache | `union-vault-v95` (current) — bump to `v96` on next deploy |
| App build | `APP_BUILD = 'v184'` |

## 1.7 Supabase Tables

| Table | Key Columns | RLS Policy | Notes |
|---|---|---|---|
| `planner_data` | `user_id` (UUID, FK → auth.users), `data` (JSONB), `updated_at` | `auth.uid() = user_id` (SELECT, INSERT, UPDATE, DELETE) | **Primary STATE store.** Policy name: "Users manage own planner data". This is the table STATE is saved to and loaded from. |
| `cloud_saves` | `couple_id`, `data` (JSONB), `updated_at` | (see Supabase) | Legacy/alternative table — may be same as above in older code references |
| `rsvp_responses` | `couple_id`, guest data | Couple reads own; public inserts | |
| `vendor_tokens` | `token` (PK), `couple_id`, `vendor_name`, `sections TEXT[]`, `expires_at`, `created_at` | Couple manages own; public reads by token | |
| `photos` (Storage) | Path: `<user_id>/<photo_id>` | **SELECT policy MISSING — see §4 P2** | Cross-device photo sync fails without this policy |

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

## 2.1 Next Deploy Checklist

- [ ] Bump SW cache: `union-vault-v95` → `union-vault-v96` (bump on EVERY deploy)
- [ ] Add Supabase Storage SELECT RLS policy for `photos` bucket (§4 P2) — **cross-device photo sync is blocked without this**
- [ ] Remove debug `console.log` from `_lpSignIn()` (§4 P5 — deferred since Session 2)
- [ ] Test sign-in privacy fix across two separate browsers/accounts (§4 P11)

## 2.2 VB Wallpaper Deduplication (IN PROGRESS)

**Status:** Wallpaper files extracted in Session 5. User has the files. Awaiting upload to GitHub.

Once user uploads `vb-wallpaper-light.jpeg` and `vb-wallpaper-dark.jpeg` to GitHub:
Replace lines 3642–3643 in the HTML:
```js
// AFTER (example if uploaded to /assets/):
const VB_WALLPAPER_LIGHT="https://raw.githubusercontent.com/mandyjane/UnionVault/main/assets/vb-wallpaper-light.jpeg";
const VB_WALLPAPER_DARK="https://raw.githubusercontent.com/mandyjane/UnionVault/main/assets/vb-wallpaper-dark.jpeg";
```
This removes ~175 KB from the file (currently ~3.52 MB).

## 2.3 No Active Multi-File Split Planned

There is **no current plan to split the single HTML file into multiple files**. All features are added to the single `index.html`.

---

# 3. COMPLETE CHRONOLOGICAL PROJECT LOG

## Pre-Session History (App name: "Elegant Affair Planner" → "UnionVault")

The app began as "Elegant Affair Planner" and was rebranded to "UnionVault". Core features built across many sessions before the formal changelog system include: Supabase auth, cloud save/load, full app shell (sidebar nav, topbar, dark mode toggle), landing/login page, first-run setup modal, Dashboard, Event Details, Guest List, Checklist, Budget, Seating Plan, Vision Board, Wishing Well, Website Builder, Invitations, Settings, CSV guest import, Day-of Timeline, Calendar, Inspiration/Mood Board, Vendor tracker, Public run sheet sharing, PWA service worker.

---

## v177 — Allergy + Other dietary requirements
**Date:** Pre-2026-10-18

- Added `allergy` as a 6th dietary key with `g.allergens` (9 chip options) and `g.allergyNote` (free text)
- Added `dietOther` detail box for Other dietary (free text, gold styling vs allergy red)
- Allergy renders in red (`#A8322A` light / `#E08080` dark) across all 18 data surfaces
- Seating print: **ALLERGY: peanuts** in bold capitals + red (also black for B&W print)
- CSV import: allergies/diets normalised on import via `_normaliseDiet`; legacy guests repaired once on load

---

## v178 — Budget: Left to Pay, Unallocated, one consistent set of figures
**Date:** Pre-2026-10-18

- `_budgetFourFigures(totalCost, totalPaid, budgetTotal)` — single source of truth for all budget summaries
- Four figures: Committed, Paid, Left to pay, Unallocated (replaces misleading "Remaining")
- "Paid in full ✓" shown when Left to pay = $0

---

## v179–v182 — Linked Checklist ↔ Budget, Wishing Well improvements
**Date:** Pre-2026-10-18

- Replaced chain of up to 5 pop-ups after a budget/checklist tick with one settings-driven behaviour
- `linkedMode` setting: Automatic + Undo / One sheet (default) / Automatic ask new costs
- × on linked sheet asks "Keep the task ticked?" (not silent)
- Removed "Just the task" / "Just the payment" buttons — one Save button
- Budget categories: always show Paid and Left to Pay; "Owing" → "Left to pay"; "Left" → "Unallocated"
- Wishing Well: contributor address on cards, sort control, print labels

---

## Session 2 (v184) — Alerts section, Cloud Storage card, toggle fix, dark mode fix
**Date:** 2026-10-21 | Commit: `dd78410` | Cache: v7 → v8

1. **Alerts & Notifications** — new dedicated settings section for all 5 alert toggles
2. **Cloud Storage card** — `_cloudStorageCardHtml()` for signed-in users (file count, MB used, 1.5 GB limit, progress bar)
3. **Toggle CSS fix** — `-webkit-appearance:none; appearance:none` to `.toggle-switch input`
4. **Dark mode fix** — `data-theme="light"` now set on `<html>` whenever light mode is active

---

## Session 3 (v184 continued) — Vendor Brief Link Generator
**Date:** 2026-10-21

- Per-vendor tokenised URLs (`?vendor=<token>`), card-level share button
- `vendor_tokens` Supabase table created; RLS: couple manages own, public reads by token

---

## Session 4 (v184 continued) — Public Run Sheet Sharing
**Date:** 2026-10-21

- `?runsheet=<coupleId>` URL param intercept at boot (~line 44997)
- `_showPublicRunSheet()` — fetches STATE from Supabase anon key, renders read-only timeline page

---

## Session 5 (v185) — Mobile VB Toolbar, Photo Sync, Logo Dedup, Nav Fix
**Date:** 2026-10-22 | Cache: v10 → v11 (on deploy)

1. VB toolbar mobile overflow fixed (flex-wrap + icon-only at ≤520px)
2. Missing photos amber banner + `_vbPhotoRetry()` added
3. 12 embedded base64 logos → GitHub repo URLs (−950 KB, 4.6 MB → 3.52 MB)
4. Nav crest + wordmark bug fixed (all four `<img>` were pointing to crest; wordmark slots now use text-only PNG)
5. VB wallpapers extracted but **not yet removed from HTML** (see §2.2)

---

## Session 6 — Cloud Auto-Sync Fix, Custom Domain, Footer + Hero fixes
**Date:** 2026-10-22 | Cache: v11 → v13

1. **Cloud auto-sync on sign-in fix** — `_lpSignIn()` else branch: added `setTimeout(_autoSyncCheckOnBoot, 800)` so signing in when `alreadySetUp = true` still triggers a cloud check. `_autoSyncCheckOnBoot()`: when `localTsRaw` is null (never cloud-synced), auto-load silently via `cloudLoadClick(true)` instead of confusing conflict dialog.
2. **Custom domain** — `unionvault.app` live. DNS A records on Porkbun, GitHub Pages TLS cert active.
3. **Footer logo** — changed from gold PNG 52px to white (`LOGO_DARK`) at 90px via `data-logo="dark"` attribute.

---

## Session 7 — Cross-Account Privacy Fixes, Collapsed Sidebar, Flash Fix, Hero Space
**Date:** 2026-10-23 | Commits: `95e6182`, `de03fa4`, `fcfbf89`, `c32c159` | Cache: v92 → v95

### Change 1 (CRITICAL): Boot-time cross-account data isolation (SW v92, commit `95e6182`)

**Problem:** When a user signed in to account B on a device that had previously stored account A's data in localStorage, the app trusted the stale localStorage, displayed A's data, and — critically — the `_autoSyncSchedule()` debounce timer running 30s after any `saveToStorage()` call would push A's data to B's Supabase account.

**Root cause:** The boot-time `alreadySetUp && _sbSession` branch had no check that the signed-in user matched the user whose data was in localStorage. `uv_uid` was stored but never verified at boot.

**Fix — boot path** (`_autoSyncCheckOnBoot` caller block, ~line 46395):
```js
if(alreadySetUp && _sbSession){
  // Safety: verify local data belongs to the signed-in user before trusting it.
  var _bootUID = null;
  try{ _bootUID = localStorage.getItem('uv_uid'); }catch(_){}
  if(_bootUID && _bootUID !== _sbSession.user.id){
    // Local data belongs to a different user — wipe it and reload
    try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
    try{ localStorage.setItem('uv_uid', _sbSession.user.id); }catch(_){}
    location.reload();
    return;
  }
  // matched or new device — proceed normally
  document.getElementById('welcome-overlay').classList.add('hidden');
  updateTopbarSub();
  navigate('dashboard');
  setTimeout(_autoSyncCheckOnBoot, 800);
  setTimeout(_mediaCloudSync, 2000);
}
```

**Fix — import path** (~line 44424): When `sessionStorage` flag `uv_import_pending` is set (JSON restore after reload), cancel the `_autoSyncTimer` that `saveToStorage()` immediately schedules, so imported data is NOT silently pushed to cloud:
```js
if(_importFlag){
  try{ sessionStorage.removeItem('uv_import_pending'); }catch(_){}
  if(!STATE.settings._lastCloudSave){
    STATE.settings._lastCloudSave = new Date().toISOString();
    saveToStorage();
    if(_autoSyncTimer){ clearTimeout(_autoSyncTimer); _autoSyncTimer=null; }
  }
  if(typeof _cloudToast !== 'undefined') _cloudToast('Data imported ✓ — click Save to Cloud to back it up');
  return;
}
```

**Status: ✅ FIXED AND DEPLOYED.** Both root causes addressed. `uv_uid` is written to localStorage on every sign-in and checked at every boot.

---

### Change 2: Collapsed sidebar rings icon (SW v93, commit `de03fa4`)

**Problem:** `.sidebar.collapsed .sidebar-footer{display:none}` hid the entire footer including the rings icon/couple-display button when the sidebar was collapsed to 56px icon strip.

**Fix** (~line 843):
```css
.sidebar.collapsed .sidebar-footer{padding:10px 0;display:flex;justify-content:center}
.sidebar.collapsed .couple-display{justify-content:center;padding:6px;margin:0;width:40px}
.sidebar.collapsed .couple-names{display:none}
.sidebar.collapsed #sidebar-signout-pop{left:0;right:auto;min-width:210px}
```

**Status: ✅ FIXED.**

---

### Change 3: Flash of app content before landing page (SW v94, commit `fcfbf89`)

**Problem:** On hard refresh, app content (dashboard) appeared for ~200ms before `#welcome-overlay` became visible, because the overlay started `hidden` and JS needed to run before it could show the landing page for unauthenticated users.

**Fix:** Three coordinated changes:
1. Early inline `<script>` immediately after `<body>` — reads `uv_sb_session` from localStorage; if present, sets `data-uv-auth=""` on `<html>` before first paint.
2. CSS rule (~line 2167): `html[data-uv-auth] #welcome-overlay{display:none!important}` — suppresses overlay for authenticated sessions.
3. `#welcome-overlay` HTML: removed `hidden` class from initial markup — the overlay now defaults to visible; JS hides it for authenticated users, CSS hides it via `data-uv-auth` for fast boot.

**Status: ✅ FIXED.**

---

### Change 4: Landing page hero empty space reduction (SW v95, commit `c32c159`)

**Problem:** A large vertical gap between the logo and headline in the hero left panel because `.hero-logo{margin-bottom:auto}` absorbed all remaining flex space in the sticky column.

**Fix** (line 2946):
```css
/* BEFORE: */
.hero-logo{display:flex;align-items:center;gap:14px;margin-bottom:auto;padding-bottom:22px}

/* AFTER: */
.hero-logo{display:flex;align-items:center;gap:14px;margin-bottom:clamp(20px,5vh,80px);padding-bottom:22px}
```

**Status: ✅ FIXED.**

---

### Supabase data contamination cleanup (Session 7)

During debugging, contaminated data was discovered and cleaned:
- `ajtom0610@gmail.com` account: test data ("Ken & Barbie") was present — user deleted this account entirely via Supabase dashboard.
- `liam.metcalf@yahoo.com.au` (user_id `ef437b58-...`): 25 rows of atomlinson's data from a v89 import bug — rows deleted via Supabase Table Editor UI.
- `atomlinson@live.com.au` (user_id `522da1db-...`): Data was temporarily overwritten with "Ken & Barbie" test data due to the auto-sync bug. User restored from `.json` backup.

The code fixes in Change 1 above prevent recurrence. **No further Supabase cleanup required.**

---

# 4. UNABRIDGED PARKED IDEAS & BACKLOG

| # | Item | Status | Context & Intended Behaviour |
|---|---|---|---|
| **P1** | **Hash routing boot intercept** | 🅿️ Parked | Guests visiting `#liam-amanda` should see the public wedding website, not the login page. QR codes for this are already built. The hash intercept code exists at boot but guest-view rendering is not wired to `location.hash` on initial load. When activated: check `location.hash` before showing LP; if it matches `#liam-amanda` pattern, call the wedding website renderer directly without requiring auth. |
| **P2** | **Supabase Storage SELECT RLS policy** | 🅿️ Parked — **BLOCKING cross-device photos** | Without this policy, cross-device photo sync fails silently. The amber banner + retry button (Session 5) is a workaround, but the root cause is this missing policy. SQL to add in Supabase dashboard → Storage → photos bucket → Policies: `CREATE POLICY "Users can read own photos" ON storage.objects FOR SELECT TO authenticated USING (auth.uid()::text = (storage.foldername(name))[1]);` |
| **P3** | **VB wallpaper deduplication** | 🔄 In Progress (see §2.2) | Wallpaper JPEGs extracted and delivered to user in Session 5. Once uploaded to GitHub and URL updated in HTML, removes ~175 KB from file. |
| **P4** | **Wedding site watermark branding check** | 🅿️ Parked | `WB_CREST_LIGHT` / `WB_CREST_DARK` variables now point to repo logos. Lines ~35083–35089 may still contain old "Elegant Affair" branding text. Check and update to "UnionVault" or the couple's custom text. |
| **P5** | **Remove debug `console.log` from `_lpSignIn()`** | 🅿️ Parked (deferred since Session 2) | A `console.log` statement in the login function outputs auth data. Must be removed before production/public launch. |
| **P6** | **Test confirmation email on sign-up** | 🅿️ Parked | The Supabase email confirmation flow has not been tested end-to-end. |
| **P7** | **Test guest RSVP flow end-to-end** | 🅿️ Parked | The public RSVP page (`?rsvp=<slug>` or `#rsvp-liam-amanda`) has not been tested from QR code scan → form fill → submit → confirmation. |
| **P8** | **SW cache bump** | ✅ Done | Currently `union-vault-v95`. Bump to `v96` on next deploy. |
| **P9** | **SVG console errors in Wishing Well print labels** | 🅿️ Parked (noted v183) | `openWwPrintLabels` / `_wwGenerateLabels` — SVG strings are being passed through the HTML escaper. Causes console errors but does not affect function. |
| **P10** | **Move UnionVault repo to its own GitHub org** | 🅿️ Parked | Domain `unionvault.app` is live. Org migration not yet done. When done: update all `raw.githubusercontent.com/mandyjane/UnionVault/` logo/asset URLs in `index.html` to new org path; update CLAUDE_CODE_CONTEXT.md §1.1. The `CNAME` file travels with the repo. |
| **P11** | **Verify cross-account privacy fix in production** | 🔲 Verify | The boot-time uv_uid check and import auto-sync block are deployed (SW v92, commit `95e6182`). Test by: (1) signing into account A in browser A, loading data, signing out; (2) signing into account B in same browser — data should NOT carry over. Also test JSON import: import a .json file → confirm toast says "click Save to Cloud" → navigate away and back → data should NOT auto-push. |
| **P12** | **Split `index.html` into ES modules** | 🅿️ Parked | `index.html` is ~36k+ lines and growing. Splitting into logical ES modules (auth, guests, website-builder, email, landing, etc.) would reduce per-edit token cost and improve navigability. Requires: switching to `type="module"` script tags, auditing inter-dependencies, rewiring `onclick=` attributes to `addEventListener` calls, updating the service worker shell list. Do as a dedicated session — not mixed with feature work. Extract one module at a time and verify after each. |

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
2. **Desktop + mobile** — every change must work at both 1280px+ and 390px widths. Flag if one is at risk
3. **Park = note it** — if user says "park" anything, add it to §4 and confirm it's logged
4. **Single file** — no imports, no build step, no CDN stylesheet links (fonts especially must stay embedded)
5. **SW cache bump** — on every deploy, bump `union-vault-vNN` to `vNN+1`. Current: `v95` → bump to `v96`
6. **Syntax check** — all `<script>` blocks must pass `node --check` before delivery
7. **Changes that touch the same source function** — fix approved surface, prove other surface unchanged, raise it for user to decide
8. **git push** — always `git push -u origin main`. One branch (`main`), deploy directly
9. **Supabase MCP** — Supabase MCP server is available in Claude Code cloud sessions. Use `mcp__Supabase__*` tools for database queries and schema changes. Project ID: `hzafdlfprtzfxtyaebmc`
