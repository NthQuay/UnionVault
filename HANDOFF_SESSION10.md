# HANDOFF_SESSION10.md
## UnionVault — Session 10 Handoff
*Generated: 2026-10-26 | Do not truncate or summarise this file.*

---

> **READ THIS FIRST.**
> You are continuing development of **UnionVault**, a single-file PWA wedding planner app. Ingest this file fully before doing anything. Do NOT ask the user to re-explain anything already in this document.
>
> **On session start:**
> 1. Read this file top to bottom.
> 2. Read `CLAUDE_CODE_CONTEXT.md` for the complete structural reference (architecture map, design tokens, working conventions, parked ideas).
> 3. Working file: `/home/user/unionvault/index.html` (~50,000+ lines, single file, no build step).
> 4. Never split the single HTML file. Never introduce imports or CDN stylesheet links.
> 5. **Before any visual/design change: show a light + dark preview mockup and wait for Accept / Reject / Adjust. Do NOT implement directly.**
> 6. Bump SW cache (`union-vault-vNNN`) on every deploy. Current: `v258`. Next deploy → `v259`.
> 7. `APP_BUILD` constant in `index.html` must also be bumped to match.
> 8. Supabase project ID: `hzafdlfprtzfxtyaebmc` (ap-southeast-2). MCP tools `mcp__Supabase__*` are available.

---

## 1. Context & Project Scope

UnionVault is a fully offline-capable, single-file PWA wedding planner. All CSS, JS, and fonts are inline in `index.html`. There is no build step. Auth and cloud sync run through Supabase. The app is deployed to GitHub Pages at `https://unionvault.app` (custom domain).

**Cross-reference `CLAUDE_CODE_CONTEXT.md`** for the exhaustive structural reference: file architecture line map, Supabase table schema (as of Session 7), logo asset paths, design tokens, typography, layout breakpoints, page keys, parked ideas backlog, and working conventions. The line numbers in that file are approximately correct but will drift — use the JS section comment markers (e.g. `// ── Add guests picker`) to locate sections precisely.

---

## 2. Current Technical State

### 2.1 Files in Scope

| File | Location | Notes |
|---|---|---|
| `index.html` | `/home/user/unionvault/index.html` | **Current build. ~50,000 lines. v258.** |
| `sw.js` | `/home/user/unionvault/sw.js` | Service worker. Current cache: `union-vault-v258` |
| `supabase/functions/send-appointment-email/index.ts` | `/home/user/unionvault/supabase/functions/send-appointment-email/index.ts` | Deployed Supabase Edge Function. Sends appointment emails via Resend API. |
| `CLAUDE_CODE_CONTEXT.md` | `/home/user/unionvault/` | Full structural reference (Session 7 state) |
| `CHANGELOG_v185.md` | `/home/user/unionvault/` | Session 5 changelog (sessions 6–9 covered below) |
| `DECISIONS_v185.md` | `/home/user/unionvault/` | Design decisions through Session 5 |
| GitHub repo | `https://github.com/mandyjane/UnionVault` | Single branch: `main` |
| Live URL | `https://unionvault.app` | GitHub Pages, custom domain |

### 2.2 App Build Version

```
APP_BUILD = 'v258'
SW cache  = 'union-vault-v258'
```

Next deploy bumps both to `v259`.

### 2.3 Architecture (updated from CLAUDE_CODE_CONTEXT.md §1.3)

The line map in CLAUDE_CODE_CONTEXT.md §1.3 is from Session 7 (~45K lines). The file has grown to ~50K lines. Key sections added since Session 7:

| Section | Approximate location | Comment marker |
|---|---|---|
| Add guests picker (enhanced, v258) | ~lines 40678–41050 | `// ── Add guests picker` |
| Appointment email sending | ~line 22700–22850 | `// ── Appointment email` |
| Event Details partner email field | ~line 5580–5700 | inside `renderEventDetails()` |

### 2.4 Supabase Integration

- **Project:** `hzafdlfprtzfxtyaebmc` (ap-southeast-2)
- **Anon key:** available in `index.html` as `_SB_ANON`
- **Primary table:** `planner_data` (`user_id`, `data` JSONB, `updated_at`)
- **Edge Function deployed:** `send-appointment-email` — calls Resend API, sends `.ics` calendar attachment

