// Mouse tracking — envoie la position au background service worker
let lastSample = 0

document.addEventListener('mousemove', (e) => {
  const now = Date.now()
  if (now - lastSample < 100) return
  lastSample = now
  if (!chrome?.runtime?.id) return
  try {
    chrome.runtime.sendMessage({
      type: 'MOUSE',
      x: e.screenX / screen.width,
      y: e.screenY / screen.height,
    })
  } catch (_) {}
})
