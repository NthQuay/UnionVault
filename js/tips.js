// WEDDING TIPS LIBRARY
// ══════════════════════════════════════════════
// Read-only reference content (not a planning tool like the other pages) —
// 47 categories (most of 5 tips; a handful merge two or three related topics into one,
// grouped with sub-headers via `group` on a tip). A few tips point at a specific UnionVault
// tool; those carry a `link` so the tip can jump straight there instead of
// just naming it in passing text.
const TIPS_ICONS={
  guests:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  seating:'<circle cx="12" cy="12" r="4"/><circle cx="12" cy="3" r="1.5"/><circle cx="12" cy="21" r="1.5"/><circle cx="3" cy="12" r="1.5"/><circle cx="21" cy="12" r="1.5"/><circle cx="5.6" cy="5.6" r="1.5"/><circle cx="18.4" cy="18.4" r="1.5"/><circle cx="18.4" cy="5.6" r="1.5"/><circle cx="5.6" cy="18.4" r="1.5"/>',
  heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  budget:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  vendors:'<path d="M2 5h20v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/><path d="M9 21v-6h6v6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
  website:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  moodboard:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  gift:'<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  couple:'<circle cx="9" cy="7" r="3.5"/><path d="M3 20v-1.5a5 5 0 0 1 5-5h2"/><circle cx="17" cy="7" r="3.5"/><path d="M13 14.5a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5V20"/>',
  checklist:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  countdown:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M9 2h6"/><path d="M12 2v3"/>',
  vows:'<path d="M12 7c-2-2-5-2-7 0v12c2-2 5-2 7 0c2-2 5-2 7 0V7c-2-2-5-2-7 0z"/><line x1="12" y1="7" x2="12" y2="19"/>',
  catering:'<path d="M7 2v7a2 2 0 0 0 2 2v11"/><path d="M7 2v5"/><path d="M5 2v5"/><path d="M17 2c-1.5 0-3 2-3 6s1.5 6 3 6v8"/>',
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  weather:'<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/>',
  kids:'<circle cx="12" cy="5" r="2.5"/><path d="M8 21v-5a4 4 0 0 1 8 0v5"/><path d="M6 13l2-4h8l2 4"/>',
  plane:'<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
  attire:'<path d="M12 4a2 2 0 1 0-2-2"/><path d="M12 4 2 12a2 2 0 0 0 1 3.5L12 11l9 4.5a2 2 0 0 0 1-3.5z"/><line x1="4" y1="20" x2="20" y2="20"/>',
  florals:'<circle cx="12" cy="7" r="2.5"/><circle cx="7" cy="12" r="2.5"/><circle cx="17" cy="12" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/><circle cx="14.5" cy="17" r="2.5"/><circle cx="12" cy="13" r="2.5"/>',
  stationery:'<path d="M4 21l4-1 11-11-3-3L5 17z"/><path d="M14 4l3 3"/>',
  eco:'<path d="M11 20A7 7 0 0 1 4 13V7a1 1 0 0 1 1-1h6a7 7 0 0 1 7 7 7 7 0 0 1-7 7z"/><path d="M4 13 18 4"/>',
  legal:'<path d="M12 3v18"/><path d="M5 7l-4 7h8z"/><path d="M19 7l-4 7h8z"/><path d="M5 7a7 7 0 0 0 14 0"/><rect x="9" y="19" width="6" height="2"/>',
  blended:'<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  beauty:'<path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z"/>',
  walkthrough:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
  tag:'<path d="M20.59 13.41 13 21 3 11V3h8l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  cocktail:'<path d="M5 3h14l-7 9z"/><line x1="12" y1="12" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>',
  lighting:'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2z"/>',
  keepsake:'<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/>',
  honeymoon:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/>',
  celebration:'<path d="M12 2a6 6 0 0 1 6 6c0 3-2 5-3 7l1 2h-8l1-2c-1-2-3-4-3-7a6 6 0 0 1 6-6z"/><line x1="12" y1="17" x2="12" y2="22"/>',
  elopement:'<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/>',
  pets:'<circle cx="7" cy="7" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="19" cy="12" r="2"/><path d="M8 15a5 5 0 0 1 8 0c1.5 1.5 2 3 1 5-1 1.5-3 1.5-5 1s-4 .5-5-1c-1-2-.5-3.5 1-5z"/>',
  ring:'<circle cx="12" cy="14" r="7"/><path d="M12 7 9 2h6l-3 5z"/>',
  cake:'<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 21h16"/><path d="M12 11V7"/><path d="M9 7a1.5 1.5 0 0 1 0-3 1.5 1.5 0 0 0 0-3"/><path d="M4 16h16"/>',
  sunrise:'<path d="M12 2v4"/><path d="M4.93 7.93l2.83 2.83"/><path d="M2 18h20"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M19.07 7.93l-2.83 2.83"/>',
  shield:'<path d="M12 2 4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  sun:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  snowflake:'<line x1="12" y1="2" x2="12" y2="22"/><line x1="5" y1="7" x2="19" y2="17"/><line x1="5" y1="17" x2="19" y2="7"/>',
  info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  venue:'<path d="M12 3 2 20h20z"/><path d="M12 3v17"/><path d="M6 20 12 10l6 10"/>',
  streaming:'<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  hashtag:'<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  care:'<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  brunch:'<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>'
};
const TIPS_LIBRARY=[
  {icon:'guests', title:'Guest List & RSVP Etiquette', tagline:'Plus-ones, A-lists and RSVP deadlines — sorted without the awkwardness.', tips:[
    {lead:'Set clear plus-one rules early.', body:'Decide upfront if plus-ones apply only to married, engaged, or long-term couples to keep your numbers fair and consistent.'},
    {lead:'Create an A-list and B-list.', body:'Send your first round of invites early so you have time to invite B-list guests without them feeling like an afterthought.'},
    {lead:'Set your RSVP deadline 3–4 weeks out.', body:'Your caterer and venue need final headcounts and dietary requirements well before the wedding week.'},
    {lead:'Automate your RSVP tracking.', body:'Ditch paper spreadsheets and track dietary needs, plus-ones, and responses automatically.', link:{page:'rsvp-mgr', label:'Open RSVP & Invites'}},
    {lead:'Follow up firmly after the deadline.', body:'Give late responders 48 hours to confirm before marking them as declined so your seating plan isn’t held up.'}
  ]},
  {icon:'seating', title:'Seating Chart & Floorplan Strategy', tagline:'Seat everyone happily and plan a reception layout that flows.', tips:[
    {lead:'Seat guests by shared interests.', body:'Mix friend groups with similar hobbies or energy levels rather than strictly separating "bride’s side" and "groom’s side."'},
    {lead:'Keep elderly guests away from speakers.', body:'Place grandparents and older relatives at tables far from the DJ booth or dance floor so they can comfortably chat.'},
    {lead:'Don’t create a "singles table".', body:'Seat solo guests alongside familiar faces or mutual friends so nobody feels isolated during dinner.'},
    {lead:'Test your layout digitally first.', body:'Drag and drop tables, check room flow, and map out guest placements stress-free.', link:{page:'seating', label:'Open the floorplan builder'}},
    {lead:'Order extra escort cards.', body:'Always print 10% extra blank place cards for last-minute seating swaps or spelling fixes during wedding week.'}
  ]},
  {icon:'heart', title:'Planning Small & Intimate Weddings', tagline:'Less stress, more meaning, and a celebration that actually feels like you.', tips:[
    {lead:'Be ruthless with your guest list.', body:'Only invite people who are actively part of your life right now. If you haven’t spoken in the last year, they don’t need a seat at a 30-person dinner.'},
    {lead:'Upgrade the guest experience.', body:'With fewer heads to feed, reallocate your budget toward a multi-course dining experience, elevated wines, or custom welcome notes at every place setting.'},
    {lead:'Seat everyone at one long table.', body:'Ditch separated banquet rounds for a single feasting table so every guest feels included in the same conversation and atmosphere.'},
    {lead:'Keep planning simple (and free).', body:'You don’t need bulky enterprise software for an intimate guest list — manage up to 80 guests, your budget, RSVPs, and timeline completely free.', link:{page:'dashboard', label:'Open your Dashboard'}},
    {lead:'Rethink traditional timelines.', body:'Skip the formal bouquet toss, cake cutting, or rigid speeches if they feel awkward in a small room — let the night flow like an unforgettable dinner party.'}
  ]},
  {icon:'budget', title:'Budget & Hidden Fee Prevention', tagline:'Know the real price before you sign — and keep a buffer for surprises.', tips:[
    {lead:'Factor in service charges and GST.', body:'Always ask vendors whether their quoted price includes taxes, delivery fees, and setup surcharges before signing.'},
    {lead:'Budget for post-wedding costs.', body:'Set aside funds for dress dry-cleaning, bouquet preservation, thank-you cards, and marriage certificate fees.'},
    {lead:'Track deposits and due dates in one place.', body:'Avoid late-payment fees and missed instalments by logging every supplier invoice and payment milestone.', link:{page:'budget', label:'Open Budget'}},
    {lead:'Ask about corkage and cake-cutting fees.', body:'Bringing your own alcohol or external wedding cake often triggers per-head venue charges.'},
    {lead:'Keep a 10% emergency buffer.', body:'Unforeseen alterations, extra guest meals, or weather hires almost always pop up in the final month.'}
  ]},
  {icon:'vendors', title:'Vendor Research & Contract Red Flags', tagline:'Compare quotes, check the fine print, and keep every contract in one place.', tips:[
    {lead:'Compare at least three quotes per category.', body:'Reviewing multiple suppliers helps you understand fair market pricing and spot what is missing from basic packages.'},
    {lead:'Check cancellation and postponement clauses.', body:'Know exactly what happens to your deposit if you need to reschedule due to illness or extreme weather.'},
    {lead:'Store all quotes and contracts centrally.', body:'Keep vendor contacts, package notes, and signed PDFs organised in one dashboard instead of buried in emails.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Ask who will actually work your wedding.', body:'For larger photography studios or bands, confirm whether the person you meet is the person showing up on the day.'},
    {lead:'Confirm public liability insurance.', body:'Most venues require external vendors like florists, DJs, and photo booths to hold current insurance certificates.'}
  ]},
  {icon:'clock', title:'Stress-Free Day-Of Timeline', tagline:'A run sheet that keeps your wedding day calm, on time and on track.', tips:[
    {lead:'Work backwards from sunset.', body:'Check the exact sunset time for your wedding date with your photographer so you never miss golden hour portraits.'},
    {lead:'Pad hair and makeup by 30 minutes.', body:'Morning prep is the #1 place timelines fall behind — finish getting ready earlier than you think you need to.'},
    {lead:'Share a master timeline with everyone.', body:'Build multiple timelines for your bridal party, vendors, and family — and export them cleanly.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Schedule 10 minutes alone after the ceremony.', body:'Sneak away with your partner for a quiet drink and snack before diving into congratulations and family photos.'},
    {lead:'Keep speeches under 5 minutes each.', body:'Cap toasts and place them between courses so guests stay engaged and hot meals don’t go cold.'}
  ]},
  {icon:'website', title:'Website & Guest Communication', tagline:'Make sure guests know exactly what to expect, long before the day.', tips:[
    {lead:'Launch your website to keep guests informed', body:'Provide guests all the information you couldn’t fit on the invite by creating your free customised wedding website with unionvault.app', link:{page:'website', label:'Open your Website'}},
    {lead:'Include clear dress code examples.', body:'Avoid vague terms — spell out what "smart casual" or "cocktail" means for footwear on grass or sand.'},
    {lead:'Password-protect your event details.', body:'Keep your venue address, schedule, and RSVP form private for invited guests only.'},
    {lead:'Add local transport and parking tips.', body:'Mention rideshare availability, shuttle bus pickup times, and overnight parking rules upfront.'},
    {lead:'Share your wishing well note politely.', body:'Use your website FAQ section to let guests know where gifts or wishing well contributions are welcome.'}
  ]},
  {icon:'moodboard', title:'Moodboard, Colour Palette & Styling Cohesion', tagline:'Keep your colours, flowers and styling looking beautifully cohesive.', tips:[
    {lead:'Pick 2 primary colours and 2 accents.', body:'Limiting your palette keeps florals, stationery, bridesmaids’ outfits, and table linens looking cohesive.'},
    {lead:'Match your styling to your venue.', body:'Work with the existing architecture and lighting of your space instead of spending thousands trying to hide it.'},
    {lead:'Save your inspo in one visual board.', body:'Collect colour swatches, floral ideas, and table styling references alongside your budget.', link:{page:'visionboard', label:'Open Vision Board'}},
    {lead:'Repurpose ceremony flowers at the reception.', body:'Move arbour arrangements and aisle meadows to the bridal table or bar area after the ceremony to double your budget.'},
    {lead:'Test your table lighting at night.', body:'Check how candles, fairy lights, or uplighting look after dark so your reception feels warm rather than dim.'}
  ]},
  {icon:'calendar', title:'Multi-Event Weekend Planning', tagline:'Plan hens, bucks, brunches and every event around the big day without burning out.', tips:[
    {group:'Planning Multiple Events', lead:'Keep pre-wedding events optional.', body:'Make welcome drinks or recovery brunches casual drop-ins so travelling guests don’t feel over-scheduled.'},
    {group:'Planning Multiple Events', lead:'Separate budgets for each celebration.', body:'Track engagement parties, rehearsal dinners, and day-after brunches individually so costs don’t blur together.'},
    {group:'Planning Multiple Events', lead:'Manage every event’s RSVPs in one place.', body:'Invite specific guest groups to your hens, bucks, rehearsal dinner or recovery brunch without cluttering your main wedding list.', link:{page:'events', label:'Open Events'}},
    {group:'Planning Multiple Events', lead:'Delegate hosting duties for pre-events.', body:'Let parents, siblings, or your bridal party coordinate the welcome drinks so you can rest before the big day.'},
    {group:'Planning Multiple Events', lead:'Plan an easy morning-after recovery.', body:'Book a casual café or park picnic with simple catering so you can say goodbye to guests without hosting stress.'},
    {group:'Hens & Bucks', lead:'Poll guests on budget and dates first.', body:'Send a quick anonymous poll before locking in flights or luxury Airbnbs so nobody feels priced out.'},
    {group:'Hens & Bucks', lead:'Host pre-parties at least 3 weeks out.', body:'Scheduling your hens or bucks too close to the wedding risks last-minute illness, sunburn, or exhaustion in wedding photos.'},
    {group:'Hens & Bucks', lead:'Keep guest lists aligned with the wedding.', body:'Avoid inviting people to the hens or bucks party who aren’t invited to the actual wedding unless it’s an explicit workplace send-off.'},
    {group:'Hens & Bucks', lead:'Collect upfront deposits for group bookings.', body:'Have the organiser collect money before paying for boats, buses, or accommodation so one person isn’t left out of pocket.'},
    {group:'Day-After Brunch', lead:'Keep the start time at 10:30 AM or later.', body:'Give yourself and your guests plenty of time to sleep in after a late reception night.'},
    {group:'Day-After Brunch', lead:'Choose a drop-in style over a seated meal.', body:'Coffee, pastries, fruit platters, and bacon-and-egg rolls let guests come and go around their flight times.'},
    {group:'Day-After Brunch', lead:'Pick a casual, self-pay or low-key venue.', body:'Meeting at a local café, surf club, or shady park saves you from hosting or cleaning up a third event.'},
    {group:'Day-After Brunch', lead:'Bring a few extra chairs and sunglasses.', body:'Everyone will appreciate a relaxed, low-pressure space to swap stories from the night before.'}
  ]},
  {icon:'gift', title:'Gifts, Wishing Well & Registry Etiquette', tagline:'Wishing well, registry and thank-yous — handled with grace.', tips:[
    {lead:'Offer both a wishing well and a small registry.', body:'Some traditional guests love buying a physical gift, while others prefer contributing to your honeymoon fund.'},
    {lead:'Secure your card box at the reception.', body:'Place your wishing well in a visible, high-traffic area near the bridal table — never right next to an unguarded exit.'},
    {lead:'Log gifts as you open them.', body:'Record who gave what and track which thank-you cards have been sent.', link:{page:'wishingwell', label:'Open Wishing Well'}},
    {lead:'Assign someone to take cards home.', body:'Ask a trusted parent or best man to lock your wishing well box in a car boot before the after-party starts.'},
    {lead:'Send thank-you notes within 3 months.', body:'Writing five cards a week together makes thanking everyone feel easy instead of overwhelming.'}
  ]},
  {icon:'couple', title:'Couple Planning for a Burnout-Free Wedding', tagline:'Plan as a team, stay connected, and protect your date nights.', tips:[
    {lead:'Create a shared wedding email address.', body:'Keep every supplier quote, invoice, and booking confirmation out of your personal work inboxes.'},
    {lead:'Divide tasks by personal strengths.', body:'Let the spreadsheet lover handle the budget while the visual thinker leads styling and stationery.'},
    {lead:'Sync your planning across both phones.', body:'Give both partners instant access to checklists, budgets, and guest updates anytime.'},
    {lead:'Hold a 30-minute weekly wedding meeting.', body:'Knock over admin tasks in one focused session each week instead of bringing up wedding stress every night.'},
    {lead:'Protect wedding-free date nights.', body:'Make a rule that wedding talk is off-limits during dinner dates so you stay connected as a couple.'}
  ]},
  {icon:'checklist', title:'Bridal Party & Family Management', tagline:'Give everyone a clear role and keep the drama low.', tips:[
    {lead:'Be transparent about bridal party costs.', body:'Tell bridesmaids and groomsmen upfront what outfits, hair, makeup, or travel expenses they are expected to cover.'},
    {lead:'Assign specific day-of roles early.', body:'Give each wedding party member one clear responsibility — like holding rings, wrangling family for photos, or checking vendor arrivals.'},
    {lead:'Keep bridal party tasks organised.', body:'Add attire fittings, hen’s/buck’s milestones, and rehearsal reminders straight into your shared checklist.', link:{page:'checklist', label:'Open Checklist'}},
    {lead:'Give family members a meaningful job.', body:'Ask parents or siblings to handle readings, cake transport, or guestbook setup so they feel included without micromanaging.'},
    {lead:'Send a morning-of info sheet.', body:'Text your bridal party exact arrival times, addresses, and emergency contact numbers two days before the wedding.'}
  ]},
  {icon:'countdown', title:'Final Month & Week-Of Countdown', tagline:'Your last-month checklist for a calm, prepared wedding week.', tips:[
    {lead:'Confirm final numbers 10 days out.', body:'Send your final guest count, dietary list, and seating chart to your venue and caterer before their cutoff.'},
    {lead:'Break in your wedding shoes indoors.', body:'Wear them around the house with thick socks and scuff the smooth soles so you don’t slip on the dance floor.'},
    {lead:'Export your master wedding binder.', body:'Print or save offline copies of your guest list, seating plan, vendor contacts, and timeline for your coordinator.'},
    {lead:'Pack an overnight and emergency kit.', body:'Include stain remover, safety pins, blister plasters, painkillers, phone chargers, and flat dancing shoes.'},
    {lead:'Hand over your phone on wedding morning.', body:'Put a bridesmaid or groomsman in charge of vendor calls so you can be 100% present from start to finish.'}
  ]},
  {icon:'vows', title:'Ceremony Vows & Order of Service', photo:'tip-14', tagline:'Create a heartfelt ceremony that feels personal, clear, and well-paced.', tips:[
    {lead:'Match vow lengths and tones.', body:'Agree beforehand on whether your vows will be traditional, humorous, or deeply sentimental, and aim for about 90 seconds each.'},
    {lead:'Keep the ceremony under 30 minutes.', body:'A tight, well-paced ceremony keeps guests engaged and ensures everyone gets to cocktail hour on time.'},
    {lead:'Do a microphone check before guests arrive.', body:'Ask your celebrant and sound tech to test lapel mics and wind covers so everyone in the back row hears every word.'},
    {lead:'Draft and store vows securely.', body:'Write, edit, and back up your personal vows safely so you never lose a draft.'},
    {lead:'Print vow cards for the altar.', body:'Reading from matching, sturdy card stock looks far better in photos than holding a glowing smartphone.'}
  ]},
  {icon:'catering', title:'Catering, Bar & Dietary Management', photo:'tip-15', tagline:'Keep your guests well-fed, hydrated, and included — whatever they drink.', tips:[
    {group:'Catering & Dietary', lead:'Ask for dietary needs on the RSVP.', body:'Collect allergies, vegan requests, and kids’ meal counts upfront to avoid awkward catering surprises on the night.'},
    {group:'Catering & Dietary', lead:'Serve canapés immediately after the ceremony.', body:'Hungry guests get tired fast, so ensure drinks and roaming food start the moment photos begin.'},
    {group:'Catering & Dietary', lead:'Offer one signature cocktail instead of an open spirits bar.', body:'A custom His & Hers or Theirs & Theirs drink feels special while keeping bar tabs predictable.'},
    {group:'Catering & Dietary', lead:'Export dietary summaries in one click.', body:'Generate a clean, categorised catering report straight from your guest list to send to your head chef.', link:{page:'guests', label:'Open Guest List'}},
    {group:'Catering & Dietary', lead:'Order late-night snacks for dance-floor energy.', body:'Mini sliders, wood-fired pizza, or toasties at 10:00 PM keep energy high and help guests pace their drinks.'},
    {group:'Bar & Non-Alcoholic', lead:'Offer elevated zero-proof cocktails and sparkling teas.', body:'Stock non-alcoholic prosecco, craft zero-alcohol beers, and botanical spritzes rather than just soft drink and juice.'},
    {group:'Bar & Non-Alcoholic', lead:'Ensure bar staff serve zero-proof drinks in proper glassware.', body:'Serving mocktails in real coupe or rocks glasses makes non-drinkers feel included in every toast.'},
    {group:'Bar & Non-Alcoholic', lead:'Note non-alcoholic preferences in your catering counts.', body:'Track alcohol-free guests alongside dietary requirements so you order the right beverage ratios.', link:{page:'guests', label:'Open Guest List'}},
    {group:'Bar & Non-Alcoholic', lead:'Keep chilled water stations accessible on every table.', body:'Place carafes of still and sparkling water within easy reach so guests stay hydrated between speeches.'},
    {group:'Bar & Non-Alcoholic', lead:'Include a zero-proof toast option at every place setting.', body:'Ask waitstaff to pour non-alcoholic bubbles automatically for nominated guests before speeches begin.'}
  ]},
  {icon:'camera', title:'Photography & Videography Shot Lists', photo:'tip-16', tagline:'Capture every meaningful moment without spending hours away from your party.', tips:[
    {lead:'Cap formal family photos at 10 groupings.', body:'Keep family portraits to immediate relatives so you aren’t stuck posing for an hour during cocktail hour.'},
    {lead:'Assign a loud family photo wrangler.', body:'Pick one cousin or sibling who knows both sides of the family to gather people quickly for group shots.'},
    {lead:'Share your shot list before wedding week.', body:'Organise your must-have family combinations and special moments to share directly with your photographer.'},
    {lead:'Schedule an unplugged ceremony.', body:'Ask your celebrant to remind guests to put phones away so iPads don’t block your professional aisle photos.'},
    {lead:'Plan a 5-minute night portrait.', body:'Step outside after dark for a quick flash or sparkler photo while guests are busy on the dance floor.'}
  ]},
  {icon:'music', title:'Reception Music, DJ & Dance Floor Flow', photo:'tip-17', tagline:'Build an unforgettable soundtrack that keeps every generation dancing.', tips:[
    {lead:'Collect song requests on your RSVP form.', body:'Ask guests for one track guaranteed to get them on the dance floor to help build your DJ’s playlist.'},
    {lead:'Front-load your crowd-pleasers.', body:'Play universally loved classics right after the first dance so older relatives and kids join in before heading home.'},
    {lead:'Create a strict “Do Not Play” list.', body:'Save your song requests and banned tracks inside your vendor notes so your band or DJ never misses the brief.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Confirm venue sound limits early.', body:'Check whether your venue enforces decibel cutoffs or requires acoustic music after a certain hour.'},
    {lead:'Keep formal dances short.', body:'Fade out your first dance or parent dances around the 90-second mark before inviting everyone else onto the floor.'}
  ]},
  {icon:'weather', title:'Weather & Seasonal Planning', photo:'tip-18', tagline:'Stay calm, cool or cosy whatever the forecast brings on the day.', tips:[
    {group:'Outdoor Contingency', lead:'Book a Plan B space you actually like.', body:'Ensure your indoor wet-weather backup feels intentional rather than like a last-minute conference room.'},
    {group:'Outdoor Contingency', lead:'Order clear umbrellas in bulk.', body:'Matching transparent umbrellas protect hair and outfits while still letting natural light through for great rainy-day photos.'},
    {group:'Outdoor Contingency', lead:'Add weather contact info to your run sheet.', body:'Store marquee hire and venue coordinator numbers in your emergency contacts for fast morning-of decisions.'},
    {group:'Outdoor Contingency', lead:'Account for wind and uneven ground.', body:'Supply heel protectors for grassy lawns and swap tall, lightweight taper candles for sturdy hurricane vases.'},
    {group:'Hot Weather', lead:'Provide shade and water for summer ceremonies.', body:'Set up parasols, handheld fans, and iced water stations if guests will sit in direct sun.'},
    {group:'Hot Weather', lead:'Schedule outdoor ceremonies for late afternoon.', body:'Avoid the harsh midday sun between 12:00 PM and 3:00 PM for guest comfort and softer portrait lighting.'},
    {group:'Hot Weather', lead:'Set up self-serve hydration and sunscreen stations.', body:'Offer chilled water dispensers, electrolyte sachets, and spray sunscreen near the ceremony entrance.'},
    {group:'Hot Weather', lead:'Share heat-smart dress code tips early.', body:'Advise guests on breathable fabrics and sun-safe footwear through your event FAQ page.', link:{page:'website', label:'Open your Website'}},
    {group:'Hot Weather', lead:'Choose heat-hardy flowers and sturdy icing.', body:'Ask your florist for blooms like orchids, roses, or natives, and opt for fondant or ganache over soft buttercream.'},
    {group:'Hot Weather', lead:'Provide handheld fans or paper programs.', body:'Doubles as a ceremony order of service and an instant breeze while guests wait for the aisle walk.'},
    {group:'Cold Weather', lead:'Account for early sunset times in your timeline.', body:'Winter sun drops fast, so plan your ceremony early enough to capture outdoor portraits in daylight.'},
    {group:'Cold Weather', lead:'Provide pashminas, blankets, or outdoor heaters.', body:'Keep a basket of warm wraps near outdoor cocktail areas so guests stay comfortable between venues.'},
    {group:'Cold Weather', lead:'Highlight warm arrival drinks and coat check info.', body:'Let guests know where to store heavy coats and umbrellas on your digital schedule.', link:{page:'website', label:'Open your Website'}},
    {group:'Cold Weather', lead:'Swap iced welcome drinks for mulled wine or hot cider.', body:'Seasonal warmers immediately set a cosy mood as guests arrive from the cold.'},
    {group:'Cold Weather', lead:'Build extra buffer time for winter travel.', body:'Rain, fog, or icy roads can slow down supplier deliveries and guest arrivals, so pad your morning schedule.'}
  ]},
  {icon:'kids', title:'Kids & Family-Friendly Wedding Tips', photo:'tip-19', tagline:'Make sure your littlest guests—and their parents—have a relaxed, fun celebration.', tips:[
    {lead:'Be crystal clear about child invites.', body:'Address invitations specifically to the parents’ names or list every invited child clearly so there is zero confusion.'},
    {lead:'Seat families near exits and restrooms.', body:'Give parents easy access to prams, highchairs, and quick breaks without disrupting speeches.'},
    {lead:'Track kids’ meals and highchairs automatically.', body:'Filter your guest list by age group and meal preference before finalising your floorplan.', link:{page:'guests', label:'Open Guest List'}},
    {lead:'Set up a quiet kids’ activity corner.', body:'Stock a small table with colouring books, stickers, and quiet games to keep children entertained during dinner.'},
    {lead:'Hire a group babysitter on-site.', body:'For weddings with lots of toddlers, booking a vetted sitter in an adjacent room lets parents relax and dance.'}
  ]},
  {icon:'plane', title:'Destination & Out-of-Town Guest Experience', photo:'tip-20', tagline:'Help travelling loved ones feel welcomed, informed, and stress-free from arrival to departure.', tips:[
    {lead:'Send Save-the-Dates 9 to 12 months early.', body:'Give interstate or overseas guests plenty of time to lock in annual leave and affordable airfares.'},
    {lead:'Reserve a hotel room block early.', body:'Negotiate discounted group rates near your reception venue and share the booking code before rooms sell out.'},
    {lead:'Centralise travel and accommodation guides.', body:'Publish airport transfer tips, hotel links, and local recommendations straight to your guest hub.', link:{page:'website', label:'Open your Website'}},
    {lead:'Skip bulky welcome bags for practical treats.', body:'Leave bottled water, local snacks, and a printed weekend schedule at hotel check-in rather than heavy souvenirs.'},
    {lead:'Arrange group transport to remote venues.', body:'Chartering a shuttle bus from the main hotel hub saves guests from navigating unfamiliar country roads at night.'}
  ]},
  {icon:'attire', title:'Wedding Attire, Fittings & Alterations', photo:'tip-21', tagline:'Ensure everyone looks sharp, feels comfortable, and avoids last-minute tailoring panic.', tips:[
    {lead:'Book alterations 8 to 10 weeks out.', body:'Give your tailor enough time for two or three fittings without paying urgent rush fees.'},
    {lead:'Bring your exact wedding shoes and undergarments.', body:'Hem lengths and bodice fits depend entirely on the exact heel height and shapewear you wear on the day.'},
    {lead:'Track fitting dates and balances in one spot.', body:'Log garment deposits, alteration appointments, and final pickup dates inside your timeline.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Practise sitting, hugging, and dancing at your final fitting.', body:'Make sure you can raise your arms, sit comfortably for dinner, and bustle your train easily.'},
    {lead:'Steam outfits the day before—not the morning of.', body:'Hang dresses and suits high away from pets and food, and keep a handheld steamer handy for minor creases.'}
  ]},
  {icon:'florals', title:'Florals & Seasonal Greenery Strategy', photo:'tip-22', tagline:'Get lush, high-impact floral styling without blowing out your décor budget.', tips:[
    {lead:'Choose flowers currently in season.', body:'Locally grown, seasonal blooms cost significantly less, look fresher, and hold up better in the day’s weather.'},
    {lead:'Prioritise high-impact focal points.', body:'Invest in one showstopping installation—like a ceremony arbour or hanging bar piece—rather than scattering tiny vases everywhere.'},
    {lead:'Share floral moodboards and budgets together.', body:'Keep florist quotes, stem counts, and inspiration photos organised side-by-side.', link:{page:'visionboard', label:'Open Vision Board'}},
    {lead:'Use greenery and candles to fill long tables.', body:'Lush foliage runners paired with bud vases create a rich, romantic look at a fraction of dense floral costs.'},
    {lead:'Plan what happens to flowers after midnight.', body:'Assign a family member to collect arrangements for nursing homes, brunch tables, or guests to take home.'}
  ]},
  {icon:'stationery', title:'Stationery, Signage & Table Numbers', photo:'tip-23', tagline:'Guide your guests smoothly with cohesive paper goods and clear wayfinding.', tips:[
    {lead:'Order stationery 4 to 5 months early.', body:'Factor in design proofs, printing lead times, and postage delays before your RSVP deadline approaches.'},
    {lead:'Triple-check spelling on every proof.', body:'Have two fresh pairs of eyes review dates, venue addresses, and guest names before approving print runs.'},
    {lead:'Export clean guest lists for your stationer.', body:'Download formatted names and table assignments directly from your seating plan to avoid manual typing errors on place cards.', link:{page:'seating', label:'Open Seating Plan'}},
    {lead:'Keep signage short and easy to read.', body:'Use high-contrast fonts on welcome signs and seating charts so guests can scan them quickly in dim lighting.'},
    {lead:'Add dietary icons to place cards.', body:'Subtle symbols for vegan, gluten-free, or nut-free meals help waitstaff deliver the right plates smoothly.'}
  ]},
  {icon:'eco', title:'Eco-Friendly & Low-Waste Wedding Ideas', photo:'tip-24', tagline:'Celebrate sustainably while saving money on single-use wedding clutter.', tips:[
    {lead:'Go digital with Save-the-Dates and RSVPs.', body:'Cut down on paper waste and postage costs by sending sleek digital invites through your website.', link:{page:'website', label:'Open your Website'}},
    {lead:'Rent instead of buying bulk décor.', body:'Hire arches, tableware, linen napkins, and candleholders rather than storing 100 vases after the wedding.'},
    {lead:'Skip floral foam for reusable mechanics.', body:'Ask your florist to use chicken wire, pin frogs, or water-filled vessels instead of non-biodegradable green foam.'},
    {lead:'Choose biodegradable confetti.', body:'Dried flower petals, hole-punched leaves, or lavender buds look gorgeous in photos and won’t harm venue gardens.'},
    {lead:'Donate leftover food or florals.', body:'Arrange with your caterer or a local charity beforehand to rescue untouched platters and arrangements after the reception.'}
  ]},
  {icon:'legal', title:'Legal Paperwork & Marriage Logistics', photo:'tip-25', tagline:'Tick off the official requirements early so your marriage is legally locked in.', tips:[
    {lead:'Lodge your Notice of Intended Marriage on time.', body:'In Australia, your NOIM must be submitted to your celebrant at least one full month before your wedding date.'},
    {lead:'Gather original ID documents early.', body:'Locate passports, official birth certificates, or divorce/name-change paperwork well ahead of your legal meeting.'},
    {lead:'Store legal deadlines in your master checklist.', body:'Set automated reminders for witness confirmations and certificate applications.', link:{page:'checklist', label:'Open Checklist'}},
    {lead:'Confirm your two legal witnesses.', body:'Choose two guests aged 18 or over and remind them to stay sober enough to sign cleanly after the ceremony.'},
    {lead:'Order your official registry certificate.', body:'The commemorative certificate signed on the day isn’t valid for ID updates—apply for the official BDM certificate afterward.'}
  ]},
  {icon:'blended', title:'Multicultural & Blended Tradition Weddings', photo:'tip-26', tagline:'Honour different family backgrounds and create a seamless celebration for everyone.', tips:[
    {lead:'Explain cultural rituals in your program.', body:'A short note in your order of service helps guests understand the meaning behind tea ceremonies, jumping the broom, or blessing rituals.'},
    {lead:'Balance music and food across both cultures.', body:'Blend traditional dishes and classic songs from each side so every relative feels seen and celebrated.'},
    {lead:'Coordinate multi-part schedules clearly.', body:'Map out morning cultural ceremonies and evening receptions on a shared master timeline.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Brief your photographer on key ceremonial moments.', body:'Tell your photo team which traditions happen fast so they are positioned correctly for every blessing or exchange.'},
    {lead:'Appoint a bilingual MC or co-hosts.', body:'Having an MC who can welcome guests and translate key toasts keeps the entire room connected.'}
  ]},
  {icon:'beauty', title:'Bridal Beauty, Hair & Wellness Prep', photo:'tip-27', tagline:'Look and feel refreshed, confident, and comfortable from morning photos to last call.', tips:[
    {lead:'Book your hair and makeup trial 2 to 3 months out.', body:'Wear a white or light-coloured top to your trial and take photos in natural daylight to check how colours read.'},
    {lead:'Avoid drastic skincare treatments in wedding week.', body:'Skip brand-new facials, chemical peels, or unfamiliar products in the final 14 days to prevent unexpected breakouts.'},
    {lead:'Keep supplier schedules synced in one place.', body:'Share exact chair times and stylist contact details with your bridal party.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Pack a touch-up pouch for the reception.', body:'Keep blotting paper, translucent powder, lip colour, and bobby pins with your maid of honour for quick photo refreshes.'},
    {lead:'Prioritise sleep and hydration all week.', body:'Drinking plenty of water and getting proper rest does more for wedding-day glow than any last-minute treatment.'}
  ]},
  {icon:'walkthrough', title:'Rehearsal & Pre-Wedding Walkthrough', photo:'tip-28', tagline:'Iron out the logistics beforehand so nobody feels confused on the wedding day.', tips:[
    {lead:'Run through the ceremony at the actual venue.', body:'Practise walking speeds, standing positions, and music cues on-site a day or two before the wedding.'},
    {lead:'Include everyone walking down the aisle.', body:'Bring parents, flower girls, ring bearers, and ushers to the rehearsal so everyone knows their exact cue.'},
    {lead:'Share your digital floorplan at the walkthrough.', body:'Pull up your seating layout and ceremony setup notes to confirm table placements with venue staff.', link:{page:'seating', label:'Open Seating Plan'}},
    {lead:'Drop off décor boxes the day before.', body:'Deliver place cards, wishing wells, signage, and guestbooks early so you aren’t hauling boxes in wedding attire.'},
    {lead:'Keep the rehearsal dinner early and relaxed.', body:'Wrap up dinner by 9:00 PM so you and your wedding party get a full night’s sleep before the big morning.'}
  ]},
  {icon:'tag', title:'Favours & Meaningful Guest Keepsakes', photo:'tip-29', tagline:'Give guests something they will genuinely enjoy—or skip favours altogether without guilt.', tips:[
    {lead:'Choose edible or drinkable favours.', body:'Mini jars of local honey, custom biscuits, or small-batch coffee beans rarely get left behind on tables.'},
    {lead:'Make your place cards double as keepsakes.', body:'Handwritten calligraphy tags, custom luggage tags, or mini potted succulents save table space and budget.'},
    {lead:'Track favour counts accurately before ordering.', body:'Use your confirmed RSVP headcount so you don’t over-order personalised items.', link:{page:'rsvp-mgr', label:'Open RSVP & Invites'}},
    {lead:'Skip generic trinkets with your names and date.', body:'Guests rarely use items stamped with someone else’s wedding date—put that money toward better wine or late-night food instead.'},
    {lead:'Consider a charity donation in lieu of favours.', body:'Display a tasteful sign at the bar letting guests know you donated to a cause close to your hearts.'}
  ]},
  {icon:'mic', title:'Speeches, Toasts & MC Preparation', photo:'tip-30', tagline:'Set your speakers up for success so speeches are warm, funny, and memorable.', tips:[
    {lead:'Brief your MC like a true event host.', body:'Give your MC a clear pronunciation guide for names, key house rules, and exact timing cues for every transition.'},
    {lead:'Set a firm 3-to-5-minute limit per speaker.', body:'Let speakers know the time cap upfront so toasts stay punchy, heartfelt, and respectful of catering schedules.'},
    {lead:'Organise your run-of-show and speaker order.', body:'Sequence your toasts, cake cutting, and first dance cleanly inside your reception timeline.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Encourage speakers to print their notes.', body:'Reading off cue cards looks cleaner than squinting at a phone and prevents dead air if a screen locks mid-toast.'},
    {lead:'Have a trusted friend review wild best-man jokes.', body:'A quick pre-check ensures roasts stay affectionate and fun rather than embarrassing in front of grandparents.'}
  ]},
  {icon:'cocktail', title:'Cocktail Hour Flow & Guest Mingling', photo:'tip-31', tagline:'Keep the energy buzzing while you slip away for newlywed portraits.', tips:[
    {lead:'Offer plenty of seating and shade.', body:'Not everyone wants to stand in heels for 90 minutes—include cocktail tables, benches, and shaded areas.'},
    {lead:'Put out drinks before guests arrive.', body:'Have welcome bubbles, beer, and non-alcoholic spritzes pre-poured on trays so there isn’t a 20-minute queue at the bar.'},
    {lead:'Keep guests updated on the day’s flow.', body:'Display a welcome schedule or share live event updates through your wedding page.', link:{page:'website', label:'Open your Website'}},
    {lead:'Add subtle background music or lawn games.', body:'An acoustic solo artist or low-key games like giant Jenga help different friend groups break the ice naturally.'},
    {lead:'Set up a grazing station near the bar.', body:'Cheese boards and antipasto platters give guests something to nibble on immediately while roaming canapés circulate.'}
  ]},
  {icon:'lighting', title:'Lighting, Sound & Reception Atmosphere', photo:'tip-32', tagline:'Transform your venue from bright daytime space to warm evening celebration.', tips:[
    {lead:'Dim overhead lights as soon as dinner starts.', body:'Harsh fluorescent or bright ceiling lights kill reception ambiance—switch to warm uplights, festoons, or candles at dusk.'},
    {lead:'Ensure speech microphones reach every corner.', body:'Ask your venue or AV team if the dining room needs satellite speakers so guests at far tables don’t miss toasts.'},
    {lead:'Note venue AV specs in your vendor hub.', body:'Store power requirements, bump-in times, and lighting rules so your DJ and band arrive prepared.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Light up pathways and outdoor exits.', body:'Place solar stakes, lanterns, or fairy lights along garden paths and steps so guests can navigate safely at night.'},
    {lead:'Keep the dance floor compact.', body:'A slightly smaller dance floor packs people together and feels energetic, whereas a huge floor can make a lively crowd look sparse.'}
  ]},
  {icon:'keepsake', title:'Post-Wedding Wrap-Up & Admin', photo:'tip-33', tagline:'Close out vendor loose ends and legal admin without losing a single thread.', tips:[
    {group:'Keepsakes & Vendors', lead:'Book bouquet preservation before the wedding.', body:'Floral pressing or resin preservation studios fill up months in advance and require fresh blooms within days.'},
    {group:'Keepsakes & Vendors', lead:'Clean your wedding dress within two weeks.', body:'Sweat, champagne, and grass stains set permanently if left untreated in a garment bag for months.'},
    {group:'Keepsakes & Vendors', lead:'Close out final vendor payments and reviews.', body:'Check off any remaining balances and export your completed wedding records.', link:{page:'vendors', label:'Open Vendors'}},
    {group:'Keepsakes & Vendors', lead:'Back up your photos and videos in three places.', body:'Save your full gallery to a cloud drive, an external hard drive, and a computer as soon as your photographer delivers it.'},
    {group:'Keepsakes & Vendors', lead:'Order a printed wedding album early.', body:'Curate your top 60 to 80 photos while the memories are fresh so your gallery doesn’t stay trapped on a hard drive forever.'},
    {group:'Legal & Name Change', lead:'Order two copies of your official marriage certificate.', body:'Having a spare certified copy speeds up updates across banks, passports, and government agencies.'},
    {group:'Legal & Name Change', lead:'Update your primary photo ID first.', body:'Start with your driver’s licence and passport, as most banks and utilities require updated photo ID before changing account names.'},
    {group:'Legal & Name Change', lead:'Keep a master list of accounts to update.', body:'Track super funds, Medicare, electoral roll, insurance policies, and subscriptions in your post-wedding notes.', link:{page:'checklist', label:'Open Checklist'}},
    {group:'Legal & Name Change', lead:'Wait until after your honeymoon to change passports.', body:'International flights and hotel check-ins must match your passport name—save the passport renewal for when you return.'},
    {group:'Legal & Name Change', lead:'Set up a joint email or filing folder for shared bills.', body:'Consolidating household utilities, insurance, and mortgage accounts makes newlywed admin effortless.'}
  ]},
  {icon:'honeymoon', title:'Honeymoon Planning & Post-Wedding Travel', photo:'tip-34', tagline:'Plan an effortless romantic getaway without packing stress the morning after your wedding.', tips:[
    {lead:'Give yourselves a 24-hour buffer before flying.', body:'Flying out the day after your reception leaves zero room for hangovers, gift drop-offs, or flight delays—wait two days if possible.'},
    {lead:'Book flights under your current passport name.', body:'Wait until after your honeymoon to change your legal surname so your flight tickets match your passport exactly.'},
    {lead:'Track travel bookings alongside wedding admin.', body:'Store flight confirmations, resort vouchers, and itinerary notes inside a dedicated folder.'},
    {lead:'Pack your honeymoon bags three days early.', body:'Finish packing before wedding week starts so you aren’t hunting for swimwear at midnight after your rehearsal dinner.'},
    {lead:'Mention it’s your honeymoon everywhere.', body:'Flag your booking with airlines, hotels, and restaurants ahead of time for complimentary room upgrades, bubbles, or dessert treats.'}
  ]},
  {icon:'elopement', title:'Elopements & Micro-Weddings', photo:'tip-36', tagline:'Strip away the big-wedding fuss while keeping the day deeply intentional and memorable.', tips:[
    {lead:'Invest in an incredible photographer and videographer.', body:'With a tiny guest list, high-end photo and video coverage lets you share the magic with everyone back home.'},
    {lead:'Scout locations at the exact ceremony hour.', body:'Visit your cliffside, beach, or forest spot at the same time of day to check tides, sun glare, and weekend crowds.'},
    {lead:'Keep witnesses and legal paperwork sorted.', body:'Even an intimate elopement requires two witnesses over 18—arrange for your photographer and celebrant to sign if needed.'},
    {lead:'Send marriage announcements afterward.', body:'Use your digital hub to share photos, a ceremony video, and a post-elopement party invite with extended family.', link:{page:'website', label:'Open your Website'}},
    {lead:'Splurge on an unforgettable dining experience.', body:'Book a private chef or a degustation table at a top restaurant to celebrate right after you sign the register.'}
  ]},
  {icon:'pets', title:'Including Pets in Your Wedding Day', photo:'tip-37', tagline:'Bring your furry best friend along safely without adding extra stress to your schedule.', tips:[
    {lead:'Check venue pet rules before booking.', body:'Confirm whether animals are allowed indoors, during catering service, or only for outdoor ceremony photos.'},
    {lead:'Hire a dedicated wedding pet handler.', body:'Book a professional pet sitter or ask a non-guest friend to transport, walk, and take your dog home after portraits.'},
    {lead:'Do a practice visit with your pet.', body:'Bring your dog to the venue beforehand so unfamiliar smells, crowds, and camera flashes don’t overwhelm them on the day.'},
    {lead:'Add pet timings to your master run sheet.', body:'Schedule exact arrival and pickup windows so your pet only stays for the calmest 45 minutes.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Pack water, treats, and lint rollers.', body:'Keep treats near the photographer for attention, and pack a sticky roller for dark suits before your pet goes home.'}
  ]},
  {icon:'ring', title:'Engagement Party & Save-the-Date Etiquette', photo:'tip-38', tagline:'Kick off your engagement smoothly without accidentally over-committing your wedding guest list.', tips:[
    {lead:'Lock in your wedding headcount before inviting.', body:'Everyone invited to your engagement party will reasonably expect a wedding invite later, so draft your guest list first.'},
    {lead:'Keep the engagement party relaxed and low-cost.', body:'Save your major styling and catering budget for the wedding day by hosting a casual cocktail party or backyard afternoon.'},
    {lead:'Launch your digital guest list early.', body:'Collect addresses, emails, and phone numbers at your engagement party straight away.', link:{page:'guests', label:'Open Guest List'}},
    {lead:'Send Save-the-Dates 6 to 8 months out.', body:'Give guests plenty of notice for local weddings—and up to 12 months if your wedding falls on a long weekend or destination.'},
    {lead:'Skip engagement gift expectations.', body:'Add a warm note letting guests know their company is the only gift you need so nobody feels pressured to buy twice.'}
  ]},
  {icon:'cake', title:'Cake, Dessert Bars & Late-Night Sweets', photo:'tip-39', tagline:'Make sure your wedding cake looks great, tastes fresh, and actually gets eaten.', tips:[
    {lead:'Size your cake for 70% of your guest list.', body:'Not everyone eats dessert after a big dinner, so order a slightly smaller tier to avoid throwing away half your cake.'},
    {lead:'Ask your caterer about cakeage fees.', body:'Some venues charge per plate to slice and serve an external cake—serving it on a grazing table with napkins often avoids this fee.'},
    {lead:'Keep buttercream cakes out of direct sun.', body:'Store delicate cakes in a cool room until 20 minutes before cutting so icing doesn’t slump in summer heat.'},
    {lead:'Log cake delivery and dietary details clearly.', body:'Note gluten-free or vegan tiers and supplier arrival times inside your vendor dashboard.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Cut your cake right before the dance floor opens.', body:'Grouping cake cutting with speeches keeps momentum rolling without interrupting guests mid-meal.'}
  ]},
  {icon:'blended', title:'Second-Time Weddings & Blended Families', photo:'tip-40', tagline:'Honour your history and involve children meaningfully in your new chapter together.', tips:[
    {lead:'Include children in the ceremony naturally.', body:'Invite kids to walk you down the aisle, carry rings, or participate in a unity ritual so they feel central to the day.'},
    {lead:'Ditch traditions that don’t fit your story.', body:'Skip garter tosses, veil reveals, or formal receiving lines in favour of moments that reflect who you are now.'},
    {lead:'Coordinate family seating with care.', body:'Use the interactive floorplan tool to balance blended family dynamics comfortably across tables.', link:{page:'seating', label:'Open Seating Plan'}},
    {lead:'Give kids a special toast or mention.', body:'Acknowledging your children during speeches reinforces that you are celebrating a whole family coming together.'},
    {lead:'Keep registry items practical or experience-based.', body:'Since you likely already have household essentials, opt for a honeymoon fund, art piece, or charity donation instead.'}
  ]},
  {icon:'sunrise', title:'Morning-Of Prep & Getting Ready Logistics', photo:'tip-41', tagline:'Set a calm, joyful tone from the moment you wake up on your wedding morning.', tips:[
    {lead:'Choose a bright, clutter-free getting-ready room.', body:'Natural window light and tidy surfaces make morning hair, makeup, and dress photos look clean and editorial.'},
    {lead:'Order breakfast and lunch platters the day before.', body:'Have fresh fruit, pastries, wraps, and plenty of water delivered early so nobody gets lightheaded before the ceremony.'},
    {lead:'Keep morning schedules visible to everyone.', body:'Share hair and makeup chair order and photographer arrival times so nobody runs late.', link:{page:'timeline', label:'Open Timelines'}},
    {lead:'Wear button-down shirts or loose robes.', body:'Avoid tight T-shirts or pullovers that ruin fresh hair and makeup when changing into wedding outfits.'},
    {lead:'Hide suitcases and snacks in a separate room.', body:'Designate one bedroom or bathroom as a “bag dump zone” so clutter stays out of every photo frame.'}
  ]},
  {icon:'shield', title:'Wedding Insurance & Financial Protection', photo:'tip-42', tagline:'Protect your deposits and peace of mind against unexpected hiccups.', tips:[
    {lead:'Take out wedding insurance as soon as deposits are paid.', body:'Cover protects you from the moment you start booking suppliers—not just during wedding week.'},
    {lead:'Check what your policy actually covers.', body:'Read the fine print for supplier bankruptcy, severe weather postponement, attire damage, and public liability.'},
    {lead:'Store policy numbers and receipts together.', body:'Keep insurance certificates alongside your supplier contracts and payment logs.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Pay major deposits by credit card.', body:'Using a card with purchase protection adds an extra layer of chargeback security if a vendor goes bust.'},
    {lead:'Verify venue liability requirements early.', body:'Check whether your venue’s insurance covers guest accidents or if you need standalone event liability cover.'}
  ]},
  {icon:'scissors', title:'DIY Weddings & Handmade Décor', photo:'tip-44', tagline:'Add personal touches without spending your wedding week glued to a hot-glue gun.', tips:[
    {lead:'Finish all DIY projects two weeks before the wedding.', body:'Keep wedding week strictly for relaxing and final logistics rather than painting signs at midnight.'},
    {lead:'Price out materials before committing to DIY.', body:'Factor in glue, tools, practice runs, and your time—hiring items is often cheaper than buying raw supplies.'},
    {lead:'Track DIY supply costs in your main budget.', body:'Log craft store receipts and print orders inside your budget tracker so small spends don’t sneak up on you.', link:{page:'budget', label:'Open Budget'}},
    {lead:'Pack DIY items in labelled, clear plastic tubs.', body:'Group signage, candles, and table numbers by area with a photo of how each table should look for easy setup.'},
    {lead:'Assign a pack-down crew for the end of the night.', body:'Venues usually require all personal décor removed at midnight, so nominate two helpers with a large car beforehand.'}
  ]},
  {icon:'info', title:'Wedding Guest Etiquette (Shareable Guide)', photo:'tip-47', tagline:'A polite, helpful checklist you can share with guests so the day runs smoothly for everyone.', tips:[
    {lead:'RSVP before the deadline—even if you can’t make it.', body:'Catering numbers and seating plans lock in weeks early, so reply promptly either way.'},
    {lead:'Never bring an uninvited plus-one or extra child.', body:'Check your invitation envelope or digital RSVP form to see exactly who is included in your party.', link:{page:'rsvp-mgr', label:'Open RSVP & Invites'}},
    {lead:'Keep phones tucked away during the ceremony.', body:'Let the professional photographer capture the aisle moments without screens blocking the view.'},
    {lead:'Don’t wear white, ivory, or bridal-adjacent shades.', body:'Unless the dress code specifically asks for all-white attire, leave those colours exclusively for the couple.'},
    {lead:'Hold off on posting photos until the couple shares first.', body:'Give the newlyweds the joy of sharing the first official snaps of their outfits and vows online.'}
  ]},
  {icon:'venue', title:'Backyard, Marquee & Blank-Canvas Venues', photo:'tip-48', tagline:'Build a custom wedding space from scratch without missing crucial behind-the-scenes utilities.', tips:[
    {lead:'Confirm power, water, and generator capacity.', body:'Marquee lighting, catering ovens, and DJ decks require heavy power—hire a silent generator if mains won’t cope.'},
    {lead:'Hire one luxury portable bathroom per 50 guests.', body:'Standard festival loos spoil formal outfits, so book trailer bathrooms with running water and lighting.'},
    {lead:'Centralise supplier bump-in and delivery windows.', body:'Map out marquee installation, cool-room drop-offs, and furniture hire inside your master schedule.', link:{page:'vendors', label:'Open Vendors'}},
    {lead:'Book a cold room or extra ice deliveries.', body:'Blank-canvas venues rarely have commercial fridge space for hundreds of drinks and catering platters.'},
    {lead:'Check local council noise curfews and neighbour notices.', body:'Give nearby neighbours a friendly heads-up with your contact number and wrap up loud bass by curfew.'}
  ]},
  {icon:'streaming', title:'Wedding Live-Streaming & Virtual Guests', photo:'tip-49', tagline:'Include overseas relatives and loved ones who can’t travel in person.', tips:[
    {lead:'Test internet upload speeds at the ceremony spot.', body:'Remote beaches, wineries, and gardens often have weak reception, so check signal strength ahead of time.'},
    {lead:'Assign one dedicated person to manage the stream.', body:'Ask a tech-savvy friend or hire a videographer to hold the tripod and monitor audio—never rely on the bridal party.'},
    {lead:'Share your private stream link securely.', body:'Post the viewing link, timezone details, and digital guestbook inside your password-protected hub.', link:{page:'website', label:'Open your Website'}},
    {lead:'Place the camera near a speaker or audio feed.', body:'Wind noise ruins phone microphones, so position your streaming device close to the celebrant’s PA system.'},
    {lead:'Say a quick hello to the camera after signing.', body:'Looking straight into the lens for a wave and smile makes virtual guests feel genuinely part of the moment.'}
  ]},
  {icon:'hashtag', title:'Social Media, Hashtags & Guest Photo Sharing', photo:'tip-50', tagline:'Collect candid guest photos effortlessly without turning your reception into a phone screen sea.', tips:[
    {lead:'Set up a shared QR code photo album.', body:'Place small cards on reception tables so guests can upload candid photos and videos directly into one folder.'},
    {lead:'Share your photo-upload link post-wedding.', body:'Add your shared gallery link to your guest hub so everyone can browse and upload after the weekend.', link:{page:'website', label:'Open your Website'}},
    {lead:'Pick a short, easy-to-spell wedding hashtag.', body:'Avoid complicated puns or long strings of numbers that guests will misspell after a few glasses of champagne.'},
    {lead:'Appoint a designated behind-the-scenes content creator.', body:'Ask a bridesmaid or hire a creator to capture vertical phone clips of morning prep and the first dance.'},
    {lead:'Clarify your social media preferences politely.', body:'A quick note from your MC or on your welcome sign lets guests know if you prefer unplugged or delayed posting.'}
  ]},
  {icon:'care', title:'Accessibility & Older Guest Comfort', photo:'tip-52', tagline:'Ensure grandparents, mobility-aid users, and neurodivergent guests can enjoy every part of the day.', tips:[
    {lead:'Check step-free access from parking to reception.', body:'Confirm ramps, lifts, and accessible restrooms are clear and close to the main celebration spaces.'},
    {lead:'Reserve front-row seats for older or hard-of-hearing guests.', body:'Seating grandparents right near the ceremony action helps them see and hear vows clearly.'},
    {lead:'Collect accessibility notes during the RSVP process.', body:'Add an optional support field to your digital RSVP form to plan seating and transport early.', link:{page:'rsvp-mgr', label:'Open RSVP & Invites'}},
    {lead:'Offer a quiet breakout space away from loud music.', body:'Designate a lounge or veranda where older relatives or sensory-sensitive guests can rest during the dance party.'},
    {lead:'Arrange door-to-door transport for elderly relatives.', body:'Assign a trusted family member to drive grandparents home early if they get tired before the reception ends.'}
  ]}
];
let _tipsOpenCat=null;
let _tipsFocusTip=null;
// Set only inside the standalone public page (_showPublicTipsLibrary) — same data and
// HTML-builders as the signed-in app's Tips page, just routed to a different opener/closer
// so nothing here ever calls navigate() or touches STATE.
let _tipsPublicMode=false;
function renderTips(c,actions){
  actions.innerHTML='';
  if(_tipsOpenCat==null){
    c.innerHTML=_tipsGridHtml();
    return;
  }
  c.innerHTML=_tipsDetailHtml(_tipsOpenCat);
  if(_tipsFocusTip!=null){
    const cat=_tipsOpenCat, idx=_tipsFocusTip;
    _tipsFocusTip=null;
    setTimeout(()=>{
      const row=document.getElementById('tip-row-'+cat+'-'+idx);
      if(!row) return;
      row.scrollIntoView({behavior:'smooth',block:'center'});
      row.classList.add('tip-row-hit');
      setTimeout(()=>row.classList.remove('tip-row-hit'),1800);
    },50);
  }
}
function _tipsGridHtml(){
  const rows=TIPS_LIBRARY.map((cat,i)=>`
    <button class="tip-ed-row" onclick="${_tipsPublicMode?`_pubTipsOpen(${i})`:`_tipsOpen(${i})`}">
      <span class="tip-ed-media">
        <img src="/assets/tips/${cat.photo||cat.icon}.jpg" alt="" loading="lazy" onerror="this.style.display='none'" onload="this.nextElementSibling.style.display='none'">
        <span class="tip-ed-icon-fallback"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${TIPS_ICONS[cat.icon]}</svg></span>
      </span>
      <span class="tip-ed-content">
        <span class="tip-ed-num">${String(i+1).padStart(2,'0')} — ${cat.tips.length} TIPS</span>
        <span class="tip-ed-title">${_escHtml(cat.title)}</span>
        <span class="tip-ed-tagline">${_escHtml(cat.tagline)}</span>
        <span class="tip-ed-meta">Explore tips <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
      </span>
    </button>`).join('');
  return `
  <div class="tip-search-wrap">
    <svg class="tip-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="tips-search" placeholder="Search tips — budget, seating, timeline…" oninput="_tipsSearch(this.value)">
  </div>
  <div id="tips-search-results"></div>
  <div id="tips-ed-rows" class="tip-ed-list">${rows}</div>`;
}
function _tipsSearch(q){
  const query=(q||'').trim().toLowerCase();
  const resultsEl=document.getElementById('tips-search-results');
  const rowsEl=document.getElementById('tips-ed-rows');
  if(!resultsEl||!rowsEl) return;
  if(!query){ resultsEl.style.display='none'; resultsEl.innerHTML=''; rowsEl.style.display=''; return; }
  const hits=[];
  TIPS_LIBRARY.forEach((cat,ci)=>{
    cat.tips.forEach((t,ti)=>{
      if(t.lead.toLowerCase().includes(query)||t.body.toLowerCase().includes(query)||cat.title.toLowerCase().includes(query)) hits.push({ci,ti,cat,t});
    });
  });
  rowsEl.style.display='none';
  resultsEl.style.display='';
  if(!hits.length){ resultsEl.innerHTML=`<div class="tip-search-empty">No tips match "${_escHtml(q)}".</div>`; return; }
  resultsEl.innerHTML=hits.map(h=>`
    <div class="tip-row tip-search-hit" onclick="${_tipsPublicMode?`_pubTipsOpen(${h.ci},${h.ti})`:`_tipsOpen(${h.ci},${h.ti})`}">
      <span class="tip-row-num">${h.ti+1}</span>
      <div class="tip-row-body">
        <span class="tip-search-cat">${_escHtml(h.cat.title)}</span>
        <div class="tip-row-lead">${_escHtml(h.t.lead)}</div>
        <div class="tip-row-text">${_escHtml(h.t.body)}</div>
      </div>
    </div>`).join('');
}
function _tipsDetailHtml(i){
  const cat=TIPS_LIBRARY[i]; if(!cat) return '';
  // Some categories merge what used to be two or three separate categories (e.g. Weather
  // & Seasonal Planning folds in the old Summer/Winter ones). `group` marks which of the
  // original topics a tip came from; a header prints only when it changes from the tip
  // before it, so categories with no groups (most of them) render exactly as before.
  let _lastGroup=null;
  const rows=cat.tips.map((t,ti)=>{
    const groupHtml = (t.group && t.group!==_lastGroup) ? `<div class="tip-group-lbl">${_escHtml(t.group)}</div>` : '';
    _lastGroup = t.group || _lastGroup;
    return `${groupHtml}
    <div class="tip-row" id="tip-row-${i}-${ti}">
      <span class="tip-row-num">${ti+1}</span>
      <div class="tip-row-body">
        <div class="tip-row-lead">${_escHtml(t.lead)}</div>
        <div class="tip-row-text">${_escHtml(t.body)}</div>
        ${t.link?`<button class="tip-row-link" onclick="${_tipsPublicMode?`window.location.href='https://unionvault.app/'`:`navigate('${t.link.page}')`}">${_escHtml(t.link.label)} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>`:''}
      </div>
    </div>`;
  }).join('');
  return `
  <button class="tip-back" onclick="${_tipsPublicMode?'_pubTipsOpen(null)':'_tipsOpen(null)'}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> All topics</button>
  <div class="tip-detail-hd">
    <span class="tip-cat-icon tip-cat-icon-lg"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${TIPS_ICONS[cat.icon]}</svg></span>
    <div>
      <div class="section-title" style="margin-bottom:2px">${_escHtml(cat.title)}</div>
      <div class="section-body" style="margin-bottom:0">${_escHtml(cat.tagline)}</div>
    </div>
  </div>
  <div class="tip-row-list">${rows}</div>
  ${i<TIPS_LIBRARY.length-1?`<button class="tip-next" onclick="${_tipsPublicMode?`_pubTipsOpen(${i+1})`:`_tipsOpen(${i+1})`}">Next: ${_escHtml(TIPS_LIBRARY[i+1].title)} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>`:''}`;
}
function _tipsOpen(i,focusTipIdx){
  _tipsOpenCat=i;
  _tipsFocusTip=(typeof focusTipIdx==='number')?focusTipIdx:null;
  const c=document.getElementById('main-content');
  if(c){ c.scrollTop=0; }
  navigate('tips');
}