### 2.5 State object key additions (since Session 7)

```javascript
STATE.settings.partnerEmail  // string — partner's email for appointment CC
// (added to default STATE object at line ~3874)
```

---

## 3. Supabase Database Schema Changes

All schema changes since Session 7 (the last time CLAUDE_CODE_CONTEXT.md was updated):

### 3.1 Edge Function: `send-appointment-email`

- **Deployed to:** Supabase project `hzafdlfprtzfxtyaebmc`
- **File:** `supabase/functions/send-appointment-email/index.ts`
- **Called from:** `index.html` ~line 22799:
  ```javascript
  const r = await fetch(_SB_URL + '/functions/v1/send-appointment-email', { ... })
  ```
- **Required secret:** `RESEND_API_KEY` — must be set in Supabase project secrets
  ```
  Project: hzafdlfprtzfxtyaebmc → Settings → Edge Functions → Secrets
  Key name: RESEND_API_KEY
  Value:    (user's Resend API key — NOT YET SET as of Session 9)
  ```
- **Status:** ✅ `RESEND_API_KEY` IS SET (24 Oct 2026, confirmed Session 10). `unionvault.app` is verified in Resend. Do not ask the user for the key again.

### 3.2 No new SQL tables since Session 7

No new Supabase tables have been created since Session 7. The schema from CLAUDE_CODE_CONTEXT.md §1.7 remains current:
- `planner_data` — primary STATE store
- `rsvp_responses` — guest RSVP submissions
- `vendor_tokens` — per-vendor tokenised brief URLs
- `photos` (Storage bucket) — vision board photos

**Done:** Supabase Storage SELECT RLS policy for `photos` already exists ("Users can read own photos") — confirmed Session 10.

---

## 4. Git State

```
Branch:   main (only branch — all work goes directly to main)
Remote:   https://github.com/mandyjane/UnionVault
Latest:   caf86a0  feat: Add guests picker — filter panel, select all, group actions
```

### 4.1 Recent commit history

```
caf86a0  feat: Add guests picker — filter panel, select all, group actions (v258)
91a8069  Fix vendor autofill: rating from run-together Google format + category (v257)
8777511  Add appointment email sending and partner email field (v256)
f308a3c  Fix vendor autofill not parsing Google Knowledge Panel ratings/reviews
0d62f94  Fix dashboard Guests widget to show actual invited count
8e310ee  Fix send-method mirroring chain and regroup menu
714d2cc  Fix tooltip direction for match save-the-date method to invite
fe580b5  v251: fix section padding slider — 0px now works correctly
```

---

## 5. Recent Code Updates (Sessions 8–9, relative to CHANGELOG_v185.md)

The CHANGELOG_v185.md covers through Session 5 (v185). Sessions 6 and 7 are documented in CLAUDE_CODE_CONTEXT.md §3. Below are Sessions 8–9 changes not yet in any changelog file.

### Session 8 — RSVP & Invitation Fixes (v239–v251)

| # | What changed | Function / Location |
|---|---|---|
| 1 | `trackerSend` "Resend" menu — method mirroring chain fixed so all RSVP channel methods propagate correctly | `_tickResend()`, `trackerSend()`, ~line 9650 |
| 2 | Dashboard Guests widget now shows actual invited count (was always 0) | `renderDashboard()`, Guests widget, ~line 4332 |
| 3 | Plus One guests included in Couples filter so pair renders together in RSVP tracker | Guest filter logic, ~line 5541 |
| 4 | Guest RSVP form crash fixed — `sec` variable was scoped inside `try` block | `_guestRsvpFormHtml()`, ~line 9603 |
| 5 | RSVP background cutoff fixed, Online RSVPs rendered as full-width row | RSVP manager layout, ~line 10864 |
| 6 | Section padding slider — 0px now works correctly (was resetting to minimum) | Website builder settings, ~line 31885 |
| 7 | Floorplan sidebar for unassigned guests + invitation upload/link feature | `renderSeating()`, ~line 27196 |
| 8 | Seating pool groups by couple/family + children/infants toggle | Seating drag pool, ~line 27196 |
| 9 | Dietary labels renamed to Lactose/Gluten intolerant throughout | All 18 dietary surfaces |
| 10 | Wishing Well address on contributor cards + sort control + print labels | `renderWishingWell()` |

