// PERSISTENCE (localStorage)
// ══════════════════════════════════════════════
const STORAGE_KEY = 'union_vault_v1';

function saveToStorage(){
  if(_importing) return; // don't clobber a freshly-imported payload on reload/autosave
  if(window._uvWipeInProgress) return; // beforeunload guard: don't re-save contaminated STATE after a mismatch wipe
  const payload = {
    hasSetup: true,
    userId: (_sbSession && _sbSession.user && _sbSession.user.id) || null,
    darkMode: document.body.classList.contains('dark'),
    sidebarMode: STATE.settings.sidebarMode || 'hamburger',
    event: STATE.event,
    settings: STATE.settings,
    guests: STATE.guests,
    checklist: STATE.checklist,
    vendors: STATE.vendors||[],
    quotes: STATE.quotes||[],
    checklistCategories: STATE.checklistCategories||[],
    checklistDrafts: STATE.checklistDrafts||[],
    checklistCatOrder: STATE.checklistCatOrder||[],
    budget: STATE.budget,
    tables: STATE.tables,
    seating: STATE.seating,
    inspo: STATE.inspo,
    visionboard: STATE.visionboard,
    wishingwell: STATE.wishingwell,
    website: STATE.website,
    timeline: STATE.timeline||[],
    events: STATE.events,
    tagDefs: STATE.tagDefs||{},
    families: STATE.families||[],
    invites: STATE.invites||[],
    inviteMeta: STATE.inviteMeta||{},
    invitation: STATE.invitation||{},
    dashWidgetOrder: STATE.dashWidgetOrder,
    dashLayout: STATE.dashLayout,
    dashHiddenWidgets: STATE.dashHiddenWidgets,
    pendingGroups: _groupSuggestions.length ? _groupSuggestions : undefined,
    pendingGroupsBannerDismissed: _groupBannerDismissed || undefined,
    pendingGroupsSeeded: _groupSuggestionsSeeded || undefined
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch(e){
    if(e.name==='QuotaExceededError'){
      /* v113 caught this, STRIPPED every photo, and told nobody. That whole
         apparatus is gone, because STATE no longer holds a single byte of
         image data — files live in IndexedDB and STATE holds only ids.

         If localStorage is somehow still full, it is text (guests, budget,
         timeline) that won't fit, and there is nothing sane to strip. So we
         say so, plainly, and do not pretend the save worked. */
      _textStorageFullWarn();
    } else { console.warn('Storage save failed', e); }
  }
  // Stage 3: schedule auto-sync after every local save
  if(typeof _autoSyncSchedule==='function') _autoSyncSchedule();
}

let _storageWarned = false;
function _textStorageFullWarn(){
  if(_storageWarned) return;
  _storageWarned = true;
  const body = `<div style="font-size:13px;color:var(--ink);line-height:1.7">
      This device's storage for the planner is <b>full</b>.
    </div>
    <div style="font-size:12.5px;color:var(--muted);line-height:1.7;margin-top:9px">
      <b style="color:var(--red)">Your most recent change was not saved.</b> Photos and
      files are stored separately and are unaffected \u2014 this is the text side of the
      planner (guests, budget, timeline) hitting its limit, which is unusual.
    </div>
    <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-top:11px;padding:10px 12px;background:var(--surface);border:.5px solid var(--border);border-radius:8px">
      <b style="color:var(--ink)">What to do now:</b> export a backup from Settings \u2192 Data
      before making further changes, and get in touch.
    </div>`;
  try{
    openConfirm2('Storage full', body, `<button class="btn btn-primary" onclick="_confirm2CloseX()">I understand</button>`);
  }catch(_){
    alert('Storage full \u2014 your most recent change was NOT saved. Export a backup from Settings before continuing.');
  }
}

// ══════════════════════════════════════════════
