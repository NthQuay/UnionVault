# HANDOFF — Session 12
*Generated: 2026-10-28 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a single-file PWA wedding planner. This file is the complete state dump from Session 12. Read it top to bottom before doing anything. Cross-reference `docs/CLAUDE_CODE_CONTEXT.md` for the full architecture map (line numbers, JS sections, CSS layout). That file's line map is from Session 7 — line numbers have drifted but section order and comment markers are still accurate.

**Standing rules (never violate):**
- Single file: `index.html`. No build step, no imports, no bundler.
- Every deploy: bump `APP_BUILD` in `index.html` **and** `CACHE` in `sw.js` together.
- Visual changes: show light + dark preview in chat first. Wait for Accept / Reject / Adjust before implementing. Exception: the vendor brief is a public read-only page, not an in-app screen; targeted bug fixes to it do not require a preview pass.
- Branch for Claude Code sessions: `claude/youthful-turing-7zsmrd`. Merge to `main` when ready to deploy to production. `main` auto-deploys to GitHub Pages.
- Never write `RESEND_API_KEY` into the repo — it is public.
- Never expose raw `guests`/`settings`/`families`/`wishingwell` rows to `anon` — always use RPCs.

---

## 1. Context & Project Scope

**UnionVault** is a wedding planning PWA with:
- Guest management, RSVP tracking, budget, appointments, mood board, wishing well, public wedding-site generator, and vendor management
- A Supabase backend (project `hzafdlfprtzfxtyaebmc`, region `ap-southeast-2`) for auth, cloud sync, email, and backups
- Hosted on GitHub Pages at `https://unionvault.app` (custom domain via CNAME)
- All app logic lives in one file: `index.html` (~50 K+ lines as of v323)

Cross-reference `docs/CLAUDE_CODE_CONTEXT.md` for:
- Full line map of `index.html` (CSS, HTML, JS sections, STATE object)
- Nav page list and their JS render functions
- Supabase table list and RLS rules up to Session 7

---

## 2. Current Technical State

| Item | Value |
|---|---|
| `APP_BUILD` | `v323` |
| `APP_BUILD_DATE` | `2026-10-28` |
| `sw.js` CACHE | `union-vault-v323` |
| GitHub repo | `https://github.com/mandyjane/UnionVault` |
| Live URL | `https://unionvault.app` |
| Working branch | `claude/youthful-turing-7zsmrd` |
| Latest commit | `e4e0745` — "v323: Fix vendor brief contact, logo, sections, and guest count" |
| Supabase project | `hzafdlfprtzfxtyaebmc` (ap-southeast-2) |

**⚠️ v323 is on `claude/youthful-turing-7zsmrd` — not yet on `main`. It has NOT deployed to production yet. The first action next session is to merge this branch to `main`.**

**index.html architecture (as of v323):**
- Lines 1–28: DOCTYPE + `<head>` meta, favicons, manifest
- Lines 29–46: `<style id="ea-embedded-fonts">` — Cormorant Garamond, Lato, Montserrat (embedded, ~373 KB — do not convert to `<link>`)
- Lines 47–2435: Main `<style>` block — full app CSS
- Lines 2436–2712: Dark calendar CSS (FullCalendar overrides)
- Lines 2713–3637: HTML structure (`#app`, `#sidebar`, `#topbar`, `#main-content`, `#welcome-overlay`, `#lp-wrap`, modals)
- Lines 3638–3644: VB Wallpaper constants (base64 images)
- Lines 3645–3824: `STATE` object — default values for all app data
- Lines 3825+: All JavaScript (UTILS, NAV, DASHBOARD, BUDGET, GUESTS, RSVP, etc.)
- `APP_BUILD` constant is near line 29502
- `_showVendorPortal()` function starts near line 49823
- Vendor brief RPC call and rendering: lines 49823–49984

---

## 3. Supabase Schema Changes (Sessions 11–12)

### From Session 11 (unchanged, for reference)

**`public.planner_backups`** — hourly snapshot table:
```sql
CREATE TABLE public.planner_backups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL
);
```
RLS: users can SELECT/INSERT/DELETE own rows. pg_cron fires every hour.