### Session 9 — Vendor, Email, Event Details, Add Guests (v252–v258)

| # | What changed | Function / Location |
|---|---|---|
| 1 | **Vendor autofill — Google paste format** `5.07 Google reviews` → rating 5.0, reviews 7 | `_vendorAutofill()`, vendor section, ~line 37995 |
| 2 | **Vendor autofill — category auto-fill** from Google Knowledge Panel paste | `_vendorAutofill()` |
| 3 | **Appointment email sending** — modal with recipient selector (self, partner, custom); calls Supabase Edge Function `send-appointment-email`; sends `.ics` calendar attachment | `_evSendEmailModal()`, `_evSendEmail()`, ~line 22700 |
| 4 | **Event Details — partner email field** — `STATE.settings.partnerEmail`; shown in Event Details form; auto-fills login email; diff warning if different from login email | `renderEventDetails()`, `_detailsPartnerEmailChange()`, ~lines 5580–5697 |
| 5 | **Add Guests picker — Filter button** — replaces scrollable chip bar; button beside search opens filter panel | `_evOpenPicker()`, ~line 40684 |
| 6 | **Add Guests picker — Filter panel** — Age group (Adults/Children/Infants), Group type (Singles/Couples/Plus ones/Families/Households), Tags; immediate-apply chip toggles; "Clear all" | `_evPickFilterPanelHtml()`, `_evPickToggleFilter()` |
| 7 | **Add Guests picker — Active filter chips** — dismissible pills below search bar | `_evPickUpdateActiveChips()` |
| 8 | **Add Guests picker — Select all** — checkbox with dash (partial)/checked/empty states; respects current search + filters | `_evPickSelectAll()`, `_evPickUpdateSelAllBtn()` |
| 9 | **Add Guests picker — Select group / Household** — buttons on every group header; "Select group" = all slot members; "Household" = adults only | `_evPickSelectGroup()`, `_evPickSelectHousehold()` |
| 10 | **Add Guests picker — Age band badges** — Child/Infant badges rendered on each guest row | `_evPickListHtml()` calls `_ageBandBadge(g)` |

### New functions added in Session 9 (Add Guests picker — all near `// ── Add guests picker`)

```javascript
_evPickVisibleSelectableIds(q, inSet)   // returns IDs of all selectable guests matching search+filters
_evPickSelectAll()                       // select/deselect all visible selectable guests
_evPickSelectGroup(si)                   // select all members of slot index si
_evPickSelectHousehold(si)               // select only adult members of family/household slot
_evPickUpdateSelectionUi()               // update footer count + go button + select-all box
_evPickUpdateSelAllBtn()                 // update select-all checkbox (empty/dash/checked)
_evPickUpdateListCount(q)                // update #evp-list-count span
_evPickRebuildAll(q)                     // full re-render of list + ticks + counts + chips
_evPickUpdateActiveChips()               // re-render #evp-active-chips
_evPickToggleFilter()                    // toggle filter panel open/closed
_evPickRebuildFilterBadge()              // update filter button badge count + colour
_evPickFilterPanelHtml()                 // build filter panel HTML (Age/Group/Tags sections)
_evPickToggleAgeFilter(v)                // toggle age filter value
_evPickToggleGroupFilter(v)              // toggle group type filter value
_evPickToggleTagFilter(v)                // toggle tag filter value
_evPickClearFilter()                     // reset all filters
_evPickApplyFilter()                     // re-render panel + rebuild list after filter change
```

### New module-level vars added

```javascript
let _evPickFilters = {ages:new Set(), groups:new Set(), tags:new Set()};
let _evPickFilterOpen = false;
```

---

## 6. Resolved Issues (Sessions 8–9)

