# UnionVault — Session 9 Handoff
*Generated: 2026-10-24 | End of Session 8 | Feed this file to the new session before doing anything else.*

---

## ⚠️ HOW TO USE THIS FILE

Read this entire document top to bottom before touching any code. Cross-reference `CLAUDE_CODE_CONTEXT.md` for deep architectural background (lines, logo table, Supabase schema, design tokens). This file **supersedes** `CLAUDE_CODE_CONTEXT.md` wherever they conflict — the context file is from Session 7 and some of its facts (SW cache version, line counts, website builder section) are now stale.

---

## 1. Context & Project Scope

**UnionVault** is a single-file PWA wedding planner app. Everything lives in one file: `index.html`. No build step, no bundler, no imports. All CSS, JS, and fonts are inline. The service worker (`sw.js`) caches the shell for offline use.

**Cross-reference `CLAUDE_CODE_CONTEXT.md` for:**
- Full line-map (§1.3) — note ranges are now approximate; verify with grep/search
- Logo asset URLs (§1.4)
- All Supabase table schemas (§1.7)
- All design tokens and typography (§4 design tokens block)
- Working conventions (§4 working conventions block)
- Full parked ideas backlog (§4 parked ideas table)

**What `CLAUDE_CODE_CONTEXT.md` gets wrong (do not trust these values):**
- SW cache — the context file says `union-vault-v95`. Actual current value: **`union-vault-v147`**
- File line count — the context file says ~45K lines. Actual: **47,387 lines**
- "Next deploy" SW bump note — ignore; already done many times since Session 7

---

## 2. Current Technical State

### Core files

| File | Location | Status |
|---|---|---|
| `index.html` | `/home/user/unionvault/index.html` | **47,387 lines. Current build.** |
| `sw.js` | `/home/user/unionvault/sw.js` | Cache: `union-vault-v147` |
| `CLAUDE_CODE_CONTEXT.md` | `/home/user/unionvault/` | Deep background — accurate except where noted above |
| `CHANGELOG_v185.md` | `/home/user/unionvault/` | Session 5 changelog — predates Sessions 6–8 |
| `DECISIONS_v185.md` | `/home/user/unionvault/` | Design decisions through Session 5 |

### App constants (current)

```js
const APP_BUILD = 'v184';
const APP_BUILD_DATE = '2026-10-20';
const CACHE = 'union-vault-v147';   // in sw.js
const _SB_URL = 'https://hzafdlfprtzfxtyaebmc.supabase.co';
const _SB_KEY = 'sb_publishable_hWMFKVxJTRH3UqcC9GN_WA_gJ2GNX5T';
```

### Website builder — `STATE.website.theme` properties (complete, including new ones)

The theme object is normalised by `_wbSite()` and accessed throughout `_wbBuildSite()` as `t2`. All of the following fields exist:

| Property | Type | Default | Notes |
|---|---|---|---|
| `format` | `'modern'` \| `'editorial'` | `'modern'` | **New — Session 8.** Editorial = italic h2 + thin accent rule |
| `rsvpMode` | `'modal'` \| `'page'` | `'modal'` | **New — Session 8.** Modal = bottom-sheet overlay on site; page = separate tab |
| `accent` | hex | `#8B7355` | Accent / button outline colour |
| `button` | hex | `#8B7355` | Button fill colour |
| `heading` | hex | `#2C2222` | h2 colour |
| `text` | hex | `#4A3728` | Body text colour |
| `page` | hex | `#FDFBF7` | Section background |
| `background` | hex | `#F5F0E8` | Page/body background |
| `headFont` | string | `'Cormorant Garamond, serif'` | Heading font-family |
| `bodyFont` | string | `'Lato, sans-serif'` | Body font-family |
| `corners` | `'sharp'`\|`'soft'`\|`'round'`\|`'pill'` | `'soft'` | Border-radius preset |
| `navPos` | `'top'`\|`'side'` | `'top'` | Nav bar position |
| `maxWidth` | number | `720` | Section max-width (px) |
| `headScale` | number | `100` | Heading font scale (%) |
| `bodyScale` | number | `100` | Body font scale (%) |
| `space` | number | `100` | Spacing scale (%) |
| `gap` | number | `0` | Section gap (px) |
| `secpad` | number | `52` | Section padding (px) |
| `shadow` | number | `0` | Section shadow strength (0–100) |
| `cardStyle` | number | `0` | Section bevel/card depth (0–100) |
| `btnStyle` | `'filled'`\|`'outline'`\|`'soft'` | `'filled'` | Button visual style |
| `btnSize` | `'sm'`\|`'md'`\|`'lg'` | `'md'` | Button size |
| `btnShadow` | `'none'`\|`'soft'`\|`'strong'` | `'none'` | Button shadow |
| `btnBorder` | `'thin'`\|`'regular'`\|`'bold'` | `'regular'` | Button border width |
| `btnBevel` | boolean | `false` | Button bevel |
| `css` | string | `''` | Custom CSS override |

