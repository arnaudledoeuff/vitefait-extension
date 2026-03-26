// Mouse tracking — envoie la position au background service worker
let lastSample = 0

document.addEventListener('mousemove', (e) => {
  try {
    const now = Date.now()
    if (now - lastSample < 100) return
    lastSample = now
    if (typeof chrome === 'undefined' || !chrome.runtime?.id) return
    chrome.runtime.sendMessage({
      type: 'MOUSE',
      x: e.screenX / screen.width,
      y: e.screenY / screen.height,
    })
  } catch (_) {}
})