// ── Standalone public page: no app shell, reached via the #library hash (see js/init.js).
// Content (TIPS_LIBRARY, _tipsDetailHtml) is still single-sourced with the signed-in app's
// Tips page — only the grid/home view gets its own marketing-page layout (_pubLibraryGridHtml),
// since the signed-in app's plain utility list (_tipsGridHtml) isn't meant for this funnel.
// Gated behind a free account: _showPublicTipsLibrary() shows the signup gate when there's
// no session, or the unlocked library once there is one.
let _pubTipsOpenCat=null;
let _pubTipsFocusTip=null;
let _pubTipsJustUnlocked=false; // one-time "you're in!" banner right after signup/sign-in

// One hero photo per day of the week so the owner can swap tomorrow's photo any time
// without touching code — see assets/hero/ (hero-01.jpg=Monday … hero-07.jpg=Sunday).
function _pubHeroImage(){
  const day=new Date().getDay(); // 0=Sun..6=Sat
  const idx=((day+6)%7)+1; // Mon=1..Sun=7
  return `/assets/hero/hero-${String(idx).padStart(2,'0')}.jpg`;
}

function _showPublicTipsLibrary(){
  document.body.style.visibility='hidden';
  document.body.style.background='var(--cream,#FBF8F3)';
  _tipsPublicMode=true;
  _pubTipsOpenCat=null;
  if(_sbSession) _renderUnlockedLibrary(); else _renderLibraryGate();
  document.body.style.visibility='visible';
}