### From Session 12 — `vendor_brief` RPC update

The `public.vendor_brief(t text)` function was updated via `execute_sql` directly against the live database. **The migration file `supabase/migrations/20261026_public_page_rpcs.sql` still contains only a stub comment and does NOT reflect the current live definition.** Updating that file is an outstanding action item.

**Changes made to `vendor_brief(t text)`:**

1. **`vendorCard`**: added `contact` and `phone` fields
   ```sql
   -- Before: only returned category, setupTime, email
   -- After: returns category, setupTime, email, contact, phone
   select jsonb_strip_nulls(jsonb_build_object(
     'category',  x->'category',
     'setupTime', x->'setupTime',
     'email',     x->'email',
     'contact',   x->'contact',   -- NEW
     'phone',     x->'phone'      -- NEW
   ))
   ```

2. **`guestCount`**: changed from scalar `count(*)` to RSVP breakdown object
   ```sql
   -- Before: (select count(*) from ...)
   -- After:
   select jsonb_build_object(
     'attending', count(*) filter (where g->>'rsvp' = 'attending'),
     'declined',  count(*) filter (where g->>'rsvp' = 'declined'),
     'awaiting',  count(*) filter (where coalesce(g->>'rsvp','awaiting') = 'awaiting'),
     'total',     count(*)
   )
   ```
   RSVP field values confirmed in database: `'attending'`, `'declined'`, `'awaiting'`.

3. **`sectionData`**: new top-level key returning actual content for each section in `vendor.sections`
   ```sql
   'sectionData', (
     select coalesce(jsonb_object_agg(sec, content), '{}'::jsonb)
     from (
       select 'timeline' as sec, <agg of pub:true timeline items> where 'timeline' = any(v.sections)
       union all
       select 'budget',   <p.data->'items' from budget>               where 'budget'   = any(v.sections)
       union all
       select 'checklist',<agg of checklist items>                    where 'checklist'= any(v.sections)
       union all
       select 'contacts', <agg of non-removed vendors excl. self>     where 'contacts' = any(v.sections)
       union all
       select 'notes',    <{notes,brief} from vendor record>          where 'notes'    = any(v.sections)
     ) secs
   )
   ```
   Each section only included when it's in `vendor.sections`. Uses correlated subquery on outer `vendor_tokens v`.

**Full current RPC definition** (run `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'vendor_brief';` to get live copy):

Key return shape:
```json
{
  "vendor":     { "token", "couple_id", "vendor_name", "sections", "expires_at" },
  "event":      { ... planner_data section='event' ... },
  "theme":      { ... planner_data section='website'->'theme' ... },
  "guestCount": { "attending": N, "declined": N, "awaiting": N, "total": N },
  "vendorCard": { "category", "setupTime", "email", "contact", "phone" },
  "sectionData": { "timeline": [...], "budget": [...], "checklist": [...], "contacts": [...], "notes": {...} }
}
```

### Existing tables/functions (unchanged)

| Item | Purpose |
|---|---|
| `planner_data` | Per-section cloud sync |
| `planner_backups` | Hourly auto-backups (48 retained) |
| `vendor_tokens` | Vendor brief tokens (`token`, `couple_id`, `vendor_name`, `sections[]`, `expires_at`) |
| `public_wedding_extras(uid)` | RPC for public wedding site — safe anon read |
| `send-appointment-email` | Edge function — signed-in only |
| `send-guest-email` | Edge function — signed-in only |
| `rsvp-notify` | Edge function — service role (public RSVP form) |

---

## 4. Git State

```
Active branch:  claude/youthful-turing-7zsmrd
Remote:         https://github.com/mandyjane/UnionVault

Recent commits on claude/youthful-turing-7zsmrd:
e4e0745  v323: Fix vendor brief contact, logo, sections, and guest count
c8282bd  v322: vendor brief improvements + PDF blur + custom cats + setup time
...      (earlier v322 commits)

Branch is up to date with origin/claude/youthful-turing-7zsmrd.
main branch is at: v306 (Session 11 state) — v322/v323 not yet merged.
```

