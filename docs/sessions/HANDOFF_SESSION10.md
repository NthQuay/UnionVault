# Session Handoff — 30 October 2026

> Cross-reference: `docs/CLAUDE_CODE_CONTEXT.md` for full architecture, DB schema, and standing constraints.

---

## Context & Project Scope

UnionVault is a single-file PWA (`index.html`, ~50 k lines) served via GitHub Pages from the `main` branch of `mandyjane/UnionVault`. No build step. Supabase backend (project `hzafdlfprtzfxtyaebmc`, ap-southeast-2). Every deploy requires bumping `APP_BUILD` in `index.html` AND `CACHE` in `sw.js` together.

This session focused entirely on the **public RSVP overlay wizard** (3-step modal, `_uvModal` built inside `_wbBuildSite()`). No backend/schema changes were made.

---

## Current Technical State

| Item | Value |
|---|---|
| Live build | `v369` |
| `APP_BUILD` | `'v369'` (index.html ~line 29615) |
| `CACHE` | `'union-vault-v369'` (sw.js line 1) |
| Service worker | `sw.js` — cache-first, shell `['/', '/index.html']` |
| Branch | `main` |
| Latest commit | `dc8c4a3` — "v369 — fix Yes/No pill text wrap + meal chip handler" |

Two RSVP forms exist in the codebase — do not confuse them:

1. **Overlay wizard** (`_uvModal`, ~line 38331): 3-step modal shown inline on the wedding page. CSS lives inside a JS template literal using `${t2.*}` and `${_uvPal.*}` palette vars.
2. **Standalone RSVP page** (`rw-` form, ~line 49700+): separate URL. Uses CSS custom properties (`--rw-*`). This form is the **reference design** the overlay should match.

---

## Supabase Database Schema Changes

**None in this session.** All Supabase schema is unchanged. Standing facts from `CLAUDE_CODE_CONTEXT.md` still apply:

- `RESEND_API_KEY` edge function secret is set — never write it into any file.
- Public pages read via RPCs `public_wedding_extras(uid)` and `vendor_brief(token)`.
- Storage `photos` SELECT RLS policy exists.
- Edge functions deployed: `send-appointment-email`, `send-guest-email`, `rsvp-notify`.

---

## Git State

```
Branch:         main
Remote:         origin → github.com/mandyjane/UnionVault
Latest commit:  dc8c4a3  v369 — fix Yes/No pill text wrap + meal chip handler
Previous:       660c0e6  v368 — fix RSVP overlay close on autocomplete name pick
Working tree:   CLEAN — nothing uncommitted
```

---

## Recent Code Updates

### v368 (commit `660c0e6`)
- **Bug fixed:** RSVP overlay closed when user selected a name from the autocomplete dropdown.
- **Root cause:** `#rf-ac` (autocomplete list) was a child of `#uv-rsvp-overlay`; clicking an item bubbled to the overlay's `onclick="if(event.target===this)_uvCloseRsvp()"` and closed it.
- **Fix:** Moved `#rf-ac` from inside `#uv-rsvp-overlay` to a sibling element after it. Reverted earlier `setTimeout` and `ontouchstart` timing hacks added in v366–v367 — they were masking the structural problem.

### v369 (commit `dc8c4a3`)
- **Bug 1 fixed:** `.member-row .rf-pill` — "✓ Yes" was wrapping to two lines (checkmark stacked above "Yes"). Added `white-space:nowrap` (~line 38382).
- **Bug 2 fixed:** Meal chip `onclick` attribute in the template literal (lines 38308 & 38312) called `_rfPickMeal(this)`, which looks for `.rf-meal-chips` — but the overlay's container class is `.rf-chips`. Selection was silently failing for all guests. Changed attribute to `window._chooseMeal(this)` which uses the correct container selector.
  - Key insight: `_renderDining()` assigned `.onclick` as a DOM property after cloning the template, but `wrap.innerHTML` serialises DOM to HTML string — DOM property assignments are NOT preserved, only HTML attributes survive. The fix had to be in the template literal attribute itself.

---

## Resolved Issues (this session)

