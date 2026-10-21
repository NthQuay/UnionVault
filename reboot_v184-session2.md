# Union Vault — Reboot Script (Session 2, v184)

**Date:** 2026-10-21  
**Session commits:** `dd78410` (current HEAD)  
**SW cache:** `union-vault-v8`  
**Repo:** `mandyjane/UnionVault` (GitHub Pages → `mandyjane.github.io/UnionVault`)

---

## What was built in this session

### 1 — Alert settings reorganisation
Moved 5 alert-related toggles from the **Display & Formatting** section into a new dedicated **Alerts & Notifications** section, inserted between Display & Formatting and Pop ups.

**New section structure:**
- Sub-label **Banners**: Task Alerts Banner, Payment Alerts Banner  
- Sub-label **Menu Icons**: Checklist Alert Icon in Menu, Budget Alert Icon in Menu, Seating Alert Icon in Menu

**Code locations:**
- `data-sect` on Display & Formatting section updated (~line 37423) — alert keywords removed
- Old alert toggle rows removed from Display & Formatting section
- New `<div class="settings-sect" data-sect="alerts notifications ...">` inserted between Display closing `</div>` and Pop ups section (~line 37592)
- `_SETTINGS_PAGE_MAP` (~line 37853) — added/updated entries for all 5 alert settings → page key `'alerts'`; added missing `'Seating Alert Icon in Menu'` entry

---

### 2 — Storage card: signed-in users see cloud card, signed-out see local meter

**Trigger:** User questioned relevance of the local storage meter now that files sync to Supabase.

**What changed:**
- `_storageMeterHtml()` (~line 43251): renamed heading "Storage on this device" → **"Local storage"**; removed the stale "The old 5 MB limit no longer applies." sentence
- New function `_cloudStorageCardHtml()` added (after `_storageMeterHtml`): shows cloud icon, file count, MB used, 1.5 GB limit, progress bar (gold → amber at 60% → red at 85%), status message, orphan sweep link
- Settings storage card HTML (~line 37755) updated to conditionally render:  
  - `_sbSession` truthy → `_cloudStorageCardHtml()`  
  - `_sbSession` falsy → original `_storageMeterHtml()` + sweep button block
- `_refreshStorageMeter()` updated to re-render the correct card depending on sign-in state

**Constants:**
```js
const _CLOUD_LIMIT_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB per user
```

**Data source:** Uses `_storageUsage()` which reads `MEDIA_META` (already populated at boot — no extra Supabase API call needed).

---

### 3 — Supabase Pro research (informational, no code change)

- Supabase Pro = 100 GB **total project storage** (not per-user)
- No native per-user quota enforcement
- Custom implementation would require tracking bytes per user in a DB table + checking before each upload
- **Decision:** Don't build now; display a 1.5 GB soft limit in the UI only; revisit with real usage data

---

### 4 — Toggle visibility fix (Chrome mobile)

**Bug:** On Chrome mobile, native checkbox inputs appeared as floating boxes at section headings (e.g. "Set Due Soon Alert", "Ceremony Details").

**Root cause:** Chrome mobile was rendering the native `<input type="checkbox">` even though the CSS set `opacity:0; width:0; height:0`. Needed `appearance:none` to fully suppress the native control.

**Fix:**
```css
/* Line 760 */
.toggle-switch input {
  opacity: 0; width: 0; height: 0;
  position: absolute;
  -webkit-appearance: none;   /* ← added */
  appearance: none;            /* ← added */
}
```

---

### 5 — Light mode fix on Chrome mobile (OS in dark mode)

**Bug:** Users who set app preference to Light Mode but have their phone OS in dark mode still saw dark colours in the app.

**Root cause:** The file has two dark-mode systems:
1. `body.dark` class — the app's own dark mode (correct)
2. `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` at lines 2769–2789 — intended for public RSVP pages; overrides `--ink`, `--cream`, `--border`, `--surface` on `:root`

When the app's light mode was active (`body.dark` removed), `data-theme` was never set on `<html>`, so the media query fired freely, overriding CSS variables even in light mode.

**Fix:** Set `data-theme="light"` on `<html>` whenever light mode is active. Three touch points:

```js
// toggleDarkMode() ~line 43614
function toggleDarkMode(on){
  document.body.classList.toggle('dark', on);
  if(on){
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme','light');
  }
  saveToStorage();
  // ... nav badge refreshes
}
```

```js
// loadFromStorage() ~line 43520
document.body.classList.toggle('dark', !!saved.darkMode);
if(saved.darkMode){
  document.documentElement.removeAttribute('data-theme');
} else {
  document.documentElement.setAttribute('data-theme','light');
}
```

```js
// Fresh-device init ~line 43768
if(!alreadySetUp && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
  document.body.classList.add('dark');
  // data-theme left unset — OS dark mode applies naturally
} else if(!alreadySetUp){
  document.documentElement.setAttribute('data-theme','light');
}
```

---

## Service worker cache history (this session)

| Version | Commit | Change |
|---|---|---|
| v6 | (previous session) | Alert settings reorganisation |
| v7 | (previous session) | Cloud storage card |
| **v8** | `dd78410` | Toggle fix + light mode fix |

---

## Current file state

| File | Location |
|---|---|
| `index.html` | `/home/claude/unionvault/index.html` (~44,400 lines) |
| `sw.js` | `/home/claude/unionvault/sw.js` — `union-vault-v8` |

---

## Architecture reminders

- **Single-file PWA** — everything (HTML, CSS, JS, base64 assets) in `index.html`
- **Dark mode:** `body.dark` class only (+ `data-theme` on `<html>` to guard media query)
- **Media:** blobs in IndexedDB (`uv_media`) as primary/sync read source; mirrored to Supabase `photos` bucket. `_mediaUrl()` returns blob: URLs from `MEDIA{}` map synchronously
- **Settings search:** `data-sect` attribute on `.settings-sect` divs; `_SETTINGS_PAGE_MAP` maps toggle labels to page keys for "By page" filter
- **Storage usage:** `_storageUsage()` reads `MEDIA_META` — already populated at boot
- **`_sbSession`:** live Supabase session object — gates signed-in vs signed-out rendering
- **⚠️ SECURITY:** Never clear cache/storage for the entire `mandyjane.github.io` domain — another app shares that origin

---

## Pending items (carry forward)

- [ ] Remove debug `console.log` from `_lpSignIn()` once cloud sync confirmed stable
- [ ] Vendor token generator UI (Vendors section)
- [ ] Update CHANGELOG and DECISIONS docs in project (done this session — see separate files)
- [ ] Supabase SQL still needed: `rsvp_responses` table, `vendor_tokens` table

---

## How to resume

1. Clone/pull `mandyjane/UnionVault` main
2. File is `/home/claude/unionvault/index.html`
3. SW cache is `union-vault-v8` — bump to `v9` on next deploy
4. Read this file + `CHANGELOG_v184-4.md` + `DECISIONS_v184-4.md` before starting
