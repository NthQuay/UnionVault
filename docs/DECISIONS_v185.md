# DECISIONS — UnionVault v185 (Session 5)

**Date:** 2026-10-22

---

## D29 — Mobile VB toolbar: wrap + min-width over overflow-x scroll

**Decision:** Fix the Vision Board toolbar mobile overflow by switching to `flex-wrap:wrap; flex:1; min-width:0` on the inner container rather than making the toolbar horizontally scrollable.  
**Alternatives considered:**
- Option A: `overflow-x:auto` on the toolbar (horizontal scroll). Rejected — hidden controls are worse UX than wrapping.
- Option B (chosen): Wrap to a second line if needed, collapse text labels to icons at ≤520px so three controls fit in one row.  
**Reason:** Icon-only at mobile widths is the standard pattern (keeps controls visible and tappable). Wrapping is a last resort if icons still don't fit.

---

## D30 — Mobile VB toolbar: icon fallback at ≤520px

**Decision:** At `max-width:520px`, hide `.vb-trigger-label` and `.vb-captions-label` text labels; show `.vb-captions-icon` SVG instead. Padding on `.vb-layout-trigger` reduced from ~10px to 6px/9px.  
**Reason:** Three controls ("Images toggle", "Size ▼", "Layout ▼") with text labels are too wide for a typical phone screen (360–390px). Icon-only reduces the row to ~130px total, leaving comfortable space.  
**CSS added after `.vb-layout-item.active{background:#2C2C32}` block.**

---

## D31 — Missing photos: amber banner + retry, not silent

**Decision:** When VB renders and some `it.image` IDs are not in `MEDIA` (not local blob, not URL, not data URI), show an amber info banner at the top of the board with a count and "Retry" button. Do not auto-retry on every render (would cause loop).  
**Alternatives considered:**
- Silent retry on render. Rejected — causes infinite re-render loop if fetch fails.
- Spinner overlay. Rejected — blocks the board; user may have some photos loaded and want to see them.  
**Reason for banner:** Non-blocking; gives the user agency; makes the cloud sync state visible instead of silently broken.

---

## D32 — Logo deduplication: link to repo, not re-embed

**Decision:** Replace all 12 embedded base64 logo PNGs with `https://raw.githubusercontent.com/mandyjane/UnionVault/main/Logos/` URLs.  
**Tradeoffs accepted:**
- Logos will not display when the app is used offline (no network). Fonts remain embedded so the app is still functional; only the logo images go missing offline.
- If the repo is renamed or moved, logos break. Acceptable given the app is tied to this repo.  
**What was kept embedded:** Fonts (PWA offline requirement); VB wallpapers (not in Logos folder yet).  
**Result:** File size reduced ~950 KB (4.6 MB → 3.52 MB).

---

## D33 — Nav logo: separate crest and wordmark images, not a combined lockup

**Decision:** Retain the existing two-part nav logo (crest | divider | wordmark) using separate `<img>` tags with `-light`/`-dark` CSS class swaps, rather than using a single lockup image.  
**Reason:** Allows independent sizing of crest vs text. Existing CSS class infrastructure (`.nav-logo-mono-light`, `.nav-logo-wordmark-dark`, etc.) already handles the theme swap cleanly. The bug was simply that all four `src` attributes were pointing to the crest file instead of the text file for the wordmark slots.

---

## D34 — Nav wordmark: use text-only logo, not full lockup

**Decision:** The right-of-divider nav element uses `Black%20text%20(Light%20mode).png` / `White%20text%20(Dark%20mode).png` (text-only wordmark), not the full lockup (`Black%20full` / `White%20full`).  
**Reason:** The full lockup (crest + text) would duplicate the crest that already appears to the left of the divider. Text-only keeps the nav clean: `[crest] | [wordmark text]`.
