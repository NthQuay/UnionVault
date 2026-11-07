# HANDOFF — Session 18
*Generated: 2026-11-07*

Repo `NthQuay/UnionVault`, branch `main`. Live build **v509**. Supabase `hzafdlfprtzfxtyaebmc`.

## Shipped (v509, all accepted)
- **P11 cross-account fix** (`js/init.js`): the boot `uv_uid` mismatch wipe now sets `_uvWipeInProgress` before reloading. Before, the `beforeunload` save wrote the previous account's STATE back under the new uid and the next boot trusted it (reproduced in Playwright, fixed). P5 and P3 were already done (no `console.log` in `_lpSignIn`; wallpapers are `/assets/*.png`).
- **Budget sub-items expanded by default** for new accounts (`js/state.js` defaults `expanded:true`).
- **Setup wizard:** pre-wedding pills (Hen's, Buck's, Rehearsal dinner, Engagement party, Day-after brunch) create `STATE.events` entries for every tier (skips names that exist). Footer shows "3 of 7" on phones (≤460px, `.wz-st-word` hidden) so it never wraps.
- **+1 pill** (`_plusOneBadge`, `.age-badge-plusone`) on Guest Response Tracker (replaces grey "+1" text) and Online RSVPs (which now also show Child/Infant). Hidden while the name is still the "+1 (Host)" placeholder.
- **Inspo on vendor cards:** `v.inspoIds`; card row + picker (`_vendorInspoPicker`, opens on matching inspo category); "Inspiration" section in Create vendor brief (pre-selected when attached); image grid on the vendor brief page (public `photos` URL `<couple_id>/<media id>`). Brief chips: `.vbm-chip.sel` collided with the wizard `.sel` select style (full width) — scoped override in `css/app.css`.
- **RSVP form meal step** (`js/website.js`):
  - "Alternative meal" chip (Meal Settings toggle `settings.mealDietaryOn`, default on) reveals Vegetarian / Pescatarian / Vegan (minus any already on that menu; chip hidden if all are). The pick becomes the meal and silently saves the dietary key. Next stays disabled until picked.
  - Guests shown meal chips (option on) don't see those three dietary boxes. A menu meal named vegetarian/pescatarian/vegan opens Dietary requirements with that box ticked (guest can untick); switching meal unticks/hides it.
  - Infants: no Dietary requirements section.
  - Dietary grid: one line per label (`Lactose-free`, `Gluten-free` on the form; stored keys unchanged), 67px tall at all widths; ≤340px wraps.
  - Live bug fixed: "Child allocated children's meal" with no options left Next disabled for children.
  - Dietary count badge survives Back/Next.
  - Meal Counts lists meals not in the couple's list (e.g. "Vegan").

## SQL — `supabase/migrations/20261109_inspo_brief_and_meal_diet.sql`
`vendor_brief` gains an `inspo` section; `rsvp_page` and `public_wedding_extras` pass through `mealDietaryOn`. Run in the dashboard SQL editor (apply_migration times out). Until run: brief pages show no inspo, and hiding Alternative meal doesn't reach guests.

## Testing notes
- RSVP flow regression run in Playwright against the standalone `?rsvp=` page with stubbed RPCs (default, risotto, option hidden, meal off, family with child+infant, child must pick) — all reach the thank-you screen, payloads checked.
- Not yet tested: real phone, real `?vendor=` link with real inspo photos after the SQL.

## Open items
R2 confirm a real send appears in Communications → Sent. P7 real public RSVP end to end. Vendor list view has no Inspiration row (cards only). `claude/busy-ptolemy-3ri5ri` kept for later.

## v509.1 — Website format styles (accepted)
- Picker shows **Classic · Modern · Editorial · Atelier** (`_wbFormatPickerHtml`, `WB_FORMATS`). Stored keys unchanged so saved sites keep their look: `modern` = Classic, `editorial` = Modern; new `magazine` = Editorial, `atelier` = Atelier. Classic/Modern site output verified identical to v509 (only the font link + a selector that only matches new formats differ).
- Editorial / Atelier (`_fx` in `_wbBuildSite`): each section's first photo is the feature, alternating sides (`_fxAlt`; an image block set Left/Right keeps that side); further photos stay in the text. No photo → text-only `fx-plain`.
  - Editorial: magazine cover header (topbar, masthead names, cover lines, issue date), "Nº 0n — Label" eyebrows, drop cap. Phones: side by side 50/50 with a frosted (`backdrop-filter`) text panel edging into the photo.
  - Atelier: big names + tall photo header, tinted panels, outline numbers. Phones: photo 74% alternating, text box overlapping.
- `_wbSetFormat`: switches heading font to Bodoni Moda / Playfair Display only if it's still the default (or format-set); restores on switching back; `_wbFont('headFont')` clears the auto flag. Bodoni Moda added to `WB_FONTS` + site font link.
- Tested: picker clicks, edge cases (no photos/date, hero below, side nav, single name, hidden names) in all 4 formats at 1280/390 (no errors, no h-scroll), full RSVP regression incl. an Editorial-themed RSVP page.

## v509.2 (accepted)
- **Featured photo crop** (Editorial/Atelier): the image block holding a section's feature shows a "Featured photo" panel — desktop + phone previews (Atelier: one), drag focal point, zoom 100–250% (cover-anchored), Centre. Stored as `b.feat={id,pos,zoom}`; only applies while that photo is still first (`_wbFeatInfo`, `_wbFeatCrop`, `_wbFeatImgCss`). Position hint explains Full/Left/Right in these formats.
- **Right alignment**: per-section heading/intro (`l.align='right'` → `.rgt`) and body (`l.body='right'` → `.b-right`), plus site-wide `t.align` / `t.bodyAlign` = right. Paragraphs, details rows, timetable, links, buttons, FAQ mirror Left; Editorial drop cap off when right-aligned. Per-section buttons only show with "Apply alignment globally" off (as before).
- **New badges** on Editorial and Atelier in the Format Style picker (`WB_FORMATS[].isNew`).
- Regression: Classic/Modern output only gains rules for the new classes; edge builds in all 4 formats; RSVP matrix passes.
