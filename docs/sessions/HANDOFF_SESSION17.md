# HANDOFF — Session 17
*Generated: 2026-11-05*

Repo `NthQuay/UnionVault`, branch `main`. Live build **v480**. Supabase `hzafdlfprtzfxtyaebmc`.

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

## Open items (carried over)
R1 Resend webhook must send `email.delivered` (user action). R2 confirm a real send appears in Communications → Sent. P3 VB wallpaper dedup. P5 remove debug `console.log` in `_lpSignIn()`. P7 test public RSVP flow. P11 verify cross-account privacy fix.