**Merge to `main` is required before v322 and v323 reach production.**

---

## 5. Recent Code Updates (Session 12)

### v322 — Vendor brief improvements + PDF + categories + setup time

All changes in `index.html`, `sw.js`.

**PDF blur fix** (`_doRenderPdf`, ~line 44700):
```js
// scale cap: 2 → 3 (better retina rendering)
const scale = Math.min(3, containerW / baseVp.width);
// explicit canvas height instead of 'auto':
canvas.style.height = (vp.height / (window.devicePixelRatio||1)) + 'px';
```

**Brief creation modal — defaults + memory** (~line 21153):
- All chips now start unselected (removed default `sel` class)
- On open, restores `STATE.settings.vendorBriefLastSections` if set
- On generate, saves selected sections to `STATE.settings.vendorBriefLastSections` then calls `saveToStorage()`

**Brief success state** (`_generateVendorToken`, ~line 21210):
- Shows expiry date if set: `Expires: <strong>${expiryDisplay}</strong>`
- "Email vendor" button: `<a href="mailto:...">` with pre-filled subject + body including the brief link

**Vendor edit form** (`_vendorOpenForm`, ~line 21942):
- Added `setupTime` field between Opening hours and Notes
- Saved via `_vendorSaveForm` with key `setupTime`
- Default initialised as `setupTime:''`

**Custom category chips in vendor form** (~line 21954):
- Shows `STATE.vendorCustomCats` as deletable chips below the category select
- `_deleteVendorCategory(btn)` — filters `STATE.vendorCustomCats`, saves, removes chip from DOM, removes option from select

**Vendor brief contact card fix** (~line 49902):
- Changed avatar initial + name from `p1` (groom) → `matchedVendor.contact`
- Contact now populated because v323 RPC fix supplies `contact` in `vendorCard`

**Vendor brief footer logo** (~line 49977):
- Replaced plain "Powered by Union Vault" text with logo + link
- Uses `logos/Black logo (Light mode).png` and `logos/White logo (Dark mode).png`
- Light/dark switching via CSS classes `vb-ft-crest-light` / `vb-ft-crest-dark`
- Linked to `https://unionvault.app`
- Note: uses "logo" (crest symbol only) not "full" (full wordmark) to avoid text duplication with the Cinzel-font `<span>` beside it

### v323 — Vendor brief contact, logo, sections, guest count

**Supabase RPC** (applied live, not in migration file yet — see §3):
- `vendorCard` now returns `contact` + `phone`
- `guestCount` → RSVP object `{attending, declined, awaiting, total}`
- `sectionData` → content for each shared section

**Guest count computation** (`_showVendorPortal`, ~line 49841):
```js
let guestCountDisplay = null, sectionData = {};
// inside if(res.ok):
const rawGc = b.guestCount;
if(rawGc && typeof rawGc === 'object' && 'total' in rawGc){
  const {attending=0, declined=0, awaiting=0} = rawGc;
  const responded = attending + declined;
  if(awaiting > 0 && responded > 0)
    guestCountDisplay = `~${attending + Math.round(awaiting * attending / responded)} expected (${attending} confirmed)`;
  else if(attending > 0) guestCountDisplay = `${attending} attending`;
  else guestCountDisplay = rawGc.total ? String(rawGc.total) : null;
} else { guestCountDisplay = rawGc ? String(rawGc) : null; }
sectionData = b.sectionData||{};
couple = { event:b.event||{}, vendors:[Object.assign({business:vendor.vendor_name}, vc)] };
```

**Section chips + content cards** (~line 49940):
```js
const SECTION_LABELS = {
  timeline:'Day timeline', budget:'Budget summary',
  checklist:'Checklist', contacts:'Contact details', notes:'Notes / brief'
};
const _rvbs = (id, data) => { /* renders content for each section type */ };
```
- Chips are now `<a href="#vbs-${s}">` with label text not raw ID
- Each section gets a card `<div id="vbs-${s}">` rendered below chips
- Content rendering: timeline → time+title+location rows; budget → categories+sub-items; checklist → grouped by category with ✓/○; contacts → business+contact+phone+email; notes → pre-line text block
- All user-provided text is HTML-escaped via local `e = s => s.replace(/&/g,'&amp;')...`

