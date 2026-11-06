# HANDOFF — Session 17
*Generated: 2026-11-05*

Repo `NthQuay/UnionVault`, branch `main`. Live build **v508**. Supabase `hzafdlfprtzfxtyaebmc`.

## Shipped this session (all accepted)
- **v476** Wishing Well: thank-yous-sent tally, search beside Sort, "Add details" on Public preview, "Wishing well details" naming, no individual +1s in Log a contribution.
- **v477–v478** Wishing Well: compact "Gifted so far" card; Sort and Search same height, Sort fixed 118px, Search takes the rest.
- **v479** Dashboard "Wedding of" card compact on phones (hero Styles 1 and 3). Style 2 untouched. Desktop unchanged.
- **v480** Email work:
  - **Modern template accent strip** now shows in dark mode (strip is its own cell; the dark-mode CSS used to force the border grey).
  - **Invite + RSVP reminder bodies fully editable.** New email defaults hold every sentence; the invitation image is a placeable `{invitation_image}` block (Insert → Invitation image) next to `{rsvp_button}` / `{website_button}`. `_tplFullBody(kind)`: true when no saved override, or when `STATE.settings.commsFullBody[kind]` (set on Save in the editor). An older saved text keeps its old automatic behaviour until re-saved; opening it shows everything written out (`_tplExpandLegacy`). `_tplCleanFull` drops an image/website block with nothing to show, plus the sentence introducing it. Delete the Invitation image block and no image is sent.
  - **Paragraph size + alignment** in the email editor: `## ` intro, `### ` large, `-# ` small; `~c ` centre, `~r ` right (alignment prefix goes first). Plain text/SMS strip these (`_stripMd`).
  - **Editor toolbar stays on one line on phones** (≤600px: labels shrink to `Aa ▾` and `+`).
  - **Email preview uses nearly the full card width on phones** (Communications + send window).
- **Edge function** `send-guest-email` v22 deployed (verify_jwt true): accent strip, `{invitation_image}`, size/alignment prefixes. Legacy `inviteBlock` path unchanged.

## Notes
- Deployed source was passed verbatim from disk but not byte-diffed against the live copy afterwards.
- Mockup PNGs for this session are in `docs/sessions/mockup-*.png`.
- Not yet tested on a real phone or in real inboxes: size/alignment/Invitation image in Gmail/Outlook/Apple Mail.
- Only `send-guest-email` uses the size/alignment prefixes. Other email functions (appointment, vendor brief, RSVP confirmation, Wishing Well) are unchanged.

## Shipped later in session 17 (v481–v508, all accepted and on `main`)
- **v481–v488 Wishing Well:** thank-you *card written* tracking (row pen icon, tiles, modal checkbox, print column); due / written / sent partition the total; sent implies written, un-sending never clears written; solid green vs dashed grey step circles; sort by Due / Written / Sent first; dark-mode tile edges.
- **v482 / v501 / v498 Alerts banners:** checklist + budget alert banners stick to the top by default; budget offset corrected for the page's Text-size zoom (ResizeObserver re-measure).
- **v483 / v484 Fixes:** palette swatch name overlap (setup-wizard `.pal-swatch` collision); dark checkboxes on light screens (landing.css dark media rule flipped colour-scheme; pinned on body, RSVP sheet and published site).
- **v485–v486 Phones:** Dashboard "Choose ideas" thumbnails no longer squashed; Budget Reports / Invoices / Add Payment buttons fixed size.
- **v489 Guest List:** couples/families sharing one address show it once, merged across the group (like the Response Tracker). Phone/email stay per guest.
- **v490–v493 Vendors:** shortcut cards stack on phones; Vendor Look Up greyed with "Coming soon" (also disabled on dashboard); Back button on Communications; vendor brief fixes (sections, guest count, checklist text, budget amounts); vendor-name suggestions; removed dashboard Show 6/12/18/All.
- **v494 Send window:** notice when a "Visit our website" button is present but the website isn't published.
- **v494–v499 Budget ring summary:** amounts sit under labels; bigger ring; order Committed, Unallocated, Paid, Left to pay (desktop + phone).
- **v495 Email editor:** Align and Size act on the paragraph(s) the cursor/highlight touches.
- **v500 / v504 RSVP link:** opens a standalone RSVP page showing the *same* RSVP modal as the website (one code path), and works with no published website via the new `rsvp_page(uid)` RPC.
- **v502–v505 Timeline:** Print + Share merged into one share-icon menu; cards no longer overflow on phones; notes keep line breaks and indentation everywhere (cards, print, public run sheet, export, vendor page).
- **v506 Security + run sheet (live in DB):** anon can only read `planner_data` sections `website, event, timeline, inspo` of a published site (was every section); `vendor_tokens` "public reads by token" policy dropped (vendor page uses `vendor_brief(token)`); the public run sheet link (`?runsheet=<uid>`) was reading a non-existent `cloud_saves` table — now uses new RPC `public_run_sheet(uid)` (names/date/venue + only `pub` moments). Migrations in `supabase/migrations/20261107_rsvp_page_rpc.sql` and `20261108_security_tighten_and_run_sheet.sql` (rollback SQL in the latter's comments).
- **v507–v508 Timeline on phones:** times smaller and nearer the left edge, cards wider; song card is two lines (start time top, song below, bigger play button) only when a start time exists. **Email send preview** now has an **Edit** button: opens that message's template editor, returns to the send sheet on Save/Cancel (`_ssEditFromPreview`, `_ssReturnToSend`).

## Further notes
- Applying SQL via the Supabase MCP `apply_migration` asks the user to confirm destructive statements and times out unanswered; the user ran the security migration in the dashboard SQL editor instead.
- Resend webhook (`email.delivered`) confirmed working by the user — R1/R2 done.
- Branch `claude/busy-ptolemy-3ri5ri` (SEO pages + social media kit) is intentionally kept for later; all other stale branches deleted.
- Not yet tested: the Edit-in-preview return-to-send-sheet round trip after Save/Cancel on a real send; a real `?runsheet=` link on a real account.

## Open items (carried over)
R1 Resend webhook must send `email.delivered` (user action). R2 confirm a real send appears in Communications → Sent. P3 VB wallpaper dedup. P5 remove debug `console.log` in `_lpSignIn()`. P7 test public RSVP flow. P11 verify cross-account privacy fix.
