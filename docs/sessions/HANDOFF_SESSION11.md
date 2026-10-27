# HANDOFF — Session 11
*Generated: 2026-10-27 | Do not truncate or summarise this file.*

---

## 0. READ THIS FIRST

You are continuing development of **UnionVault**, a single-file PWA wedding planner. This file is the complete state dump from Session 11. Read it top to bottom before doing anything. Cross-reference `docs/CLAUDE_CODE_CONTEXT.md` for the full architecture map (line numbers, JS sections, CSS layout). That file's line map is from Session 7 — line numbers will have drifted slightly but the section order and comment markers are still accurate.

**Standing rules (never violate):**
- Single file: `index.html`. No build step, no imports, no bundler.
- Every deploy: bump `APP_BUILD` in `index.html` **and** `CACHE` in `sw.js` together.
- Visual changes: show light + dark preview in chat first. Wait for Accept / Reject / Adjust before implementing.
- Single branch: `main`. Push directly to `origin main`.
- Never write `RESEND_API_KEY` into the repo — it is public.

---

## 1. Context & Project Scope

**UnionVault** is a wedding planning PWA with:
- Guest management, RSVP tracking, budget, appointments, mood board, wishing well, and a public wedding-site generator
- A Supabase backend (project `hzafdlfprtzfxtyaebmc`, region `ap-southeast-2`) for auth, cloud sync, email, and backups
- Hosted on GitHub Pages at `https://unionvault.app` (custom domain via CNAME)
- All app logic lives in one file: `/home/user/unionvault/index.html` (~50 K lines)

Cross-reference `docs/CLAUDE_CODE_CONTEXT.md` for:
- Full line map of `index.html` (CSS, HTML, JS sections, STATE object)
- Nav page list and their JS render functions
- Supabase table list and RLS rules up to Session 7

---

## 2. Current Technical State

| Item | Value |
|---|---|
| `APP_BUILD` | `v306` |
| `APP_BUILD_DATE` | `2026-10-27` |
| `sw.js` CACHE | `union-vault-v306` |
| GitHub repo | `https://github.com/mandyjane/UnionVault` |
| Live URL | `https://unionvault.app` |
| Working branch | `main` (only branch) |
| Latest commit | `a961342` — "v306: stack backup buttons below text in cloud sync panel" |
| Supabase project | `hzafdlfprtzfxtyaebmc` (ap-southeast-2) |

**index.html architecture (as of v306):**
- Lines 1–28: DOCTYPE + `<head>` meta, favicons, manifest
- Lines 29–46: `<style id="ea-embedded-fonts">` — Cormorant Garamond, Lato, Montserrat (embedded, ~373 KB, do not convert to `<link>`)
- Lines 47–2435: Main `<style>` block — full app CSS
- Lines 2436–2712: Dark calendar CSS (FullCalendar overrides)
- Lines 2713–3637: HTML structure (`#app`, `#sidebar`, `#topbar`, `#main-content`, `#welcome-overlay`, `#lp-wrap`, modals)
- Lines 3638–3644: VB Wallpaper constants (base64 images)
- Lines 3645–3824: `STATE` object — default values for all app data
- Lines 3825+: All JavaScript (UTILS, NAV, DASHBOARD, BUDGET, GUESTS, RSVP, etc.)
- `APP_BUILD` constant is near line 29399

---

## 3. Supabase Schema Changes (Session 11)

### New table: `public.planner_backups`

```sql
CREATE TABLE public.planner_backups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL
);
CREATE INDEX planner_backups_user_time
  ON public.planner_backups(user_id, created_at DESC);
```

### RLS policies on `planner_backups`

```sql
ALTER TABLE public.planner_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own backups"
  ON public.planner_backups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backups"
  ON public.planner_backups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own backups"
  ON public.planner_backups FOR DELETE
  USING (auth.uid() = user_id);
```

### New SQL function: `public.create_user_backup(p_user_id uuid)`

```sql
CREATE OR REPLACE FUNCTION public.create_user_backup(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $func$
DECLARE snapshot jsonb;
BEGIN
  SELECT jsonb_object_agg(section, data) INTO snapshot
    FROM public.planner_data WHERE user_id = p_user_id;
  IF snapshot IS NULL THEN RETURN; END IF;
  INSERT INTO public.planner_backups(user_id, data) VALUES (p_user_id, snapshot);
  DELETE FROM public.planner_backups
  WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id FROM public.planner_backups
      WHERE user_id = p_user_id
      ORDER BY created_at DESC LIMIT 48
    );
END;
$func$;
```

### pg_cron schedule (cron job ID: 1)

```sql
SELECT cron.schedule(
  'hourly-planner-backups', '0 * * * *',
  'SELECT public.create_user_backup(user_id)
   FROM (SELECT DISTINCT user_id FROM public.planner_data) u'
);
```

Fires every hour on the hour. Keeps the 48 most recent snapshots per user (~48 hours of history). pg_cron extension is **enabled** on the project.

### Existing tables (unchanged, for reference)

| Table | Purpose |
|---|---|
| `planner_data` | Per-section cloud sync (`user_id`, `section`, `data` jsonb, `updated_at`) |
| `rsvp_responses` | Online RSVP form submissions |
| `guests` (RPC-only) | Not directly readable by `anon` — exposed via `public_wedding_extras(uid)` RPC |

---

## 4. Git State

