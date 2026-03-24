// ── Mouse tracking (tous les onglets) ──────────────────────────────────────
const channel = new BroadcastChannel('vitefait_mouse')

document.addEventListener('mousemove', (e) => {
  channel.postMessage({
    t: Date.now(),
    x: e.screenX / screen.width,
    y: e.screenY / screen.height,
  })
})

// ── Commandes start/stop (onglet vitefait.io uniquement) ───────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'vitefait:start' || msg.type === 'vitefait:stop') {
    window.dispatchEvent(new CustomEvent(msg.type))
  }
})
