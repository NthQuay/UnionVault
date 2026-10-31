// VISION BOARD WALLPAPER
// ══════════════════════════════════════════════
// Vision board scrapbook wallpaper (seamless mirror-tile of blush willow reference).
const VB_WALLPAPER_LIGHT="/assets/vb-wallpaper-light.png";
const VB_WALLPAPER_DARK="/assets/vb-wallpaper-dark.png";
const VB_BOTANICAL_LIGHT="/assets/vb-botanical-light.png";
const VB_BOTANICAL_DARK="/assets/vb-botanical-dark.png";
const VB_MARBLE_LIGHT="/assets/vb-marble-light.png";
const VB_MARBLE_DARK="/assets/vb-marble-dark.png";
function _vbWallUrl(isDark){
  const bg=(STATE.settings&&STATE.settings.vbBackground)||'wallpaper';
  if(bg==='botanical') return isDark ? VB_BOTANICAL_DARK : VB_BOTANICAL_LIGHT;
  if(bg==='marble')    return isDark ? VB_MARBLE_DARK    : VB_MARBLE_LIGHT;
  return isDark ? VB_WALLPAPER_DARK : VB_WALLPAPER_LIGHT;
}

