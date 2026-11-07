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

## v509.3 (accepted)
- Subscription page: plan tags/borders rebuilt from the current pick on every tap (`_uvSelectSettingsPlan`). Before, "Selected" stayed on a card you had moved away from and the newly picked card got no tag; hover-out reset borders to the page-load selection.

## v509.4 — Email templates: Editorial + Atelier
- Four email templates everywhere (invites, save-the-dates, reminders, vendor briefs): **Classic · Modern · Editorial · Atelier**. Botanical code removed; a stored `botanical` falls back to Classic (`templateIdOf`).
- **One shared module**: `supabase/functions/_shared/email-templates.ts` holds every design (`classicHtml`, `modernHtml`, `editorialHtml`, `atelierHtml`, buttons, paragraph markup, details rows). `send-guest-email` (v23) and `send-vendor-brief-email` (v8) only add their own content (invite block / brief button + expiry note). Change a template once → both senders change. Deploy both functions together when editing it (the deploy must include `../_shared/email-templates.ts`).
- Editorial/Atelier use `issue` {names, date, time, venue} from the client (`_emailIssue()` in js/send-sheet.js, also passed by comms.js, invitations.js, vendors.js): masthead names, cover date, details panel. Guest emails put the invitation beside the details when it isn't placed in the text; vendor briefs show a details panel.
- Side effects: vendor Modern now uses the accent-strip version (dark-mode fix guest emails already had); vendor brief text now supports the size/alignment prefixes. Guest Classic/Modern output byte-identical to v509.3.
- Picker: all four for every item incl. vendor brief, with mini thumbnails and "New" pills on Editorial/Atelier.

## v509.5 — Setup wizard feeds the planner (venues, rooms & spaces, style)
Audit found most wizard answers were saved but never read (vibe, formality, setting, time of day, ceremony type, guest count, party counts, pronouns, palette → unused `settings.accentColor`). Now:
- **Venues model** (`js/details.js`, "VENUES & ROOMS / SPACES"): `event.venueMode` 'same'|'different'; `venue/venueAddress` = reception or the one venue; `ceremonyVenue/ceremonyVenueAddress` = ceremony venue's real NAME (different only); `ceremonySetting` = the vision (Church, Garden… — the old "Ceremony venue" dropdown); `spaces` [{id, part:'ceremony'|'cocktail'|'reception'|'other', name}]. Helpers `_evNormalize` (lazy migration: a type in `ceremonyVenue` moves to `ceremonySetting`), `_evDiff`, `_evSpace`, `_evPartVenue`, `_evPlace`, `_evVenueLine`, `_evLocationOptions`, shared `_evSpacesBlockHtml` (expandable "Rooms & spaces", used by wizard + Event Details).
- **Wizard**: The Day = date + ceremony time (`event.time`), ceremony type (Religious → Religion / Married by a; Civil → officiant Celebrant), setting, Same/Different venues + names, Rooms & spaces. Style adds "Ceremony setting you imagine". Party rows take optional names → Guests tagged Bridal Party (role in relationship; flower girl/page boy = child). Checklist pre-ticks by answers (`wzTailorChecklist`; chips the couple taps are never overridden; new tasks: wet-weather backup, page boy outfits, destination marriage requirements). Summary shows "→ where it went". Palette → `inspo.colors` (+ customColors) and default email accent (only if still the default).
- **Starter Timeline** (`wzFitStarterTimeline`): untouched default moments get the couple's spaces (or venue) and shift so Ceremony Begins = ceremony time.
- **Event Details**: Ceremony time, Estimated guests, Formality; Ceremony card has Ceremony setting; new Venues card (Same/Different, names, addresses, Rooms & spaces; renaming a space updates Timeline moments using it). `.details-two-col>div{min-width:0}` fixes phone overflow.
- **Timeline**: location chips from spaces/venues in the moment editor; header shows both venues.
- **Inspiration**: "Our style" card (vibe multi, formality, setting) — same fields as Event Details.
- **Website** details: same venue → Venue + per-part spaces; different → Ceremony / Cocktail hour / Reception with venue + space and each address/map. Time "15:30" shows as "3:30 PM". Dress code preset pre-fills with formality.
- **Vendor brief**: ceremony time, venue/space rows, formality, ceremony setting, style; booking row values now escaped.
- Budget: new per-head item starts from estimated guests (manual-count mode). Email issue line: both venues; typed times kept as typed (was "3:00 PM" → "3:00am").
- Tested: full wizard run light/dark, data written, tailoring, timeline shift (+30 min), rename propagation, website 4 formats, old-format data (Church → ceremonySetting), 12 pages no errors, phone 390 no overflow, vendor brief with mocked RPC.

## v509.6 — Guest count: Estimated / RSVP count (accepted)
- Event Details → **Guest count** with an Estimated / RSVP count switch (`_detGuestsInner`, `_detSetGuestSource`, `_detSetGuestEstimate` in js/details.js). The switch IS `STATE.budget.useRsvpCount` — same setting as Budget's per-head guest count, so the two pages always agree.
- RSVP count = `_rsvpPerHeadCount()` (infants never; children per "Exclude children"), shown with attending total, what isn't counted, how many still to reply, and the old estimate.
- `_evFillPerHeadEstimate(prev, n)`: per-head budget items that are blank or still equal the previous estimate follow a new estimate; switching back to Estimated (either page) fills blank ones. Counts typed on an item are left alone.
- Vendor brief: with no replies yet, Guest count shows "~N estimated".

## v509.7 — App colour picker everywhere (accepted)
- New `js/colorpicker.js` (in index.html + sw.js SHELL): a capture-phase click/keydown listener intercepts EVERY `<input type="color">` (present and future) and opens the app's own picker (`#uvcp`: saturation/value square, hue slider, hex field, "Your palette" from `STATE.inspo.colors`, 32 wedding tones, Cancel / Use colour). On Use colour it writes the hex back to the input and fires `input` + `change`, so existing `onchange="…this.value…"` handlers are unchanged.
- Covers Email Design accent, Inspiration custom colour, tag colours, website builder role/RSVP colours (4), setup wizard palette (2). Bottom sheet on phones (≤520px), centred card on desktop; light + dark.
- Don't add a separate native picker or "custom swatch" that bypasses this — the user explicitly hates the Android native colour dialog.