### Website builder key functions

| Function | Purpose |
|---|---|
| `_wbSite()` | Normalises `STATE.website`, sets all defaults including `format` and `rsvpMode` |
| `_wbSet(field, val)` | Sets `STATE.website.theme[field]`, saves, repaints builder |
| `_wbNum(field, val)` | Handles numeric slider changes |
| `_wbBuildSite(forDownload)` | Generates the full standalone public wedding site HTML |
| `_wbRepaintTheme()` | Refreshes the builder theme panel UI |
| `_showPublicWeddingSite(slug)` | Fetches couple data and calls `_wbBuildSite()` for public viewers |
| `_wbPublicOwnerUid` | Module-level `let` — set by `_showPublicWeddingSite` so `_wbBuildSite` has the owner UID |

### RSVP standalone page key functions

| Function | Purpose | Location |
|---|---|---|
| `_showRsvpForm(coupleId)` | Renders the standalone RSVP page (replaces body via `_publicPageShell()`) | ~line 46640 |
| `_rfNameSearch(q)` | Autocomplete: filters guest names from `#rf-guest-data` element | ~line 46817 |
| `_rfPickName(name)` | Sets name input, reveals attendance card | ~line 46837 |
| `_rfNameKey(e)` | Keyboard nav for autocomplete list | ~line 46845 |
| `_rfSetAttend(val)` | Sets attendance pill, reveals contact fields (yes only) or just submit (no) | ~line 46869 |
| `_rfSubmit(coupleId)` | Submits RSVP to `rsvp_responses` table | ~line 46882 |

### RSVP modal (embedded in generated site)

When `t2.rsvpMode === 'modal'`, `_wbBuildSite()` embeds the following directly into the generated HTML **at the bottom of `<body>`** (between `</footer>` and the nav `<script>` block):

- `<style>` — scoped to `#uv-rsvp-sheet` and `#uv-rsvp-overlay`
- `<div id="uv-rsvp-overlay">` — the full-screen backdrop
  - `<div id="uv-rsvp-sheet">` — the bottom-sheet panel
    - `#rf-name`, `#rf-ac-list`, `#rf-attend-card`, `#rf-contact-group`, `#rf-submit` — same IDs as standalone form
    - `#uv-rf-data` — hidden `<div>` with `data-guests='...'` (JSON guest names) and `data-couple="<uid>"`
- `<script>` IIFE — exposes: `window._uvOpenRsvp`, `window._uvCloseRsvp`, `window._rfNameSearch`, `window._rfPickName`, `window._rfNameKey`, `window._rfSetAttend`, `window._uvRsvpSubmit`
- Guest names sourced from `STATE.guests` at build time (A-list only, sorted)
- Supabase URL and key baked in as string literals at build time

The RSVP **button** in `btns` blocks: when `um === 'rsvp' && t2.rsvpMode === 'modal'`, renders as `<button type="button" class="ics" onclick="_uvOpenRsvp()">` instead of an `<a>` tag.

---

## 3. Supabase Database Schema

No schema changes were made in Sessions 6, 7, or 8. The schema is as documented in `CLAUDE_CODE_CONTEXT.md §1.7`. For reference:

| Table | Key columns | Notes |
|---|---|---|
| `planner_data` | `user_id` (UUID), `data` (JSONB), `updated_at` | Primary STATE store. RLS: auth.uid() = user_id |
| `rsvp_responses` | `couple_id`, `guest_name`, `email`, `phone`, `address`, `attending`, `dietary`, `message` | Insertable by public (anon key). Read by couple. |
| `vendor_tokens` | `token` (PK), `couple_id`, `vendor_name`, `sections TEXT[]`, `expires_at` | RLS: couple manages own; public reads by token |
| `photos` (Storage) | Path: `<user_id>/<photo_id>` | **⚠️ SELECT RLS policy still missing — cross-device photo sync broken** (parked P2) |