function _pubTipsOpen(i,focusTipIdx){
  _pubTipsOpenCat=i;
  _pubTipsFocusTip=(typeof focusTipIdx==='number')?focusTipIdx:null;
  _renderUnlockedLibrary();
  window.scrollTo(0,0);
}

function _pubLibraryLogoHtml(cls){
  return `<img class="${cls}" src="${window.location.origin}/logos/Black%20logo%20(Light%20mode).png" alt="Union Vault">`;
}

// ── Gate: hero + locked preview + founder story + real signup/sign-in form ─────────────
function _renderLibraryGate(){
  _publicPageShell(`
    <div class="pub-hero">
      <img class="pub-hero-bg" src="${_pubHeroImage()}" alt=""/>
      <div class="pub-hero-inner">
        <img class="pub-hero-crest" src="${window.location.origin}/logos/White%20text%20(Dark%20mode).png" alt="Union Vault">
        <div class="pub-hero-title">Your Free Wedding Tips Library Is Ready</div>
        <div class="pub-hero-sub">263 practical, no-fluff tips from real weddings — budget, guests, vendors, timelines and more. Create a free account to unlock them all.</div>
        <a class="pub-hero-cta" href="#pub-gate-form">Create free account ↓</a>
      </div>
    </div>
    <div class="pub-gate-wrap">
      <div class="pub-gate-preview">
        <div class="pub-gate-chip"><img src="/assets/tips/guests.jpg" alt=""/><div class="pub-gate-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div></div>
        <div class="pub-gate-chip"><img src="/assets/tips/budget.jpg" alt=""/><div class="pub-gate-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div></div>
        <div class="pub-gate-chip"><img src="/assets/tips/moodboard.jpg" alt=""/><div class="pub-gate-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div></div>
      </div>
      <div class="pub-gate-preview-note">47 topics waiting inside →</div>

      <div class="pub-founder-note">
        <div class="pub-founder-eyebrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${TIPS_ICONS.heart}</svg> Why we built this</div>
        <div class="pub-founder-line">"Built by a bride, for brides — created from real wedding-planning experience. We built the tool we wished existed, and we've kept improving it since."</div>
      </div>

      <div class="pub-gate-form-card" id="pub-gate-form">
        <div class="tabs">
          <button class="tab active" onclick="switchTab(this,'create')">Create account</button>
          <button class="tab" onclick="switchTab(this,'sign-in')">Sign in</button>
        </div>
        <div id="create">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="auth-up-email" placeholder="you@email.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="pw-wrap">
              <input class="form-input" type="password" id="auth-up-pw" placeholder="Choose a password" autocomplete="new-password">
              <button class="pw-toggle" tabindex="-1" onclick="togglePw('auth-up-pw',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
          </div>
          <div id="lp-up-err" style="display:none;font-size:12px;color:#c0392b;margin-bottom:8px;padding:8px 10px;background:rgba(192,57,43,0.08);border-radius:6px"></div>
          <button class="btn-gold" id="lp-up-btn" onclick="_pubLibrarySignUp()">Create free account</button>
          <div class="trust-row">
            <span>✓ Free to start, no card required</span>
            <span>✓ Private by design</span>
          </div>
          <div class="auth-links">
            <div class="auth-legal">By creating an account you agree to our <a href="https://unionvault.app/#terms" target="_blank" rel="noopener">Terms &amp; Privacy</a></div>
            <div class="auth-disclosure">You'll also get occasional planning tips and offers by email — unsubscribe anytime.</div>
          </div>
        </div>
        <div id="sign-in" style="display:none">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="auth-in-email" placeholder="you@email.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="pw-wrap">
              <input class="form-input" type="password" id="auth-in-pw" placeholder="Your password" autocomplete="current-password">
              <button class="pw-toggle" tabindex="-1" onclick="togglePw('auth-in-pw',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </div>
          </div>
          <div id="lp-in-err" style="display:none;font-size:12px;color:#c0392b;margin-bottom:8px;padding:8px 10px;background:rgba(192,57,43,0.08);border-radius:6px"></div>
          <div id="lp-in-ok" style="display:none;font-size:12px;color:#27ae60;margin-bottom:8px;padding:8px 10px;background:rgba(39,174,96,0.08);border-radius:6px"></div>
          <button class="btn-gold" id="lp-in-btn" onclick="_pubLibrarySignIn()">Sign in</button>
          <div class="auth-links">
            <button id="lp-forgot-btn" onclick="_lpForgotPassword()" style="background:none;border:none;font-size:12px;color:var(--gold-deep,#b8923a);cursor:pointer;padding:0;font-family:inherit;text-decoration:underline;margin-top:6px">Forgot password?</button>
          </div>
        </div>
      </div>
    </div>
    <div class="pub-tips-brand"><a href="https://unionvault.app/" target="_blank" rel="noopener">Wedding Tips Library by Union Vault — unionvault.app</a></div>`);
}

