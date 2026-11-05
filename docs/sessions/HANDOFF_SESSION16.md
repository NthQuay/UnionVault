# HANDOFF — Session 16
*Generated: 2026-11-05 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a wedding planning PWA. This file is the state dump from Session 16. Read it before doing anything. Cross-reference `CLAUDE.md` (root) for standing facts, `docs/CLAUDE_CODE_CONTEXT.md` for the architecture map, and `docs/sessions/HANDOFF_SESSION15.md` for the session before.

**The GitHub repository is `NthQuay/UnionVault`.** Start every session with `NthQuay/UnionVault` as the repository source. The old name `mandyjane/UnionVault` still redirects, but Session 16 ran against the old name and could not push to `NthQuay/UnionVault` because session access was granted for the old name only. A session can't attach both (same repo name, two owners), so a fresh session with NthQuay as the source is the fix. Push to `NthQuay/UnionVault`.

**Standing rules (never violate):**
- No build step, no bundler. `index.html` is the app shell; CSS in `css/`, JS in `js/`, loaded via `<script>` tags. New JS/CSS files go in the `SHELL` array in `sw.js`.
- Every deploy: bump `APP_BUILD` in `js/autocomplete.js` **and** `CACHE` in `sw.js` together.
- Visual changes: show a light + dark preview first, rendered with the real app code (Playwright against a local server, see §5), and wait for **Accept / Reject / Adjust** before merging.
- Deploy branch is `main` (GitHub Pages from `main` root, no Actions workflow).
- Never write `RESEND_API_KEY` into the repo (public repo). It is set as a Supabase secret; never ask for it.
- Paid/free checks in edge functions call `compute_tier(p_user_id)` via service role, never `user_profiles.tier`.
- Edge functions are deployed with `mcp__Supabase__deploy_edge_function`, file contents passed verbatim from disk, keeping each function's existing `verify_jwt`.

---

## 1. Infrastructure

- Supabase project `hzafdlfprtzfxtyaebmc` (ap-southeast-2)
- GitHub Pages at `https://unionvault.app`, auto-deploys from `main`
- **GitHub repo: `NthQuay/UnionVault`**
- Resend: `unionvault.app` verified; functions in `supabase/functions/`

---

## 2. Current Technical State

| Item | Value |
|---|---|
| Live build on `main` | `v475` (commit `915f730`) |
| Pending on branch `claude/loving-johnson-ler3w5` | commit `071b9d1`, **v476**, Wishing Well changes awaiting user Accept (see §4) |
| Edge functions (deployed, matching disk on `main`) | `send-guest-email` v21 (verify_jwt true), `send-appointment-email` v17 (true), `send-vendor-brief-email` v7 (true), `rsvp-confirm-email` v12 (false), `ww-email-details` v12 (false), `resend-webhook` v3 (false) |
| New table | `email_log` (migration `supabase/migrations/20261105_email_log.sql`, applied) |

---

## 3. Session 16 Changes (all live in v473–v475 unless noted)

### Email Design window (v473/v474)
- Accent colour circles shrink to stay on one row; label is now "Header font style".
- **Botanical template removed.** `_emailTplId()` maps anything not `modern` to `classic`. (The edge functions still accept `botanical` for old stored values; the app never sends it.)
- **Header font + Body font pickers**: ids stored in design `fontFamily` (header) and `bodyFont`: `serif` (Georgia), `palatino`, `sans-serif` (Helvetica), `trebuchet`. Every email function has `FONT_STACKS` and resolves both ids server-side.

### New email text editor (v474) — `js/comms.js`
- Contenteditable "styled as you type" editor (`_rteHtml`, `_rteMdToHtml`, `_rteHtmlToMd`, `_rteGet`, `_rteInitAll`). Stores the **same markdown format as before** (`**bold**`, `*italic*`, `__underline__`, `## ` intro line, `{tokens}`), so old templates load unchanged. Round-trip verified identical on all six default templates.
- Gold token chips; "Aa Intro" button; "＋ Insert" menu with tokens by friendly name plus **RSVP button** and **Website button**. These are stored as `{rsvp_button}` / `{website_button}` on their own paragraph.
- send-guest-email draws placed buttons from `ctaLinks` (https only). In plain text/SMS they become "RSVP here: url" / "Our wedding website: url" (`_ctaPlain` in `js/send-sheet.js`). If a button is placed, the automatic one is dropped (`_ctaDropPlaced`, `_tplHasBtn`). The website one is omitted if the site isn't published. New SMS token `{website}`.
- Edit / Preview tabs (preview renders the unsaved draft with the real function), folded "Tips", quieter "Reset to default". SMS editor has no B/I/U.
- Fixed-copy items (RSVP confirmation, Wishing Well, Appointment, Vendor brief) use the same editor (`_commsFieldHtml`).

### Send window fixes (v475) — `js/send-sheet.js`
- **Preview bug fixed:** the send window lives in the `confirm2` popup, and the preview used to replace it, so Close shut both. Preview now opens in its own overlay (`_ssShowPreview`, `_ssClosePreview`, z-index 1400); Back/×/Escape return to the send window.
- The email Message box now shows the message styled (`.ss-msg-styled`, via `_rteMdToHtml`) instead of raw `##`/`**`.