**Pending Supabase work (still from Session 7 backlog):**
```sql
-- P2: Add SELECT policy to photos storage bucket (run in Supabase dashboard → Storage → photos → Policies)
CREATE POLICY "Users can read own photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 4. Git State

```
Repository:   https://github.com/mandyjane/UnionVault
Live URL:     https://unionvault.app  (GitHub Pages, custom domain)
Branches:     main  (only branch — all work goes here)
Current:      main
Remote:       origin → https://github.com/mandyjane/unionvault  (note: GitHub redirects from lowercase)
```

### Recent commits (newest first)

```
9b32a0d  Add RSVP modal pop-up and editorial format style          ← HEAD (Session 8)
f594ded  RSVP: progressive disclosure flow + footer branding       ← Session 8
ba3523a  Replace shadow/card-edge buttons with continuous sliders
2776b78  Fix Background/Section theme colour mapping
2e5e7ad  Fix _showRsvpForm: hoist rsvp/rfields out of try block scope
aa3d1bc  Redesign guest RSVP form with clean card-based layout
d4a8eba  Add RSVP appearance & field settings to website builder
24ef242  Fix RSVP guest autocomplete returning empty list
2641217  Fix section shadows/bevel by using <main> wrapper
28fd44e  Fix section/background colour separation
```

---

## 5. Recent Code Updates (Sessions 6–8)

### Session 6 — Cloud auto-sync, custom domain, footer logo

See `CLAUDE_CODE_CONTEXT.md §3 Session 6` for the exact `_lpSignIn()` and `_autoSyncCheckOnBoot()` code. SW bumped through v11→v13.

### Session 7 — Cross-account privacy, sidebar collapsed icon, flash fix, hero space

See `CLAUDE_CODE_CONTEXT.md §3 Session 7` for the exact code of all four changes. SW bumped v92→v95. This is the most security-critical change — the `uv_uid` boot guard prevents one user's data from leaking to another account.

### Session 8 — RSVP form redesign, website builder expansion

**All changes are in `index.html` and `sw.js`. SW bumped v95→v147 across multiple sub-session deployments.**

#### 8a — RSVP form card redesign
- Full visual overhaul: clean card-based layout (`rf-card`, `rf-lbl`, `rf-inp`, `rf-pills`, `rf-diet-chip`, `rf-submit`)
- Removed old layout; CSS block starts with `.rf-page`, `.rf-header`, `.rf-form`
- UV logo removed from RSVP page top; moved to footer as "Powered by [UV logo] UNION VAULT"

#### 8b — RSVP progressive disclosure
- **Name card** always visible
- **Attendance card** (`#rf-attend-card`) hidden until `_rfPickName()` is called
- **Contact group** (`#rf-contact-group`) hidden until `_rfSetAttend('yes')` — only shown for attending guests
- **Submit button** (`#rf-submit`) hidden until attendance is set (shows for both yes and no)
- `_rfAttending` module-level variable (let) tracks current selection

#### 8c — Website builder: Format Style picker
Added to top of Layout tab body:
- **FORMAT STYLE** section with two clickable card-style pickers: "Modern" and "Editorial"
- Stored as `STATE.website.theme.format` via `_wbSet('format', 'modern'|'editorial')`
- Normalised in `_wbSite()`: `if(!['modern','editorial'].includes(t.format)) t.format='modern'`

#### 8d — Website builder: RSVP Display picker  
Added to Layout tab body (after card edge slider):
- **RSVP DISPLAY** section with two clickable card-style pickers: "Pop-up" and "New Page"
- Stored as `STATE.website.theme.rsvpMode` via `_wbSet('rsvpMode', 'modal'|'page')`
- Normalised in `_wbSite()`: `if(!['modal','page'].includes(t.rsvpMode)) t.rsvpMode='modal'`

#### 8e — Editorial format CSS in generated site
In `_wbBuildSite()`, immediately before `${_wbCssSafe(t2.css)}`:
```js
${t2.format==='editorial' ? `
  h2{font-style:italic!important;font-weight:300!important;letter-spacing:.02em}
  h2::after{content:'';display:block;width:36px;height:1px;background:${t2.accent};
    opacity:.65;margin:${sp(10)}px auto 0}
  section.lft h2::after,section.b-left h2::after{margin-left:0;margin-right:auto}
  .intro{font-weight:300;letter-spacing:.03em}
` : ''}
```

#### 8f — RSVP modal in generated site
In `_wbBuildSite()`, just before `return`, several variables are computed:
- `_uvRsvp`, `_uvRfields` — from `w.rsvp`
- `_uvCoupleId` — from `_wbPublicOwnerUid || _sbSession.user.id`, HTML-escaped
- `_uvGuestJson` — A-list guest names as JSON, `'` → `&#39;`
- `_uvBtnYes`, `_uvBtnNo` — button label text, HTML-escaped
- `_uvDietHtml` — dietary chip HTML string
- `_uvModal` — the full modal HTML+CSS+JS string (or `''` if not modal mode or no couple ID)

In the return template, `${_uvModal}` is placed between `</footer>` and the nav `<script>` block.

---

## 6. Resolved Issues

### ✅ RSVP autocomplete empty list
Guest names were not loading because Supabase fetch inside `_showRsvpForm` was in a `try` block that declared `rsvp` and `rfields` in its scope — the variables were inaccessible after the block. Fixed by hoisting declarations before the try.