| Issue | Root cause | Fix |
|---|---|---|
| Dashboard Guests widget always showed 0 invited | Widget was reading from wrong property path | Fixed property reference in `renderDashboard()` |
| Vendor autofill failed on Google paste format `5.07 Google reviews` | Regex expected space between number and "Google"; Google Knowledge Panel outputs run-together format | Updated regex in `_vendorAutofill()` to handle both formats |
| Vendor category not auto-filling from Google paste | Category extraction not wired to the Knowledge Panel block | Added category extraction to `_vendorAutofill()` |
| Add guests picker — scrollable filter bar was UX-poor | Filter chips in a horizontal scroll strip were hard to discover | Replaced with Filter button + slide-out panel |
| `_evPickSearch` caused full re-render on every keystroke but didn't update Select All state | Select All box was not wired to search | Replaced with `_evPickRebuildAll(q)` which updates list + all UI state |
| RSVP mirrored method chain broken | Method propagation logic had off-by-one in chain | Fixed in `trackerSend()` / `_tickResend()` |
| Guest RSVP form JS crash | `sec` variable declared inside `try` block but referenced outside | Moved declaration to outer scope |

---

## 7. Immediate Action Plan — Next 3 Steps

> **Session 10 update:** Steps 1 and 2 are already DONE (key set 24 Oct; storage policy exists). Only Step 3 remains.

### Step 1 (✅ DONE): Set `RESEND_API_KEY` in Supabase

Appointment emails are fully built and deployed, but the edge function has no API key. The user needs to:

1. Get a Resend API key from `https://resend.com` (free tier is fine for testing)
2. In Supabase dashboard → Project `hzafdlfprtzfxtyaebmc` → Settings → Edge Functions → Secrets
3. Add secret: `RESEND_API_KEY` = `re_xxxxxxxxxxxx`

OR Claude Code can set it via MCP:
```
mcp__Supabase__create_edge_function_secret({
  project_id: "hzafdlfprtzfxtyaebmc",
  name: "RESEND_API_KEY",
  value: "<key from user>"
})
```

Once set, appointment email sending is fully live.

### Step 2: Add Supabase Storage SELECT RLS policy for `photos` bucket

This is parked item P2 from CLAUDE_CODE_CONTEXT.md. Cross-device photo sync is silently broken without it. Run in Supabase SQL editor (or via `mcp__Supabase__execute_sql`):

```sql
CREATE POLICY "Users can read own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

This unblocks Vision Board photo sync across devices without any frontend code change.

### Step 3: Test end-to-end appointment email flow

After Step 1 is done:
1. Vendors → tap an appointment row on a vendor card → Email (or vendor card → Appointments → new appointment with email ticked → save)
2. Verify email arrives with the `.ics` calendar attachment
3. Verify partner email (Step 1 of Event Details form) auto-fills and appears in the recipient selector
4. Verify that emailing with both self + partner selected sends two emails

If any issue arises, check the Supabase Edge Function logs:
`mcp__Supabase__query_logs({ project_id: "hzafdlfprtzfxtyaebmc", service: "edge-runtime" })`

---

## 8. Parked Ideas (carry forward from CLAUDE_CODE_CONTEXT.md §4)

These items are still parked. Do not action them without user request:

| # | Item | Status |
|---|---|---|
| P1 | Hash routing boot intercept for wedding website QR codes | 🅿️ Parked |
| P2 | Supabase Storage SELECT RLS policy for `photos` | ✅ Done (policy exists) |
| P3 | VB wallpaper deduplication (remove ~175 KB from file) | 🔄 In Progress — awaiting user to upload files to GitHub |
| P4 | Wedding site watermark branding check | 🅿️ Parked |
| P5 | Remove debug `console.log` from `_lpSignIn()` | 🅿️ Parked |
| P6 | Test confirmation email on sign-up | 🅿️ Parked |
| P7 | Test guest RSVP flow end-to-end | 🅿️ Parked |
| P10 | Move UnionVault repo to its own GitHub org | 🅿️ Parked |
| P11 | Verify cross-account privacy fix in production | 🔲 Verify |

---

## 9. Working Conventions (Reminder)

1. **Single file, no imports.** All CSS/JS inline. No build step. No CDN stylesheet links.
2. **One branch: `main`.** Push directly. `git push -u origin main`.
3. **Preview before build** — visual/design changes get light + dark mockup first.
4. **Bump `union-vault-vNN` and `APP_BUILD`** on every deploy. Current: `v258` → next: `v259`.
5. **Supabase MCP** — use `mcp__Supabase__*` tools for DB/function work. Project: `hzafdlfprtzfxtyaebmc`.
6. **"Park"** = add to parked ideas table above and confirm it's noted.
7. **Desktop + mobile** — every change must work at 1280px+ and 390px width.
