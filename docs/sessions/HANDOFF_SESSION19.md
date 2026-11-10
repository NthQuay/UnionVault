# HANDOFF — Session 19
*Updated 2026-11-10 (evening) · `NthQuay/UnionVault` `main` = build **v513.5** (see §8 about its deploy)  · vendor portal repo `NthQuay/UnionVault-vendors` (live at https://vendors.unionvault.app, HTTPS enforced)*

Read `CLAUDE.md` first (standing facts). This file is what changed in session 19 and what is next.

## 1. What shipped in the app (v510.3 → v513.2)

| Build | What shipped |
|---|---|
| v510.3–.8 | Email design: per-email "Use app-wide design" switch; removed "Nº 02 —" / "Nº 01"; Atelier corner shows wedding date as day over month; custom **Background / Box / Panels** colours; uniform 2-column colour list with popups; RSVP card "Email design" button removed (Edit communications explains where designs live); website builder Right alignment no longer reset. |
| v510.9 | Dashboard: one failing widget no longer blanks the page; vision widget tolerates missing inspo; `navigate()` shows a message if a page fails to render. |
| v511.0–.2 | Timelines: date on each card, linked-event chip on its own line, 12/24-hour setting, time-span fixes. Website builder: photos reorder by touch or mouse (`_wbTilePD`…), dropping on the first = featured. |
| v511.5–.6 | Event Details: compact phone layout, Partner titles in the settings cog, estimated/RSVP guest-count switch below the fields with info icon; "Replies go to" row on Communications and Settings → Account (`openReplyToSettings`, `_replyToRowHtml`). |
| v511.7 | RSVP responses pop-up counts everyone who responded (online + set by you), source chips, manual pseudo-rows (`_orsvpTally`, `_manual`) — matches Guest List. |
| v511.8–.9, v512.x | **Recommended vendors**: sample directory replaced by Storyline Ceremonies and Jordan Leef Photography; manual Google rating with date; service-area line; "Preferred vendor" wording; gold Save heart pill; saved vendors keep rating/hours/email/services. |
| v512.1–v513.0 | Outbound vendor links go through the `vendor-click` edge function (tracked); call/email taps send a ping; Storyline has Website + Contact form + Call + Email (no booking URL). |
| v513.1 | Recommended vendors now load from the database (`recommended_vendors()`); the array in `js/invitations.js` is only an offline fallback; last good list cached in localStorage (`uv_vlu_cache_v1`). Signed-in clicks carry a short-lived signed click token (`ct`) so the admin can see which account clicked. |
| v513.2 | New Terms & Privacy text (sections 1–14) in `index.html` and `maintenance.html`; dashboard notice with **Agree** only (no ×): shown to accounts created before 2026-11-10 10:00 UTC until they press Agree; stored as `STATE.settings.termsAck = {v:'2026-11', how:'agree', at}`. To re-notify after a future Terms change, bump `_TERMS_VERSION` in `js/dashboard.js`. The Terms text lives in `index.html` (`#lp-terms-modal`) and `maintenance.html` (`#terms-modal`); the matching plain-text version is not stored in the repo. |


### Later builds (same day)
| Build | What shipped |
|---|---|
| v513.3 | `js/ref.js` (new, in `sw.js` SHELL): remembers `?ref=<code>` for 90 days, claims it with `claim_referral` after the first sign-in. **Verified live**: a test sign-up through `/?ref=storyline` was attributed to Storyline. Note the app does not sign people in after email confirmation — the claim happens at their first sign-in. |
| v513.4 | Terms notice: the saved session has no account creation date, so it is fetched once from `/auth/v1/user` (cached in `uv_acct_created`); notice hidden until known, never shown to accounts created after 2026-11-10 10:00 UTC. |
| v513.5 | Merge of another Claude session's branch `claude/wizardly-lovelace-6ahlux`: ACCC referral-commission disclosure line on the sign-up tab (`.auth-disclosure`), website badge no longer hidden behind Editorial/Atelier sections, website gallery photos can be dropped to reorder. Build numbers were the only conflict. |

Pushing to `main` works from the session (`git push origin HEAD:main`) — v513.2 went out that way after the user's explicit "Accept". Still honour the rule: previews in light + dark, wait for Accept, then push.

## 2. Vendor portal (separate repo `NthQuay/UnionVault-vendors`)

- Plain HTML/CSS/JS, no build. `index.html`, `css/portal.css`, `js/{config,demo,app}.js`, `supabase/migrations/20261112…15`. Same Supabase project as the app (`hzafdlfprtzfxtyaebmc`). Browser uses only the publishable key.
- Sign-in is a **magic link** (`signInWithOtp`, `shouldCreateUser:false`) — users must already exist in Supabase Auth. Supabase redirect URLs include `https://vendors.unionvault.app/**`.
- Roles are decided at boot: has a `partners` row ⇒ **vendor** (Overview / Your listing / Referrals / Agreement); else in `app_admins` ⇒ **admin** (All vendors, review queue, who clicked). An account cannot be both.
- **Overview**: welcome hero, range switch (7 days / 30 days / This quarter / All time), dated smooth chart with hover tooltip (weekly buckets when >120 days), "Where clicks go", all-time and per-quarter totals, referral summary, latest activity (anonymous IDs).
- **Your listing**: vendors edit name, category label, phone, email, service area, hours, website/contact/Instagram links, About text, photos (up to 8, drag-and-drop, resized to ≤1600px JPEG client-side), logo, and **packages & pricing** (Fixed / Range / From / On request; unit per package/hour/day/person/event; note; Most popular; show/hide; reorder). Every change goes to a **review queue**; nothing is public until the admin approves. Vendors can't edit rating, the couple's note, byline, tag or published flag.
- **Referrals**: referral link `https://unionvault.app/?ref=<code>`, sign-ups, commission, anonymous referred-user IDs. A NULL rate shows "Rate to be agreed".
- `?demo=vendor` / `?demo=admin` shows fixtures (no network). **Remove before real vendors rely on the site** (harmless — fake data only).
- Production logins (created in Supabase dashboard, Auto Confirm, random passwords): `ben@storylineceremonies.com.au` → partner `storyline`; `jordanleef2@gmail.com` → partner `jordanleef`; `admin@unionvault.app` → admin. Ben has been sent his login and a mock-up.

## 3. Production database state (applied 2026-11-10)

Apply order, all done: `20261110_affiliate_schema` (main repo) → `20261111_vendor_clicks` (main) → `20261112_vendor_portal` → `20261113_vendor_portal_listing` → `20261114_recommended_vendors_site_url` → `20261115_partner_rate_undetermined` (all in the vendors repo) → `20261116_retention_and_deletion` (main). A 30-check behavioural test was run on a throwaway Supabase branch first (deleted).

- Tables: `app_admins`, `affiliate_settings`, `partners`, `referrals`, `payouts`, `commission_entries`, `stripe_events`, `vendor_links`, `vendor_clicks`, `vendor_profiles`, `vendor_profile_changes`, `partner_terms`, `partner_terms_acceptances`.
- Storage: public-read bucket `vendor-media` (5 MB, jpeg/png/webp); a vendor can write/delete only inside its own `<vendor_id>/` folder. Photos are only shown once a reviewed change references them.
- Both listings are **published**. `partners.rate`: Storyline **0.20 (proposed, not yet agreed)**, Jordan **NULL** (undetermined). Rate is nullable — commission code must skip NULL-rate partners.
- `referrals.user_id` is now nullable with `ON DELETE SET NULL` (deleting an account de-identifies the referral, keeps the ledger). `partner_referrals()` uses `coalesce(user_id, id)` for the anonymous ID.
- Retention (matches the Terms): `vendor_clicks` older than 24 months deleted monthly by pg_cron job `purge-old-vendor-clicks` (`30 3 1 * *`, `purge_old_vendor_clicks()`); referral/payment/commission records kept 7 years.
- `is_admin()` is not executable by `anon`. Supabase advisor's remaining WARNs predate this work (older security-definer functions).
- Edge function `vendor-click` **v2** (verify_jwt false): `GET ?v&l[&ct]` redirect + log; `POST ?v&l[&ct]` ping; `POST ?mint=1` with a user JWT → 6-hour HMAC click token (key = service-role key, no new secret). Tests: `node --experimental-strip-types supabase/tests/vendor_click_test.mts`. `send-guest-email` v25, `send-vendor-brief-email` v10 unchanged.

## 4. Decisions and facts to keep

- Vendor-facing naming: **Vendors**, referral side = **Referrals / Referral commission**; agreement title will be "Preferred Vendor & Referral Agreement".
- Vendors pay nothing and give no other benefit to be listed; their only benefit is commission on **successful paid sign-ups** they refer (stated in the Terms).
- Vendors see counts and **anonymous IDs only** (salted per vendor); only the admin sees which account clicked. No vendor ever sees names/emails of couples.
- Jordan is "she/her".
- **Agreement tab stays empty** until the terms are definitive. Ben has been sent a **counter-proposal** and mock-up and has not replied; the 20% / quarterly-payment figures are proposals only.
- No third-party/ad cookies; no affiliate networks. Disclosure line under the vendor list ("…we note which account used them") is in the app; it still says UnionVault may earn commission on bookings, which is **not true today** — fix the wording (and show it nearer the cards) when next touching vendors.
- Terms retention numbers (24 months clicks / 7 years financial) are the assistant's recommendation; the user should confirm 7 years with their accountant.

## 5. Open items

1. Wait for Ben's reply → write the agreement text into `partner_terms` (title "Preferred Vendor & Referral Agreement"), set final rate; Jordan's rate after talks.
2. Test access for the user to view the vendor experience: either a **test vendor login** (separate email + a "Demo Vendor" unpublished listing) or an admin **"View as vendor"** read-only mode (needs mock-up first). Not started.
3. Reword the vendor-list disclosure (see §4).
4. Remove `?demo=` mode before go-live; add the privacy/terms link and sign-in help text to the vendor portal.
5. Phase 2 (mocked, not built): couple-facing full vendor page (cover photo, gallery, bio, packages, reviews) and in-app messaging to vendors with an inbox tab in the portal. The listing fields it needs (photos, bio, packages) already exist and are exposed by `recommended_vendors()`.
6. Update `docs/CLAUDE_CODE_CONTEXT.md` if it still describes the old hard-coded vendor list.

## 6. Commission & payout system — BUILT and LIVE (waiting for the first real payment)

- **Rule (Storyline counter-proposal, 10 Nov):** 20% of each referred client's subscription payments, recurring for as long as they stay subscribed (`partners.commission_months` NULL = no limit); attribution 90 days; payout quarterly in arrears; not covered: existing accounts, self-referrals, couples who book through the vendor listing. A partner with a NULL rate earns nothing (Jordan). The 5% booking referral fee and quarterly netting in the proposal are **phase 2** (needs in-app enquiries) and are not built.
- **Database (`20261117_commission_engine.sql`, applied):** `affiliate_record_payment` (service role), `affiliate_record_reversal` (refund / credit-note / lost-dispute rows, negative, point at the original payment, capped so nothing reverses twice), `affiliate_record_lifecycle` + table `referral_events` (payments with plan, cancellation requested / resumed / ended — recorded for every attributed referral whatever the rate), `affiliate_create_payout` / `affiliate_mark_payout_paid` / `affiliate_void_payout` (admin only), `partner_referrals()` (anonymous ID, plan, cancel state), `partner_statement_lines(quarter)` (first payment / renewal / refund / cancellation lines), `admin_payout_overview`, `admin_payouts`. Rounding is half away from zero ($12.99 × 20% = $2.60). Ledger rows are never edited.
- **Stripe:** live webhook endpoint `we_1UWr0pBK4MlrXpHgFx064t01` (API version `2026-10-28.endive`) now sends `invoice.paid`, `charge.refunded`, `charge.dispute.closed`, `credit_note.created` in addition to the four subscription events. Edge function `stripe-webhook` **v10** (`index.ts` + `commission.ts`) handles them; whole-event idempotency in `stripe_events`. The plan is read from the invoice line (or fetched from the price on newer API shapes). **Not yet exercised by a real payment** — watch the first one in the function logs (`commission affiliate_record_payment …`).
- **Vendors portal (branch `claude/portal-payouts` in `NthQuay/UnionVault-vendors`, must be merged to that repo's `main`):** Referrals tab → plan per anonymous client ("Month-to-month · $12.99/mo", "3-month · $10.39/mo"), status Paying / Cancelling / Cancelled, quarterly statements with every line; admin **Payouts** tab (create draft for the last finished quarter, mark paid with a reference, cancel draft). Wording: "20% of referred users' subscription fees".
- **Tests:** `node supabase/tests/commission_engine.test.mjs` (69 checks on the real migrations in PGlite — `npm install --no-save @electric-sql/pglite` first) and `node --experimental-strip-types supabase/tests/stripe_commission_test.mts`.
- **Not built / ideas:** admin per-partner ledger with the referred person's real email, plan and events (the admin currently sees totals and payouts only); a guard that blocks payouts until a partner has accepted an agreement (agreement text is still empty by design); emailing partners their statements.
- **Test data:** one test referral exists (`admin@nthquay.com` → Storyline, attributed, no payments). Remove it after the test account is deleted so Ben's portal doesn't count it.

## 7. Working notes / gotchas

- Supabase MCP: `execute_sql` returns only the **last** statement's result (wrap checks in one `select`); `apply_migration` has timed out, so additive SQL goes through `execute_sql`; **production writes pop a confirmation prompt that times out after ~230 s if unanswered** — tell the user to approve and retry in a later turn. Creating a Supabase branch also needs a cost approval. `create_branch` gives an empty database (no schema), so seed what the migrations depend on.
- Headless testing: Playwright + `python3 -m http.server`; block external hosts; stub `supabase` global for the portal; for modals, screenshot after calling `_openTermsModal()` or extract the modal HTML (the landing overlay otherwise hides the app).
- The click-token design exists because tracked links can't send an Authorization header and a login token must never sit in a URL.
- Scratchpad paths change between worker restarts (`/tmp/claude-0/-home-user…` vs `-home-user-UnionVault…`).
- Previews and mock-ups from this session: `docs/sessions/*.png`.

## 8. State at the end of this session
- `main` = merge of PR #16 (v513.5). **GitHub Pages deploy of that merge timed out** (build succeeded, "Deploy to GitHub Pages" step hit its 10-minute limit — same as PR #14 earlier; direct pushes deployed fine). It was re-run; if the live `sw.js` still says an older `CACHE`, use "Re-run failed jobs" on the run in the Actions tab or push any small commit.
- Sample-data mode (`?demo=vendor|admin`) in the vendor portal is **kept on purpose** — the owner will fine-tune the portal with it.
- The vendor-list disclosure wording ("UnionVault may earn a commission…") is kept deliberately: the 5% booking fee is expected to be agreed; revisit if that part of the deal falls through.
- Do not ask about Ben's commission rate — the owner will say if it changes (database currently 20% for Storyline, NULL for Jordan).