### ✅ Section/background colour confusion  
`t2.background` and `t2.page` were being used inconsistently. Fixed the colour mapping so `background` = the outer page body colour and `page` = the section panel colour.

### ✅ Section shadow/bevel not applying
Shadows and bevel were being applied to `section` elements that share the same background as `main`. Added a `<main>` wrapper with its own background so sections visually float over it.

### ✅ Shadow/card-edge sliders
Replaced discrete step buttons with smooth `<input type="range">` sliders for `shadow` (0–100) and `cardStyle` (0–100), handled by `_wbNum(field, val)`.

### ✅ RSVP progressive disclosure
See §5 section 8b above.

### ✅ RSVP modal in generated site
See §5 section 8f above. The generated site now includes all RSVP logic self-contained — no separate page load, no dependency on the parent app.

### ✅ Editorial format toggle
See §5 sections 8c and 8e. Adds italic serif + thin rule style without changing any HTML — pure CSS via `h2::after`.

---

## 7. Immediate Action Plan

### Step 1 — Verify the two new builder features work end-to-end
Open the builder and confirm:

1. **Format Style picker** (Layout tab, top) — clicking "Editorial" should:
   - Highlight the Editorial card
   - Regenerate the preview site with italic h2 headings + thin accent-coloured rule after each h2
   - Clicking "Modern" should revert

2. **RSVP Display picker** (Layout tab, after card edge slider) — clicking "Pop-up" should:
   - Highlight the Pop-up card
   - When the generated site's RSVP button is clicked, a bottom-sheet should slide up from the bottom (not navigate to a new page)
   - The bottom-sheet should contain the name search → attendance → contact fields flow
   - Tapping outside or × should close and reset the form
   - Clicking "New Page" should revert the RSVP button to a standard link

Both pickers use `_wbSet(field, val)` and are stored in `STATE.website.theme`. The builder preview updates immediately via `_wbRepaintTheme()` and the next `_wbBuildSite()` call.

### Step 2 — Pick up the most overdue parked item: Supabase Storage SELECT policy (P2)
This is the last blocker for cross-device photo sync. It has been deferred since Session 5.

Run this SQL via the Supabase MCP tool (`mcp__Supabase__execute_sql`, project ID `hzafdlfprtzfxtyaebmc`):
```sql
CREATE POLICY "Users can read own photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```
After applying: sign in on a second device/browser, upload a photo in Vision Board on device 1, then on device 2 navigate to Vision Board — the photo should appear (no amber banner, no manual retry needed).

### Step 3 — Remove the debug console.log from `_lpSignIn()` (P5)
This has been deferred since Session 2. It outputs auth data to the console.

Search for `console.log` near `_lpSignIn` (approximately line 44700–44900):
```
grep -n "console.log" index.html | grep -A2 -B2 "lpSign\|signIn\|sign_in"
```
Remove the offending line. This is a one-line change. Bump SW cache `v147 → v148`, commit and push.

---

## Parked Ideas Still Outstanding

From `CLAUDE_CODE_CONTEXT.md §4` — items NOT yet resolved as of Session 8:

| # | Item | Priority |
|---|---|---|
| **P1** | Hash routing boot intercept for public wedding site | Medium |
| **P2** | Supabase Storage SELECT RLS policy for `photos` | **High — blocking cross-device photos** |
| **P3** | VB wallpaper deduplication (move to GitHub assets) | Low |
| **P4** | Wedding site watermark branding check | Low |
| **P5** | Remove debug console.log from `_lpSignIn()` | Medium |
| **P6** | Test confirmation email on sign-up | Low |
| **P7** | Test RSVP flow end-to-end (QR → submit → confirmation) | Medium |
| **P10** | Move repo to its own GitHub org | Low |
| **P11** | Verify cross-account privacy fix in production (two-browser test) | Medium |

---

## Working Conventions (Reminder)

1. **Single branch `main`** — push directly: `git push -u origin main`
2. **SW cache bump** — every deploy increments `union-vault-vNN` → `union-vault-v(N+1)` in `sw.js`. Current: `v147`
3. **Preview before build** — for any visual/design change, show light + dark mockups and wait for Accept/Reject/Adjust before implementing
4. **Single file** — no imports, no build step. Fonts stay embedded
5. **Supabase MCP** — use `mcp__Supabase__execute_sql` with project ID `hzafdlfprtzfxtyaebmc` for all DB work
6. **`node --check index.html`** — does not work on HTML; use `node -e "eval(require('fs').readFileSync('index.html','utf8').replace(/.*<script>/s,'').replace(/<\/script>.*/s,''))"` or grep for syntax errors manually
7. **Park = log it** — if user says "park", add to the parked ideas table in `CLAUDE_CODE_CONTEXT.md §4` and confirm