**Logo PNG filenames** (~line 49977):
```js
// Black full → Black logo (crest only, no embedded wordmark text)
// White full → White logo
src=".../logos/Black%20logo%20(Light%20mode).png"
src=".../logos/White%20logo%20(Dark%20mode).png"
```

---

## 6. Resolved Issues

| Issue | Resolution |
|---|---|
| PDF renders blurry on retina displays | Explicit canvas height = `vp.height/dpr`; scale cap 2→3 |
| Vendor brief contact card shows groom's name | Client: use `matchedVendor.contact` not `p1`; RPC: add `contact` to `vendorCard` |
| Brief footer shows plain text "Powered by Union Vault" | Replaced with logo+link block |
| Logo footer shows double text (crest PNG + Cinzel span) | Swap `Black full` → `Black logo` PNG (crest only) |
| Section chips show raw IDs ("timeline", "budget") | Map to display labels via `SECTION_LABELS` object |
| Section chips not linked to any content | Render as `<a href="#vbs-{id}">`, add content cards below |
| Vendor cannot read shared section content | RPC now returns `sectionData` with timeline/budget/checklist/contacts/notes content |
| Guest count shows total (88) instead of expected | RSVP breakdown from RPC; formula `attending + round(awaiting × attending/(attending+declined))` |
| Brief modal always opens with all sections selected | Default to unselected; restore `STATE.settings.vendorBriefLastSections` |
| No way to delete a custom vendor category | `_deleteVendorCategory(btn)` added; chips shown in vendor edit form |
| No setup time field on vendor | Added `ven-f-setuptime` input to vendor form, saved as `setupTime` |
| Brief doesn't show expiry / no easy way to email vendor | Added expiry display + "Email vendor" mailto button to brief success state |

---

## 7. Immediate Action Plan (Next Session)

**Step 1 — Merge to `main` and deploy v322+v323**

```bash
git checkout main
git merge claude/youthful-turing-7zsmrd
git push -u origin main
```

GitHub Pages deploys automatically (~30 seconds). Verify at `https://unionvault.app`.

**Step 2 — Verify live vendor brief**

Open a live vendor brief URL and confirm all four fixes are working:
1. Contact card shows the vendor's contact name (not "?" or the groom's name)
2. Footer shows crest symbol + "UNION VAULT" text, no duplicate wordmark, links to unionvault.app
3. "Also shared with you" chips show friendly labels ("Day timeline", "Budget summary", etc.) and scroll to content cards
4. Guest count shows expected formula (e.g. "~72 expected (55 confirmed)") not raw total

**Step 3 — Document the live RPC in the migration file**

`supabase/migrations/20261026_public_page_rpcs.sql` currently contains only a stub comment. The live `vendor_brief` RPC was updated via `execute_sql` directly. Run:

```sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'vendor_brief';
```

Copy the output into the migration file so the codebase stays as the source of truth, then commit to `main`.

---

## 8. Environment & Credentials

| Item | Value / Note |
|---|---|
| Supabase project ID | `hzafdlfprtzfxtyaebmc` |
| Supabase region | `ap-southeast-2` |
| GitHub repo | `https://github.com/mandyjane/UnionVault` |
| Live URL | `https://unionvault.app` |
| `RESEND_API_KEY` | Set as Supabase edge function secret (SHA256 starts `45658b6c3e93…`) — do NOT ask for or write this value |
| `unionvault.app` | Verified in Resend — DNS done |
| User email (authorship only) | `atomlinson@live.com.au` |
| Logo files (repo root `logos/`) | `Black logo (Light mode).png` — crest only, light mode; `White logo (Dark mode).png` — crest only, dark mode; `Black full (Light mode).png` — full wordmark, light mode; `White full (Dark mode).png` — full wordmark, dark mode |