### Sent emails log (v475) — new `js/sent-log.js`
- Table `email_log` (couple_id, created_at, kind [`savedate|invite|reminder|vendor|appointment|confirm|ww|other`], automatic, subject, to_name, to_email, guest_id, from_name, resend_id, status [`sent|delivered|bounced|complained`], status_at, status_reason, html). RLS: couples SELECT/DELETE own rows only; inserts are service role.
- Each email function calls `logSent()` (best effort, never fails the send) after Resend accepts. Clients pass `logKind` + `toNames` (send-guest-email) / `toNames` (appointment, via `_apptNameForEmail` in `js/vendors.js`). RSVP confirmation and Wishing Well rows are `automatic: true`.
- `resend-webhook` now PATCHes `email_log` by `resend_id` on `email.delivered`, `email.bounced`, `email.complained` (a late "delivered" never overwrites a bounce). It still writes `email_issues` for bounces/complaints as before.
- UI: Communications has **Templates | Sent** tabs (`_commsTab`, `_commsSetTab`). Sent tab: search, filter chips (All / Save the date / Invite / Reminder / Vendors / Automatic), grouped by day, status pills. Row → details (`_slOpen`) with timeline, **View email** (fetches stored `html` on demand, shown via `_ssShowPreview`), **Send again** (reopens `_ssOpen` for the guest's slot), **Fix address** on bounces (opens Edit Guest). Edit Guest shows an "Emails sent" box (`_slGuestBoxHtml`/`_slGuestBoxFill`); its rows open details in the confirm2 layer so the guest form stays open.
- Only emails sent from v475 onward appear. Texts / own-mail-app sends are not included.

---

## 4. PENDING — awaiting user Accept (branch `claude/loving-johnson-ler3w5`, commit `071b9d1`, v476)

Wishing Well changes, built and screenshot-tested in light + dark, **not merged**:
1. Cash gifts: third tally **"thank-yous sent"** (`thanksSent` in `_wwTrackerHtml`, 3-column stat grid).
2. Cash gifts: **search box to the right of Sort** (`wwSearch` + `setWwSearch` in `js/wishingwell.js`; filters name, address, method, note; keeps focus; `.ww-search` styles in `css/app.css`).
3. Public preview: header cog hidden on that tab; **"Add details"** button at the top opens `openWwSettings()`. Modal and tooltips renamed **"Wishing well details"**. Cog remains on Cash gifts and Registry (asked the user whether to remove it everywhere — no answer yet).
4. Log a contribution: **no individual +1s** (in `_wwContribGroups`, guests with `relationship==='Plus One'`, a name starting "+1", or who are someone's `plusOneId` are skipped as individuals; attending plus-ones still appear paired with their host).

On Accept: merge `claude/loving-johnson-ler3w5` into `main` (it is `main` + `071b9d1`), push to `NthQuay/UnionVault`, confirm `main` HEAD. No edge-function or DB changes in this commit.

---

## 5. Testing pattern used this session

- `python3 -m http.server 8765` from the repo root; Playwright with `serviceWorkers:'block'`.
- In page: `_lpContinueOffline()`, hide `#setup-modal-overlay`, set `_uvTier='full'`, fake `_sbSession={access_token:'x',user:{id:'u',email:'a@b.c'}}`, `window._sbEnsureFreshToken=async()=>{}`, then `navigate(...)`. Dark mode: `document.body.classList.add('dark')`.
- Stub `*.supabase.co` with `page.route` (include CORS headers). To render real email HTML, load the edge-function source in Node with `serve`/`createClient`/`Deno.env` stubbed and route `functions/v1/<name>` to the real handler.
- This session's cloud container cannot reach `*.supabase.co` directly (proxy refuses), so live function calls can't be smoke-tested from the container.

---

## 6. Open items

| # | Item | Status |
|---|---|---|
| R1 | **Resend webhook must send `email.delivered`.** In Resend → Webhooks, tick `email.delivered` (plus bounced/complained) for the `resend-webhook` endpoint, and confirm `RESEND_WEBHOOK_SECRET` is set. Without it the Sent tab shows "Sent", never "Delivered". | User action — not confirmed |
| R2 | Confirm a real send appears in Communications → Sent | Verify after first real send |
| P3 | VB wallpaper deduplication — extract ~175 KB base64, serve from `/assets/` | Pending user upload |
| P5 | Remove debug `console.log` from `_lpSignIn()` | Parked |
| P7 | Test public RSVP flow end-to-end | Parked |
| P11 | Verify cross-account privacy fix in production | Verify |

(P10 "move repo to its own org" is done: the repo is `NthQuay/UnionVault`.)

---

## 7. Immediate Action Plan

1. Make sure this session's repository source is **`NthQuay/UnionVault`** and `git remote get-url origin` points there.
2. Ask the user for Accept / Reject / Adjust on the §4 Wishing Well changes (screenshots were sent in Session 16). On Accept, merge branch `claude/loving-johnson-ler3w5` → `main` as v476 and push.
3. Remind the user about R1 if "Delivered" statuses aren't showing.