// Minimal sign-in for the gate — can't reuse the main app's _lpSignIn() since that one
// assumes the full app shell exists (#welcome-overlay, navigate(), etc.), which this
// standalone page has replaced entirely.
async function _pubLibrarySignIn(){
  const email=(document.getElementById('auth-in-email').value||'').trim();
  const pw=document.getElementById('auth-in-pw').value||'';
  const errEl=document.getElementById('lp-in-err');
  const btn=document.getElementById('lp-in-btn');
  errEl.style.display='none';
  if(!email||!pw){ errEl.textContent='Please enter your email and password.'; errEl.style.display=''; return; }
  btn.disabled=true; btn.textContent='Signing in…';
  let r;
  try{ r=await _sbSignIn(email,pw); }
  catch(e){
    btn.disabled=false; btn.textContent='Sign in';
    errEl.textContent='Connection error — please check your connection and try again.';
    errEl.style.display=''; return;
  }
  btn.disabled=false; btn.textContent='Sign in';
  if(!r.ok){ errEl.textContent=r.error; errEl.style.display=''; return; }
  // Same cross-account guard as the main app's sign-in: don't trust local data left by
  // a different account on a shared device.
  if(alreadySetUp){
    let storedUID=null; try{ storedUID=localStorage.getItem('uv_uid'); }catch(_){}
    if(storedUID!==r.user.id){
      try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
      try{ localStorage.removeItem('uv_library_user'); }catch(_){}
      try{ if(typeof wzClearDraft === 'function') wzClearDraft(); }catch(_){}
      try{ localStorage.setItem('uv_uid',r.user.id); }catch(_){}
      window._uvWipeInProgress=true;
      location.reload();
      return;
    }
  }
  try{ localStorage.setItem('uv_uid',r.user.id); localStorage.setItem('uv_library_user','1'); }catch(_){}
  _pubTipsJustUnlocked=true;
  _renderUnlockedLibrary();
}

