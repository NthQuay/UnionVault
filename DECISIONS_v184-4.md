# DECISIONS — Union Vault v184 (Session 2)

**Date:** 2026-10-21

---

## D18 — Alert settings: dedicated section vs sub-labels in Display

**Decision:** New dedicated **Alerts & Notifications** section (Option B).  
**Alternatives considered:**
- Option A: Keep in Display & Formatting, use "Alerts — Banners" and "Alerts — Menu Icons" sub-labels  
**Reason for B:** More prominent and scannable. All alert-related toggles in one place. Cleaner than making Display & Formatting even longer. Adds one section to the settings list but is clearly named so easy to find.

---

## D19 — Local storage card for signed-in users

**Decision:** Hide the local storage meter for signed-in users; show a **Cloud Storage card** instead.  
**Reason:** The local storage meter is misleading for signed-in users — their files are durably stored in Supabase, not limited to local browser storage. Showing a local meter against a browser quota (which can vary wildly) is irrelevant and confusing.  
**Note:** Local storage is still used as a performance cache (blob: URLs from IndexedDB for synchronous reads) but this is an implementation detail, not something users need to manage.

---

## D20 — Cloud storage limit: 1.5 GB per user (soft limit, display only)

**Decision:** Display a 1.5 GB per-user limit in the UI; do not enforce it server-side.  
**Context:** Supabase Pro = 100 GB total project storage with no native per-user quota feature. Enforcing per-user quotas would require a custom bytes-tracking table and upload pre-check.  
**Reason for soft limit only:** Real usage data not yet available. A display-only limit informs users without the engineering cost of enforcement. Revisit when real usage patterns emerge.  
**Threshold:** 1.5 GB = `1.5 * 1024 * 1024 * 1024` bytes.

---

## D21 — Progress bar thresholds for cloud storage

**Decision:** Gold (normal) → amber at 60% → red at 85%.  
**Reason:** Gives users meaningful early warning before hitting the limit. 85% is the point where action is needed; 60% is a gentle heads-up. Standard convention for storage indicators.

---

## D22 — Toggle CSS: add appearance:none

**Decision:** Add `-webkit-appearance:none; appearance:none` to `.toggle-switch input`.  
**Reason:** Chrome mobile was rendering a native checkbox control that bled through the custom toggle even with `opacity:0; width:0; height:0`. The `appearance` property fully suppresses the native widget in Webkit/Blink engines.  
**Impact:** No visual change on desktop or non-Webkit browsers. Fixes the floating checkbox artefact on Chrome mobile.

---

## D23 — Light mode fix: set data-theme="light" on <html>

**Decision:** Sync `data-theme="light"` on `document.documentElement` whenever the app's light mode is active.  
**Reason:** The file contains `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` blocks (~line 2769) used by the public RSVP page dark mode. These fire on any phone with OS dark mode enabled, overriding `--ink`, `--cream`, `--border`, `--surface` even when the user has chosen light mode in the app. Setting `data-theme="light"` on `<html>` makes the `:root:not([data-theme="light"])` guard work as intended.  
**Alternative considered:** Restrict the media query blocks to `.vlu-page` or a public-page wrapper class. Rejected because the existing public page shell injects into `<body>` and scoping to a class would require changes across all the public page rendering functions.  
**Touch points:** `toggleDarkMode()`, `loadFromStorage()`, fresh-device init block.  
**Dark mode behaviour unchanged:** When dark mode is active, `data-theme` is removed from `<html>`, so the media query applies naturally (as before).

---

## D24 — Supabase per-user storage enforcement: defer

**Decision:** Do not build per-user storage enforcement at this stage.  
**Context:** Supabase Pro provides 100 GB total project storage but no native per-user quota mechanism. Custom enforcement would require: (a) a `user_storage_bytes` table, (b) summing bytes per user before each upload, (c) returning an error to the uploader.  
**Reason to defer:** No real usage data yet. The complexity of enforcement isn't justified until there's evidence of users hitting limits. The 1.5 GB display limit (D20) provides a UX nudge in the meantime.
