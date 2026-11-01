// STATE
// ══════════════════════════════════════════════
const STATE = {
  event: { partner1:'Alex', partner2:'Jordan', title1:'Partner', title2:'Partner', date:'', venue:'', venueAddress:'', religion:'', officiant:'', ceremonyVenue:'' },
  events: [],
  vendors: [],
  quotes: [],
  guests: [],
  checklist: [
    {id:'cl0',text:'Research venues',done:false,dueDate:'',category:'Venue',notes:'',pinned:false,budgetId:''},
    {id:'cl1',text:'Book venue',done:false,dueDate:'',category:'Venue',notes:'',pinned:false,budgetId:'b-venue'},
    {id:'cl8',text:'Send save the dates',done:false,dueDate:'',category:'Stationery',notes:'',pinned:false,budgetId:''},
    {id:'cl2',text:'Hire celebrant / officiant',done:false,dueDate:'',category:'Ceremony',notes:'',pinned:false,budgetId:'b-celebrant'},
    {id:'cl3',text:'Order wedding attire',done:false,dueDate:'',category:'Attire',notes:'',pinned:false,budgetId:'b-gown'},
    {id:'cl4',text:'Book photographer',done:false,dueDate:'',category:'Media',notes:'',pinned:false,budgetId:'b-photo'},
    {id:'cl5',text:'Book videographer',done:false,dueDate:'',category:'Media',notes:'',pinned:false,budgetId:''},
    {id:'cl6',text:'Arrange florals',done:false,dueDate:'',category:'Decor',notes:'',pinned:false,budgetId:'b-florals'},
    {id:'cl7',text:'Book caterer',done:false,dueDate:'',category:'Catering',notes:'',pinned:false,budgetId:'b-catering'},
    {id:'cl9',text:'Book hair & makeup',done:false,dueDate:'',category:'Beauty',notes:'',pinned:false,budgetId:'b-beauty'},
    {id:'cl10',text:'Arrange guest accommodation',done:false,dueDate:'',category:'Logistics',notes:'',pinned:false,budgetId:''},
    {id:'cl11',text:'Book honeymoon travel',done:false,dueDate:'',category:'Honeymoon',notes:'',pinned:false,budgetId:'b-honeymoon'},
    {id:'cl12',text:'Purchase rings',done:false,dueDate:'',category:'Rings',notes:'',pinned:false,budgetId:'b-rings'},
    {id:'cl13',text:'Send formal invitations',done:false,dueDate:'',category:'Stationery',notes:'',pinned:false,budgetId:''},
    {id:'cl14',text:'Finalise menu choices',done:false,dueDate:'',category:'Catering',notes:'',pinned:false,budgetId:''},
    {id:'cl15',text:'Book DJ or band',done:false,dueDate:'',category:'Entertainment',notes:'',pinned:false,budgetId:'b-music'},
    {id:'cl16',text:'Create seating plan',done:false,dueDate:'',category:'Logistics',notes:'',pinned:false,budgetId:''},
    {id:'cl17',text:'Arrange wedding transport',done:false,dueDate:'',category:'Transport',notes:'',pinned:false,budgetId:'b-transport'},
    {id:'cl18',text:'Write vows',done:false,dueDate:'',category:'Ceremony',notes:'',pinned:false,budgetId:''},
    {id:'cl19',text:'Plan rehearsal dinner',done:false,dueDate:'',category:'Events',notes:'',pinned:false,budgetId:''},
    {id:'cl20',text:'Collect marriage certificate',done:false,dueDate:'',category:'Legal',notes:'',pinned:false,budgetId:''},
  ],
  budget: {
    total: 0,
    useRsvpCount: false,
    excludeChildrenPerHead: false,
    items: [
      {id:'b-venue',name:'Venue',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl1',note:'',expanded:false,subItems:[
        {id:'bv1',name:'Hire fee',amount:0},{id:'bv2',name:'Chairs & furniture',amount:0},
        {id:'bv3',name:'Napery & linen',amount:0},{id:'bv4',name:'Lighting package',amount:0},
        {id:'bv5',name:'Audio/visual',amount:0},{id:'bv6',name:'Ceremony setup',amount:0}
      ]},
      {id:'b-florals',name:'Florals',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl6',note:'',expanded:false,subItems:[]},
      {id:'b-celebrant',name:'Celebrant / Officiant',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl2',note:'',expanded:false,subItems:[]},
      {id:'b-catering',name:'Catering & Bar',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl7',note:'',expanded:false,subItems:[
        {id:'bc1',name:'Food per head',amount:0},{id:'bc2',name:'Bar package',amount:0},
        {id:'bc3',name:'Wedding cake',amount:0},{id:'bc4',name:'Wait staff',amount:0}
      ]},
      {id:'b-photo',name:'Photographer',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl4',note:'',expanded:false,subItems:[]},
      {id:'b-gown',name:'Wedding Attire',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl3',note:'',expanded:false,subItems:[
        {id:'ba1',name:'Gown / Suit',amount:0},{id:'ba2',name:'Shoes',amount:0},
        {id:'ba3',name:'Accessories',amount:0},{id:'ba4',name:'Bridesmaid attire',amount:0},
        {id:'ba5',name:'Groomswear',amount:0}
      ]},
      {id:'b-rings',name:'Rings',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl12',note:'',expanded:false,subItems:[]},
      {id:'b-beauty',name:'Hair & Makeup',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl9',note:'',expanded:false,subItems:[]},
      {id:'b-music',name:'Entertainment',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl15',note:'',expanded:false,subItems:[]},
      {id:'b-transport',name:'Transport',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl17',note:'',expanded:false,subItems:[]},
      {id:'b-stationery',name:'Stationery & Invitations',total:0,deposit:0,paid:false,dueDate:'',checklistId:'',note:'',expanded:false,subItems:[]},
      {id:'b-honeymoon',name:'Honeymoon',total:0,deposit:0,paid:false,dueDate:'',checklistId:'cl11',note:'',expanded:false,subItems:[]},
      {id:'b-misc',name:'Miscellaneous',total:0,deposit:0,paid:false,dueDate:'',checklistId:'',note:'',expanded:false,subItems:[]},
    ]
  },
  tables: [
    {id:'t1',name:'Table 1',seats:10},
    {id:'t2',name:'Table 2',seats:10},
    {id:'t3',name:'Bridal Table',seats:8}
  ],
  seating: {},
  inspo: { colors:[], items:[] },
  visionboard: [],
  wishingwell: {
    enabled: true,
    goal: 0,
    message: "Your presence is the greatest gift. But if you'd like to help us start our next chapter, a contribution to our wishing well would be treasured.",
    closing: "With love and gratitude, thank you",
    suggested: [50, 100, 200],
    payId: '',
    bankBsb: '',
    bankAcc: '',
    reference: 'Your name',
    paypal: '',
    contributions: [],
    // Gift registry — physical items, distinct from the cash well above. Each item
    // stores its photo in `image` (a media id) so `_mediaRefs()` carries it through
    // export/import automatically — the whole point of the v142 walker.
    //   received      — Mandy confirms the gift ARRIVED (works today)
    //   receivedFrom  — who it was from, for thank-yous
    //   claimed       — a GUEST said "I'll buy this". Built now, surfaced only once
    //                   hosting exists; a guest's browser cannot write here today.
    registry: [],
    // Links OUT to store registries (Myer, Amazon, etc). Just {id,name,url} — a link is
    // a link. Auto-IMPORTING items FROM a store is a different feature entirely: it needs
    // to fetch and parse another company's live page, which a file:// app cannot do and
    // which is fragile even hosted. Parked. This is only the link-out.
    storeLinks: []
  },
  timeline: [
    { id:'tl1', time:'14:30', title:'Guests Arrive', location:'Ceremony lawn', who:'', notes:'Ushers seat guests; pre-ceremony music begins.', cat:'ceremony' },
    { id:'tl2', time:'15:00', title:'Ceremony Begins', location:'Ceremony lawn', who:'', notes:'Processional, vows, ring exchange.', cat:'ceremony' },
    { id:'tl3', time:'15:30', title:'Cocktail Hour', location:'Garden terrace', who:'', notes:'Canapés & drinks while photos are taken.', cat:'reception' },
    { id:'tl4', time:'16:00', title:'Couple & Family Photos', location:'Garden', who:'Photographer', notes:'', cat:'photos' },
    { id:'tl5', time:'17:00', title:'Reception Entrance', location:'Ballroom', who:'', notes:'Grand entrance & welcome.', cat:'reception' },
    { id:'tl6', time:'17:30', title:'Dinner Served', location:'Ballroom', who:'Catering', notes:'', cat:'reception' },
    { id:'tl7', time:'18:45', title:'Speeches & Toasts', location:'Ballroom', who:'', notes:'', cat:'reception' },
    { id:'tl8', time:'19:30', title:'First Dance', location:'Dance floor', who:'', notes:'', cat:'reception' },
    { id:'tl9', time:'23:00', title:'Last Dance & Send-off', location:'Ballroom', who:'', notes:'Sparkler exit.', cat:'reception' }
  ],
  events: [],
  families: [],
  // Starter guest tags (name → colour + icon) for new accounts; users edit or delete freely.
  tagDefs: {
    'Adult':        {color:'#9A7B2E', icon:''},
    "Bride's Side": {color:'#C56B8C', icon:'people'},
    'Bridal Party': {color:'#5C8A4E', icon:'star'},
    'Child':        {color:'#21b5a4', icon:''},
    "Groom's Side": {color:'#4A7C9E', icon:'people'},
    'Mutual':       {color:'#8E6BA8', icon:'people'},
    '+1':           {color:'#5A5A57', icon:'people'},
    "Guest's of Honour": {color:'#B8963E', icon:'sparkle'}
  },
  invites: [],
  inviteMeta: {},
  settings: { partner1Title:'Partner', partner2Title:'Partner', autoCheckPassedInstallments:true, rsvpBy:'', saveDateTemplate:null, inviteTemplate:null, reminderTemplate:null, rsvpCols:{ status:true, savedate:true, invited:true, date:true, reminder:true, dietary:false, tags:false, phone:false, email:false, address:false }, rsvpColOrder:['name','savedate','invited','status','date','rsvpby','reminder','handle','email','phone','address','tags','dietary','ageband'], rsvpFreezeName:false, rsvpEmailOn:true, mealChoiceOn:false, mealOptions:[], childrenMealOn:true, childrenMealOptions:[], trackerPrintCols:{ status:true, date:true, dietary:true, tags:false, phone:true, email:true, address:false }, trackerPrintColOrder:['status','date','dietary','tags','phone','email','address'], trackerPrintFilter:'all', trackerPrintSync:false, budgetJumpBar:'off', budgetDensity:'current', partnerEmail:'' },
  // Guest-facing website. Content is NOT duplicated here — sections read from the
  // planner (details, timeline, inspo, wishingwell) so there is one source of truth.
  // This object holds only what the planner has no opinion about: which sections are
  // on, what order they sit in, the theme, and the site-only copy (FAQ, accommodation).
  website: {
    order: ['home','details','schedule','gallery','wishingwell','countdown','accommodation','faq','rsvp'],
    on: { home:true, details:true, schedule:true, gallery:true, wishingwell:true, countdown:true, accommodation:false, faq:true, rsvp:false },
    // 6 colour roles (was 3), type scale, spacing, corners, plus an escape hatch.
    theme: { preset:'champagne',
      page:'#E8DDD0', band:'#DDD3C4', accent:'#C9A227',
      heading:'#4A3F35', text:'#5A5148', button:'#8B7355',
      headFont:"'Cormorant Garamond',serif", bodyFont:"'Inter',sans-serif",
      scale:100, space:100, corners:'soft', css:'' },
    // Sections the user invented. Keyed by id, and their ids live in `order` alongside
    // the built-ins — so drag, toggle and images all work with no special-casing.
    custom: {},
    // Per-section layout overrides. Any section (built-in OR custom) may carry these.
    layout: {},
    // Home hero.
    // `ink` is the colour of the names sitting ON the hero photo. It is NOT derived from
    // the scrim: at 0% darkening a pale photo needs dark names, and no amount of guessing
    // beats letting Mandy look at it and choose. Default 'light' — the v120 behaviour.
    //
    // v125:
    //  `height` — the hero used to have NO height of its own; it was sized by its padding,
    //    and `background-size:cover` then cropped to whatever accidental shape that made.
    //    A tall photo got squashed into a strip. It now has a real box.
    //  `pos`    — the focal point, as a CSS object-position string. `cover` always centres,
    //    so a couple standing in the lower third of the frame lose their heads. Wired and
    //    RENDERED now; the drag control that sets it comes later.
    //  `showNames` / `showDate` / `showIcs` — independent, because a photo that already has
    //    the names burned into it doesn't want them printed on top as well.
    hero: { mediaId:'', style:'over', scrim:35, ink:'light',
            height:'tall', pos:'50% 50%',
            showNames:true, showDate:true, showIcs:true },
    // v123: the "Website made with Union Vault" footer. Always shown; nothing in the
    // app can turn it off. The flag exists so that a future paid tier has one line to
    // flip, rather than a feature to build — but there is DELIBERATELY no UI for it.
    //
    // A disabled toggle with an "upgrade" tooltip would be advertising a product that
    // does not exist. When the subscription exists, the subscription check sets this.
    // Until then it is false, and the only way to remove the footer is to edit the
    // downloaded HTML — which is true of every free-tier badge on the internet and is
    // not something client-side code can prevent. It is a convention, not a paywall.
    brandOff: false,
    home: { headline:'', sub:'' },
    // Per-section images. TWO independent slots per section — one under the heading, one
    // below the text — each with its own ids and its own layout. Both hold **media ids**,
    // never bytes: an upload here goes through the same compressImage -> _mediaPut chain
    // Inspiration uses, so there is exactly ONE image store. The builder stores pointers.
    // Shape: images[sectionKey] = { top:{ids:[],layout:'grid'}, bottom:{ids:[],layout:'grid'} }
    images: {},
    gallery: [],
    faq: [
      {id:'f1', q:'What should I wear?', a:'Semi-formal. The ceremony is on grass, so consider your heels.'},
      {id:'f2', q:'Can I bring a plus one?', a:'Your invitation will say who is included.'},
      {id:'f3', q:'Is there parking?', a:'Yes, on site and free.'},
      {id:'f4', q:'Are children welcome?', a:'We love your little ones, but this is an adults-only celebration.'}
    ],
    stays: []
  },
  dashWidgetOrder: ['kpis','progress','rsvp','budget','budgetGlance','pinned','vendorlookup','visionboard','wishingwell'],
  dashLayout: null,
  dashHiddenWidgets: [],
  guestFilter: { status:'all', tags:[], list:'all', query:'', group:'all' }
};

// ══════════════════════════════════════════════
