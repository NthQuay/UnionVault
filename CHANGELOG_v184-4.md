# CHANGELOG — Union Vault v184 (Session 2)

**Date:** 2026-10-21  
**Commits:** `dd78410`  
**SW cache:** `union-vault-v7` → `union-vault-v8`

---

## Changes

| # | What | Was | Now |
|---|---|---|---|
| 1 | Alert settings — grouping | Task Alerts Banner, Payment Alerts Banner scattered in Display & Formatting; Checklist/Budget/Seating Alert Icons also in Display | All 5 moved to new dedicated **Alerts & Notifications** section |
| 2 | Alerts & Notifications section | Did not exist | New `settings-sect` inserted between Display & Formatting and Pop ups; sub-labels "Banners" and "Menu Icons" |
| 3 | Display & Formatting `data-sect` | Included alert keywords | Alert keywords removed |
| 4 | `_SETTINGS_PAGE_MAP` | Missing `'Seating Alert Icon in Menu'`; alert toggles mapped to various keys | All 5 alert toggles mapped to `'alerts'`; Seating entry added |
| 5 | Storage card (signed in) | Local storage meter shown regardless of sign-in state | Signed-in users see **Cloud Storage card** (file count, MB used, 1.5 GB limit, progress bar) |
| 6 | Storage card (signed out) | Heading "Storage on this device"; included stale "The old 5 MB limit no longer applies." | Heading renamed **"Local storage"**; stale 5 MB sentence removed |
| 7 | `_cloudStorageCardHtml()` | Did not exist | New function — renders cloud storage summary for signed-in users |
| 8 | `_refreshStorageMeter()` | Always refreshed local meter | Refreshes cloud card if signed in, local meter if signed out |
| 9 | Cloud storage limit | N/A | **1.5 GB per user** (`_CLOUD_LIMIT_BYTES`) |
| 10 | Progress bar thresholds | N/A | Gold (normal), amber (≥60%), red (≥85%) |
| 11 | `.toggle-switch input` CSS | `opacity:0;width:0;height:0;position:absolute` | Added `-webkit-appearance:none;appearance:none` |
| 12 | `toggleDarkMode()` | Only toggled `body.dark` | Also sets/removes `data-theme="light"` on `<html>` |
| 13 | `loadFromStorage()` | Only toggled `body.dark` on restore | Also sets/removes `data-theme="light"` on `<html>` |
| 14 | Fresh-device init | Added `body.dark` if OS in dark mode only | Added `data-theme="light"` if OS NOT in dark mode |
| 15 | SW cache | `union-vault-v7` | `union-vault-v8` |

---

## Detail: Alerts & Notifications section

New section HTML skeleton:
```html
<div class="settings-sect" data-sect="alerts notifications task alerts banner 
  payment alerts banner checklist alert icon menu budget alert icon menu 
  seating alert icon menu banners menu icons overdue due soon warning">
  <div style="font-family:'Cormorant Garamond',...">Alerts &amp; Notifications</div>
  <div class="settings-sublabel" data-settings-sub="banners">Banners</div>
  <!-- Task Alerts Banner -->
  <!-- Payment Alerts Banner -->
  <div class="settings-sublabel" data-settings-sub="menu icons">Menu Icons</div>
  <!-- Checklist Alert Icon in Menu -->
  <!-- Budget Alert Icon in Menu -->
  <!-- Seating Alert Icon in Menu -->
</div>
```

---

## Detail: Cloud storage card

`_cloudStorageCardHtml()` reads from `_storageUsage()` — no extra Supabase API call:
- `u.files` → file count stat
- `u.mediaBytes` → bytes used stat
- Compares against `_CLOUD_LIMIT_BYTES = 1.5 * 1024 * 1024 * 1024`
- Progress bar colour: gold → amber (≥60%) → red (≥85%)
- Orphan sweep link inline (same function as the button in signed-out view)

---

## Detail: Light mode / dark OS fix

The file has two dark-mode systems:
1. **App dark mode:** `body.dark` class (controlled by user preference)
2. **Public-page dark variables:** `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` (~line 2769)

System 2 overrode `--ink`, `--cream`, `--border`, `--surface` on phones in OS dark mode even when the app was in light mode, because `data-theme` was never set on `<html>`.

Fix: `data-theme="light"` is now set on `<html>` whenever light mode is active (3 touch points: `toggleDarkMode`, `loadFromStorage`, fresh-device init). The `:root:not([data-theme="light"])` guard then correctly suppresses the media-query override.

---

## What was NOT changed
- Public RSVP page dark mode (`@media (prefers-color-scheme: dark)` block at ~line 2769) — logic preserved; only the app now correctly sets `data-theme="light"` to gate it
- All other Settings sections
- Supabase integration, sync engine, media upload/download
