// Prefer input capability over viewport width: a phone in landscape may be
// wider than a desktop browser window, while a narrow desktop still has a mouse.
export function isMobilePlayer(): boolean {
  const primaryTouch = window.matchMedia('(pointer: coarse)').matches;
  const mobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return primaryTouch || (navigator.maxTouchPoints > 0 && mobileBrowser);
}
