# HANDOFF — Session 12
*Generated: 2026-10-29 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a single-file PWA wedding planner. This file is the complete state dump from Session 12. Read it top to bottom before doing anything. Cross-reference `docs/CLAUDE_CODE_CONTEXT.md` for the full architecture map (line numbers, JS sections, CSS layout). That file's line map is from Session 7 — line numbers have drifted (the file is now ~50 K+ lines) but section order and comment markers are still accurate.

**Standing rules (never violate):**
- Single file: `index.html`. No build step, no imports, no bundler.
- Every deploy: bump `APP_BUILD` in `index.html` **and** `CACHE` in `sw.js` together.
- Visual changes: show light + dark preview in chat first. Wait for Accept / Reject / Adjust before implementing.
- Single branch: `main`. Push directly to `origin main`.
- Never write `RESEND_API_KEY` into the repo — it is public.
- `RESEND_API_KEY` is **already set** as a Supabase edge function secret (SHA256 digest starts `45658b6c3e93…`). Never ask the user for it.

---

## 1. Context & Project Scope

**UnionVault** is a wedding planning PWA for couples. Features include:
- Guest list management, household groupings, dietary/meal tracking
- Online RSVP (public form → `rsvp_responses` table → couple's dashboard)
- RSVP manager with invitation sending via Resend email
- Budget tracker, wishing well, appointments, checklist
- Mood board (vision board) with Supabase photo storage
- Public wedding site + vendor brief generator
- Automated cloud backups (`planner_backups` table, hourly pg_cron)

**Infrastructure:**
- Supabase project `hzafdlfprtzfxtyaebmc` (ap-southeast-2)
- GitHub Pages at `https://unionvault.app` (custom domain via CNAME, auto-deploys from `main`)
- Resend: `unionvault.app` domain verified; three edge functions deployed (see CLAUDE.md)

Cross-reference `docs/CLAUDE_CODE_CONTEXT.md` for:
- Full `index.html` line map (CSS, HTML, JS sections, STATE object)
- All nav page keys and render functions
- Supabase table list and RLS rules (accurate to Session 7; see Session 11 handoff for `planner_backups` addition)

---

## 2. Current Technical State

| Item | Value |
|---|---|
| `APP_BUILD` | `v347` |
| `sw.js` CACHE | `union-vault-v347` |
| GitHub repo | `https://github.com/mandyjane/UnionVault` |
| Live URL | `https://unionvault.app` |
| Working branch | `main` (only branch) |
| Latest commit | `bfb294a` — "v347: Online RSVPs list view — contact info on own sub-row" |
| Supabase project | `hzafdlfprtzfxtyaebmc` (ap-southeast-2) |

**`index.html` key line markers (approximate — use comment markers to locate exactly):**

| Section | Approx line | Comment marker |
|---|---|---|
| DOCTYPE + `<head>` | 1–28 | — |
| Embedded fonts (`ea-embedded-fonts`) | 29–46 | `<style id="ea-embedded-fonts">` |
| Main CSS | 47–2435 | `<style>` |
| Dark calendar CSS | 2436–2712 | FullCalendar overrides |
| HTML structure | 2713–3637 | `#app`, `#sidebar`, `#main-content`, `#welcome-overlay` |
| VB Wallpaper constants | 3638–3644 | `const VB_WALLPAPER_LIGHT` |
| `STATE` object | 3645–3824 | — |
| JS (all sections) | 3825+ | UTILS, NAV, DASHBOARD, EVENT DETAILS, GUESTS, RSVP, CHECKLIST, BUDGET, SEATING, INSPO, VISIONBOARD, WEBSITE, INVITATIONS, SETTINGS, AUTH, BOOT |
| `APP_BUILD` constant | ~29548 | `const APP_BUILD=` |

---

## 3. Supabase Schema (current — no changes this session)

### Tables

| Table | Purpose | RLS |
|---|---|---|
| `planner_data` | Per-section cloud sync (`user_id`, `section`, `data` jsonb, `updated_at`) | `auth.uid() = user_id` |
| `planner_backups` | Hourly automated backups (`id`, `user_id`, `created_at`, `data` jsonb) | Authenticated user reads/inserts/deletes own |
| `rsvp_responses` | Online RSVP form submissions (`couple_id`, guest fields, `created_at`) | Couple reads own; public inserts |
| `vendor_tokens` | Per-vendor tokenised share links (`token`, `couple_id`, `vendor_name`, `sections TEXT[]`, `expires_at`) | Couple manages own; public reads by token |
| `photos` (Storage) | Vision Board images (`<user_id>/<photo_id>`) | Full SELECT + manage policies exist (P2 resolved in CLAUDE.md) |

### RPCs (anon-safe)

| Function | Returns | Notes |
|---|---|---|
| `public_wedding_extras(uid)` | Guest names/groupings, meal settings, wishing well minus contributions | Used by public wedding site. Raw table rows never exposed to `anon`. |
| `vendor_brief(token)` | Vendor brief data | Used by tokenised vendor share link |

### pg_cron job (ID: 1)

Fires every hour: `SELECT public.create_user_backup(user_id) FROM (SELECT DISTINCT user_id FROM public.planner_data) u`
Keeps the 48 most recent snapshots per user.

### Edge functions (deployed, `supabase/functions/`)

| Function | From address | Auth |
|---|---|---|
| `send-appointment-email` | `<couple names> <appointments@unionvault.app>` | Signed-in only |
| `send-guest-email` | `<couple names> <invites@unionvault.app>` | Signed-in only |
| `rsvp-notify` | — (alerts couple on new RSVP) | Service role (called from public RSVP form) |

All three use `RESEND_API_KEY` edge function secret. All send branded HTML email built server-side from escaped plain text — never accept raw HTML from client.

---

## 4. Git State

```
Branch:  main (only branch)
Remote:  https://github.com/mandyjane/UnionVault

Recent commits (this session):
bfb294a  v347: Online RSVPs list view — contact info on own sub-row
5560331  v346: fix Online RSVPs scroll and stat tile layout
b8e390e  v345: fix Online RSVP refresh flicker
5bbf8c1  v344: fix RSVP thank-you names, dark-mode cog backgrounds, transparent Event Details cog

Prior session tail:
967b05b  v343: Online RSVPs — sort by date (newest first) + max-height scrolling
a6a554b  v342: Move Meal Choice to its own widget card on RSVP & Invites page
a0ad270  v341: RSVP page — full light mode + serif eyebrow heading
```

All commits on `main`, pushed. GitHub Pages auto-deploys ~30s after push.

---

## 5. Recent Code Updates (Session 12)

### v344 — Three bug fixes

**1. RSVP thank-you screen — only showed one name for couples**

Function: `_rfSubmit()` (~line 50010)

Before: `dn.textContent = payloads[0].guest_name.split(' ')[0]` (first guest only)
After:
```js
if(dn){
  const firsts = payloads.map(p => p.guest_name.split(' ')[0]);
  const nameStr = firsts.length <= 2
    ? firsts.join(' & ')
    : firsts.slice(0, -1).join(', ') + ' & ' + firsts[firsts.length-1];
  dn.textContent = nameStr;
}
```

**2. Guest Response Tracker cog — light backgrounds in dark mode**

Function: `_inviteChanMenuHtml()` (~lines 10196–10198)

Bug: CSS used undefined `--sw-bg` variable, rendering as transparent (white) in dark mode.
Fix: Replaced all `--sw-bg` references with `--cream` and `--border` (both dark-mode aware).

```js
const btnStyle = `...background:var(--cream);border:.5px solid var(--border);...`;
```

**3. Event Details cog popup — transparent background**

Function: `_detOptsMenuHtml()` (~line 5772)

Bug: CSS used undefined `--card` variable (transparent in dark mode).
Fix: Replaced `--card` with `--cream` and `--border`:

```js
return `<div id="det-opts-menu" style="...background:var(--cream);border:1px solid var(--border);...">`;
```

---

### v345 — Online RSVP refresh flicker fix

**Root cause:** `_loadOnlineRsvps()` called `body.innerHTML = <big template>` on every Refresh. With `max-height:480px` on `#online-rsvps-body` (v343), the brief height collapse to ~0 caused a visible layout shift.

**Secondary cause:** On the sync path (`changed > 0`), `navigate('rsvp-mgr')` rebuilt the entire page, and the 80ms setTimeout in `renderRsvpMgr` called `_loadOnlineRsvps()` a second time — a double body-wipe.

**Fix 1 — stable sub-elements in `renderRsvpMgr` card (~line 13013):**

`#online-rsvps-body` now has persistent children — stat tiles with IDs, diet line, toolbar, list — that are never wiped:

```html
<div id="online-rsvps-body" style="font-size:13px;color:var(--muted);padding:6px 0">
  <div id="orsvp-stats" style="display:none;flex-direction:row;gap:16px;flex-wrap:wrap;margin-bottom:14px">
    <div ...><div id="orsvp-stat-yes">—</div><div>Attending</div></div>
    <div ...><div id="orsvp-stat-no">—</div><div>Declining</div></div>
    <div ...><div id="orsvp-stat-total">—</div><div>Total</div></div>
  </div>
  <div id="orsvp-diet-line" style="display:none;..."></div>
  <div id="orsvp-toolbar" style="margin-bottom:10px"></div>
  <div style="max-height:480px;overflow-y:auto">
    <div id="orsvp-list" style="display:flex;flex-direction:column;gap:10px"></div>
  </div>
  <span id="orsvp-msg" ...>Responses submitted via your public RSVP link will appear here...</span>
</div>
```

**Fix 2 — in-place stat update in `_loadOnlineRsvps()` (~line 12741):**

Replaced `body.innerHTML = ...` with targeted element updates:
```js
const statsEl = document.getElementById('orsvp-stats');
if(statsEl){
  document.getElementById('orsvp-stat-yes').textContent = yes;
  document.getElementById('orsvp-stat-no').textContent  = no;
  document.getElementById('orsvp-stat-total').textContent = total;
  statsEl.style.display = 'flex';
}
```

**Fix 3 — skip-flag on sync path (~line 12829 + renderRsvpMgr 80ms setTimeout ~line 13106):**

```js
// Before navigate():
window._orsvpSkipNextLoad = true;
navigate('rsvp-mgr');
return;

// In setTimeout:
if(!window._orsvpSkipNextLoad) _loadOnlineRsvps();
window._orsvpSkipNextLoad = false;
```

---

### v346 — Fix v345 regressions

**Bug 1 — scroll stopped working:** `overflow-y:auto;max-height:480px` was on `#orsvp-list` which is `display:flex`. Overflow on a flex container directly is unreliable — flex children ignore the container's `max-height`.

**Fix:** Added a plain block wrapper div around `#orsvp-list` to carry the scroll styles:
```html
<div style="max-height:480px;overflow-y:auto">
  <div id="orsvp-list" style="display:flex;flex-direction:column;gap:10px"></div>
</div>
```

**Bug 2 — stat tiles not rendering as a row:** `#orsvp-stats` static HTML had `display:none;gap:16px;flex-wrap:wrap` but no `flex-direction`. When JS set `display:flex`, default `flex-direction:column` was used.

**Fix:** Added `flex-direction:row` to the static `#orsvp-stats` style.

---

### v347 — Online RSVPs list view: contact info sub-row

**Before:** Email, phone, and address were joined with ` · ` and placed inline in the same `flex-shrink:0` right-side div as the RSVP date — cramped and hard to scan.

**Change in `_orsvpRender()` list view (~line 12673):**

Removed `contactLine` inline span. Added `contactRow` as a separate sub-row below the name header:

```js
const c = grp.contact;
const ci = [c.email, c.phone, c.address].filter(Boolean);
const contactRow = ci.length
  ? `<div style="display:flex;gap:16px;flex-wrap:wrap;padding:4px 14px 7px calc(14px + 28px + 8px);font-size:11px;color:var(--muted);background:var(--surface);border-bottom:1px solid var(--border)">
       ${ci.map(x => `<span>${x}</span>`).join('')}
     </div>`
  : '';
```

Name header row: contact info removed; date + histBtn remain in top-right. Header bottom-padding reduced to 4px and border-bottom removed when contact row is present (contact row carries the border). Cards with no contact info: unchanged.

---

## 6. Resolved Issues (Session 12)

| Issue | Root cause | Fix | Version |
|---|---|---|---|
| RSVP thank-you shows only one name | `payloads[0]` instead of mapping all guests | Map `payloads` to first names, join with `&` | v344 |
| Cog settings buttons white in dark mode | Used undefined CSS var `--sw-bg` | Replaced with `--cream` + `--border` | v344 |
| Event Details cog popup transparent | Used undefined CSS var `--card` | Replaced with `--cream` + `--border` | v344 |
| Online RSVP Refresh causes page flicker | `body.innerHTML` wipe + `max-height` on same container | Stable sub-elements; in-place stat updates | v345 |
| Second body-flash on new RSVP sync path | `navigate()` + redundant second `_loadOnlineRsvps()` | `window._orsvpSkipNextLoad` flag | v345 |
| Online RSVP list stopped scrolling (v345 regression) | `overflow-y` on `display:flex` is unreliable | Block wrapper div for scroll, flex child for layout | v346 |
| Stat tiles rendered as column (v345 regression) | Missing `flex-direction:row` on `#orsvp-stats` | Added `flex-direction:row` to static HTML | v346 |
| Contact info cramped next to date | All in one `flex-shrink:0` div | Contact fields on own sub-row below name | v347 |

---

## 7. Parked Ideas (carry forward from Session 11)

These are active backlog items — retrieve with "parked ideas":

| # | Item | Status |
|---|---|---|
| P3 | VB wallpaper deduplication — extract ~175 KB base64 from HTML, serve from `/assets/` | 🔄 Pending user upload to GitHub |
| P5 | Remove debug `console.log` from `_lpSignIn()` | 🅿️ Parked (deferred since Session 2) |
| P7 | Test public RSVP flow end-to-end (QR → form → submit → confirmation) | 🅿️ Parked |
| P10 | Move UnionVault repo to its own GitHub org (update all logo URLs in `index.html`) | 🅿️ Parked |
| P11 | Verify cross-account privacy fix in production (sign out of A, sign in as B — no data bleed) | 🔲 Verify |
| P12 | Split `index.html` into ES modules (dedicated session, not mixed with feature work) | 🅿️ Parked |

---

## 8. Immediate Action Plan (next 3 steps)

1. **No in-progress work** — Session 12 ended cleanly with v347 shipped and pushed. There is nothing half-finished.

2. **Next task is user-directed** — await the user's next request. Likely candidates based on recent context:
   - Any follow-up adjustments to the Online RSVPs list view (v347 is live; user may want tweaks)
   - Any new feature or bug report on another part of the app

3. **Before any visual change** — show light + dark mockup preview. Wait for Accept / Reject / Adjust. Do not implement directly.

---

## 9. Key Functions Quick-Reference (Online RSVPs — most recently touched)

| Function | Location | Purpose |
|---|---|---|
| `_orsvpRender()` | ~line 12594 | Renders RSVP groups in card OR list view |
| `_loadOnlineRsvps()` | ~line 12697 | Fetches responses from Supabase, updates stat tiles in-place, calls `_orsvpRender()` |
| `_orsvpSetFilter(f)` | ~line 12688 | Sets `window._orsvpFilter`, re-renders |
| `_orsvpSetView(v)` | ~line 12689 | Sets `window._orsvpView` (card/list), persists to localStorage |
| `_orsvpToggleHistory(btn)` | ~line 12690 | Toggles submission history panel for a group |
| `renderRsvpMgr()` | ~line 13013 (onlinersvps card) | Builds the stable `#online-rsvps-body` shell with stat tile IDs |

**Stable element IDs in `#online-rsvps-body`** (never wipe `#online-rsvps-body` innerHTML):

| ID | Purpose |
|---|---|
| `#orsvp-stats` | Stat tile row (flex, `display:none` until data loads) |
| `#orsvp-stat-yes` | "Attending" count |
| `#orsvp-stat-no` | "Declining" count |
| `#orsvp-stat-total` | "Total responded" count |
| `#orsvp-diet-line` | Dietary summary line (`display:none` when empty) |
| `#orsvp-toolbar` | Filter + view toggle toolbar |
| `#orsvp-list` | Flex-column list of household group cards (inside block scroll wrapper) |
| `#orsvp-msg` | "No responses yet" placeholder (hidden once data loads) |