| Issue | Fix | Commit |
|---|---|---|
| Autocomplete overlay close on iOS and desktop | Structural DOM move of `#rf-ac` | v368 `660c0e6` |
| "✓ Yes" pill button text wrapping to 2 lines | `white-space:nowrap` on `.member-row .rf-pill` | v369 `dc8c4a3` |
| Meal chips unclickable for adults and children | Template attribute `onclick` changed to `window._chooseMeal(this)` | v369 `dc8c4a3` |

---

## Immediate Action Plan — Next 3 Steps

### Step 1 — v370: Dietary section design (AWAITING USER APPROVAL)

A before/after preview was shown to the user at end of session. User must say **Accept**, **Reject**, or **Adjust** before any code is written (CLAUDE.md: visual changes require preview approval first).

**What the change is:** The RSVP overlay wizard's dietary requirements section currently shows a `<details>` element with a border box and round pill chips. It was changed without approval at some point (believed v363). The standalone form uses a chevron-accordion toggle (no border box) + checkbox-style chips with a 13×13 `rf-chk` square. The overlay must be restored to match.

**Exact files and lines to change (in `index.html`):**

```
~line 38366–38367  — #uv-rsvp-sheet .rf-diet-chip / .on CSS rules (higher specificity, must be updated)
~line 38389–38395  — .diet-details / .diet-body / .rf-diet-chip global rules (replace entirely)
~line 38539        — chip HTML in _renderDining() — add <span class="rf-chk"> SVG checkmark </span>
~line 38542        — dietary wrapper — replace <details class="diet-details"> with
                     <div class="uv-diet-acc"> + <button class="uv-diet-tog"> chevron toggle
```

New CSS to add (adapt `rw-` vars to `${t2.*}` / `${_uvPal.*}` template vars):

```css
.uv-diet-acc{margin-top:12px}
.uv-diet-tog{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:none;padding:8px 0;font-size:13px;color:${t2.heading};opacity:.8;cursor:pointer;user-select:none;font-family:inherit}
.uv-diet-chevron{transition:transform .2s;flex-shrink:0}
.uv-diet-acc.open .uv-diet-chevron{transform:rotate(180deg)}
.uv-diet-body{display:none;padding-top:8px}
.uv-diet-acc.open .uv-diet-body{display:block}
.rf-diet-chip{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;border:1.5px solid ${t2.heading}28;background:transparent;font-size:12.5px;color:${t2.text};cursor:pointer;transition:all .15s;user-select:none;-webkit-user-select:none;margin:3px}
.rf-diet-chip.on{background:${_uvPal.accent}1e;border-color:${_uvPal.accent}}
.rf-chk{width:13px;height:13px;border-radius:3px;border:1.5px solid ${t2.heading}28;background:transparent;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.rf-diet-chip.on .rf-chk{background:${_uvPal.accent};border-color:${_uvPal.accent};color:${_uvPal.ink}}
.rf-chk svg{visibility:hidden}.rf-diet-chip.on .rf-chk svg{visibility:visible}
```

**Important:** there are TWO `.rf-diet-chip` rules — one scoped to `#uv-rsvp-sheet` (~line 38366, higher specificity) AND one global (~line 38394). BOTH must be updated to show the new design.

### Step 2 — Bump to v370 and push

After user approves the dietary preview:
- `APP_BUILD` → `'v370'`
- `CACHE` → `'union-vault-v370'`
- Commit and `git push -u origin main`

### Step 3 — Standing rule reinforcement

Before touching ANY future piece of the RSVP UI, re-read CLAUDE.md rule: **"Visual changes: light + dark preview first, wait for Accept / Reject / Adjust."** This constraint was violated when the dietary section was changed in a prior session without approval — it must not happen again.

---

## Standing Constraints (verbatim from CLAUDE.md)

- Single file `index.html`, no build step, no imports. Branch `main` only.
- Bump `APP_BUILD` in `index.html` AND `CACHE` in `sw.js` together on every deploy.
- Visual changes: **light + dark preview first, wait for Accept / Reject / Adjust.**
- Never write `RESEND_API_KEY` into any repo file — the repo is public.
- Repo root: only what the live site / Supabase needs. `docs/` for reference.