```
Branch:  main (only branch)
Remote:  https://github.com/mandyjane/unionvault (redirects → mandyjane/UnionVault)

Recent commits:
a961342  v306: stack backup buttons below text in cloud sync panel
7985f9f  v305: backup now uses client-side JS, no SQL function needed
12d37df  v304: balance due date, menu exclusion, cloud backup UI
4ce76c6  v303: fix mobile preview height and countdown eyebrow label
9d42695  Fix guest data loss and blank wedding site (v302)
```

All commits are on `main`, pushed. GitHub Pages deploys automatically from `main`. Deployment takes ~30 seconds after push.

---

## 5. Recent Code Updates (Session 11)

### v302 — Guest data loss fix
- **Bug**: `const _fullGuests` was block-scoped inside `_showPublicWeddingSite()` causing a `ReferenceError` that cleared guest data on navigation.
- **Fix**: Moved `_fullGuests` to function-scope variable instead of `const` inside a block.

### v303 — Mobile fixes
- Fixed mobile preview pane height
- Fixed countdown eyebrow label

### v304 — Three fixes in one commit

**1. Balance due date inline label** (`paymentRow()` function):
```javascript
// BEFORE (bug: suppressed when autoCalc=true):
const dueInlineLabel = (!paid && !autoCalc && dueVal)
// AFTER (fix):
const dueInlineLabel = (!paid && dueVal)
```

**2. Budget menu mutual exclusion** — opening one menu now closes the other:
- In `openBudgetHidePopup()`: added `closeBudgetReportsMenu()` call at top
- In `toggleBudgetReportsMenu()`: added logic to close `#budget-options-menu` if open before opening reports menu

**3. Cloud backup UI** — added to the cloud sync panel in Settings:
- "Automatic backups" section with "Back up now" and "View backups" buttons
- `_backupNow(btn)` — reads all `planner_data` sections, bundles into one jsonb snapshot, inserts into `planner_backups`, prunes to 48 rows — **fully client-side JS, no RPC call**
- `_openBackupModal()` — fetches list of backups, renders timestamps + Restore buttons
- `_restoreFromBackup(backupId, btn)` — fetches snapshot jsonb, upserts each section back into `planner_data`, calls `cloudLoadClick(true)` to reload STATE

### v305 — Backup client-side rewrite
- Removed RPC dependency; `_backupNow()` uses direct `_sb.from('planner_backups').insert()` instead of `_sb.rpc('create_user_backup')`.

### v306 — Backup button layout fix
- Changed the "Automatic backups" section layout from `flex/space-between` (buttons beside text) to block/column (buttons stacked below the title text), matching the style of the Save/Load cloud buttons above it.

### Online RSVPs card redesign (completed this session)
- `_loadOnlineRsvps()` replaced flat table with grouped household cards
- Card / list view toggle added to card header; preference saved to `localStorage` key `uv_onlinersvps_view`
- Filter behaviour fixed: "Attending" shows only attending members per card; "Declined" shows only declined members
- History icon shown when a household has multiple submissions

---

## 6. Resolved Issues

| Issue | Resolution |
|---|---|
| Balance due date not showing on Remaining Balance row | Removed `!autoCalc` guard from `dueInlineLabel` in `paymentRow()` |
| Cog menu + reports menu opening simultaneously | Mutual exclusion: each menu's open function closes the other first |
| User anxiety about cloud version conflicts causing data loss | Hourly automatic backups now running server-side + "Back up now" for on-demand |
| pg_cron `schema "cron" does not exist` | User enabled pg_cron extension in Supabase dashboard |
| SQL function creation timing out via MCP | User pasted SQL directly into Supabase SQL Editor; succeeded first try |
| Backup buttons appearing to the right of text (cramped on mobile) | Changed to column layout (v306) |
| Online RSVPs showing flat ungrouped table | Replaced with household-grouped card/list view |

---

## 7. Supabase Edge Functions (unchanged, for reference)

All deployed to project `hzafdlfprtzfxtyaebmc`:

| Function | Sender address | Auth required |
|---|---|---|
| `send-appointment-email` | `<couple> <appointments@unionvault.app>` | Signed-in user |
| `send-guest-email` | `<couple> <invites@unionvault.app>` | Signed-in user |
| `rsvp-notify` | Alerts to couple | Service role (public RSVP form) |

`RESEND_API_KEY` is set as an edge function secret (SHA256 starts `45658b6c3e93…`). **Never write it into the repo.**

---

## 8. Immediate Action Plan (Next Session)

There are no outstanding bugs or half-finished features from this session. The next session should:

1. **Verify hourly backups are running** — run `SELECT * FROM planner_backups ORDER BY created_at DESC LIMIT 5;` in Supabase SQL Editor after the next top-of-hour to confirm a row was inserted automatically by pg_cron.

2. **Write a new session handoff** — update `docs/CLAUDE_CODE_CONTEXT.md` line map (line numbers have drifted since Session 7) and add Session 11's Supabase schema additions to it so future sessions have an accurate reference.

3. **Take on new user requests** — no queued features remain. Ask the user what to work on next.

---

## 9. Environment & Credentials

| Item | Value / Note |
|---|---|
| Supabase project ID | `hzafdlfprtzfxtyaebmc` |
| Supabase region | `ap-southeast-2` |
| GitHub repo | `https://github.com/mandyjane/UnionVault` |
| Live URL | `https://unionvault.app` |
| `RESEND_API_KEY` | Set as Supabase edge function secret — do NOT ask for it or write it anywhere |
| `unionvault.app` | Verified in Resend (DNS done) |
| User email (for authorship only) | `atomlinson@live.com.au` |