// Stamps which email is mid-signup from the library gate specifically, so the type=signup
// confirmation-link handler in js/init.js can tell a library signup apart from one made on
// the normal homepage form (whose confirmation link carries no such marker) and route each
// to the right place — the library gate itself is otherwise identical to the main app's
// create-account form, so _lpSignUp() is reused as-is.
function _pubLibrarySignUp(){
  try{
    const email=(document.getElementById('auth-up-email').value||'').trim().toLowerCase();
    if(email) localStorage.setItem('uv_pending_library_signup',email);
  }catch(_){}
  _lpSignUp();
}

// ── Unlocked: welcome banner + wizard nudge + trust strip + the tip library itself ─────
function _renderUnlockedLibrary(){
  const justUnlocked=_pubTipsJustUnlocked;
  _pubTipsJustUnlocked=false;
  const atHome=_pubTipsOpenCat==null;
  const inner=atHome?_pubLibraryGridHtml():_tipsDetailHtml(_pubTipsOpenCat);
  _publicPageShell(`
    <div class="pub-lib-minihead">
      <a href="#library" onclick="_pubTipsOpen(null);return false;"><img class="pub-lib-mini-crest" src="${window.location.origin}/logos/Black%20text%20(Light%20mode).png" alt="Union Vault"></a>
      <div class="pub-lib-mini-wordmark">Wedding Tips Library</div>
    </div>
    ${atHome?`
    ${justUnlocked?`<div class="pub-welcome-banner"><div class="pub-welcome-pill">🎉 You're in — your Wedding Tips Library is fully unlocked.</div></div>`:''}
    <div class="pub-wizard-cta">
      <div class="pub-wizard-cta-inner">
        <div class="pub-wizard-cta-txt">
          <div class="pub-wizard-cta-eyebrow">Ready for more?</div>
          <div class="pub-wizard-cta-title">Turn these tips into your actual plan</div>
          <div class="pub-wizard-cta-sub">Jump into the Setup Wizard — guest list, budget, vendors and your timeline, tailored to your wedding in under 2 minutes.</div>
        </div>
        <div class="pub-wizard-cta-actions">
          <a class="pub-wizard-cta-btn" href="/?setup=1">Start Setup Wizard →</a>
        </div>
      </div>
    </div>
    <div class="pub-lib-trust-strip">
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">By a Bride</div><div class="pub-lib-trust-lbl">For Brides</div></div>
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">263+</div><div class="pub-lib-trust-lbl">Wedding Tips</div></div>
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">47</div><div class="pub-lib-trust-lbl">Topics Covered</div></div>
      <div class="pub-lib-trust-item"><div class="pub-lib-trust-num">Private</div><div class="pub-lib-trust-lbl">By Design</div></div>
    </div>
    <div class="pub-lib-section-head">
      <div class="pub-lib-section-eyebrow">Browse by topic</div>
      <div class="pub-lib-section-title">Everything you need, sorted</div>
      <div class="pub-lib-section-sub">Short, practical ideas from real weddings — tap a topic or search for what you need.</div>
    </div>`:''}
    <div class="pub-lib-body">${inner}</div>
    <div class="pub-tips-brand"><a href="https://unionvault.app/" target="_blank" rel="noopener">Wedding Tips Library by Union Vault — unionvault.app</a></div>`);
  if(_pubTipsOpenCat!=null && _pubTipsFocusTip!=null){
    const cat=_pubTipsOpenCat, idx=_pubTipsFocusTip;
    _pubTipsFocusTip=null;
    setTimeout(()=>{
      const row=document.getElementById('tip-row-'+cat+'-'+idx);
      if(!row) return;
      row.scrollIntoView({behavior:'smooth',block:'center'});
      row.classList.add('tip-row-hit');
      setTimeout(()=>row.classList.remove('tip-row-hit'),1800);
    },50);
  }
}

