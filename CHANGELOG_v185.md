# CHANGELOG — UnionVault v185 (Session 5)

**Date:** 2026-10-22  
**SW cache:** `union-vault-v10` → bump to `union-vault-v11` on next deploy  
**File size:** ~4.6 MB → ~3.52 MB (−950 KB this session)

---

## Changes

| # | What | Was | Now |
|---|---|---|---|
| 1 | Vision Board toolbar — mobile overflow | Inner flex container used `margin-left:auto` causing buttons to clip off left edge on narrow screens | Outer container: `flex-wrap:wrap; overflow-x:auto`. Inner: `flex:1; justify-content:flex-end; flex-wrap:wrap; min-width:0` |
| 2 | VB toolbar — mobile label collapse | Text labels always shown ("Images", "Small ▼", "Scrapbook ▼") | `@media(max-width:520px)`: `.vb-trigger-label` and `.vb-captions-label` hidden; `.vb-captions-icon` SVG shown instead; `.vb-layout-trigger` padding reduced |
| 3 | Missing photos banner | No user feedback when cross-device photos not yet loaded | Amber info banner injected at top of VB when photos referenced but missing from `MEDIA`. Shows count + "Retry" button |
| 4 | `_vbPhotoRetry()` | Did not exist | Async function: collects missing photo IDs from STATE, calls `_sbPhotoFetch(id)` for each, re-renders page. Called from retry banner. |
| 5 | Embedded base64 logos | 12 PNG logos embedded as base64 strings (~950 KB total) | Replaced with `raw.githubusercontent.com/mandyjane/UnionVault/main/Logos/` URLs. See logo table in reboot script. |
| 6 | Nav crest — dark mode | All four nav logo `<img>` tags pointed to `Black%20logo%20(Light%20mode).png` | Light crest: `Black%20logo%20(Light%20mode).png` · Dark crest: `White%20logo%20(Dark%20mode).png` |
| 7 | Nav wordmark | Was showing crest mark ("UV") on right side of divider in both themes | Light wordmark: `Black%20text%20(Light%20mode).png` · Dark wordmark: `White%20text%20(Dark%20mode).png` |

---

## Files Delivered

| File | Contents |
|---|---|
| `UnionVault - mobile toolbar + photo sync.html` | Fixes #1–4 |
| `UnionVault - linked logos.html` | Fixes #1–5 (cumulative) |
| `UnionVault - nav logo text fix.html` | Fixes #1–7 (cumulative) — **most recent / deploy this one** |

---

## Still Embedded (Intentional)

- **Fonts** (~300 KB, lines 33–45): Kept embedded for PWA offline support
- **VB wallpapers** (~233 KB, lines 3642–3643): Not yet in repo; still embedded

---

## Pending

- Add Supabase Storage SELECT policy for `photos` bucket (cross-device sync prerequisite)
- Move VB wallpapers to `/assets` repo folder to further reduce file size
- Bump SW cache to `union-vault-v11` on deploy
- Remove debug `console.log` from `_lpSignIn()` (deferred since Session 2)