// Marketing-page grid for the unlocked home — same TIPS_LIBRARY data as the signed-in
// app's Tips page, different (photo-card) presentation. The search bar/results reuse the
// exact ids _tipsSearch() already targets, so that shared function needs no changes.
function _pubLibraryGridHtml(){
  const cards=TIPS_LIBRARY.map((cat,i)=>`
    <button class="pub-lib-card" onclick="_pubTipsOpen(${i})">
      <span class="pub-lib-card-img-wrap">
        <img src="/assets/tips/${cat.photo||cat.icon}.jpg" alt="" loading="lazy" onerror="this.style.display='none'" onload="this.nextElementSibling.style.display='none'">
        <span class="pub-lib-card-icon-fallback"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${TIPS_ICONS[cat.icon]}</svg></span>
        <span class="pub-lib-card-count">${cat.tips.length} tips</span>
      </span>
      <span class="pub-lib-card-body">
        <span class="pub-lib-card-title">${_escHtml(cat.title)}</span>
        <span class="pub-lib-card-sub">${_escHtml(cat.tagline)}</span>
        <span class="pub-lib-card-link">Explore tips <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
      </span>
    </button>`).join('');
  return `
  <div class="tip-search-wrap">
    <svg class="tip-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="tips-search" placeholder="Search tips — budget, seating, timeline…" oninput="_tipsSearch(this.value)">
  </div>
  <div id="tips-search-results"></div>
  <div id="tips-ed-rows" class="pub-lib-grid">${cards}</div>`;
}
