let overlayEl = null

// ── Créer le widget flottant ───────────────────────────────────────────────
function showOverlay() {
  if (overlayEl) return

  overlayEl = document.createElement('div')
  overlayEl.id = 'vitefait-overlay'
  overlayEl.innerHTML = `
    <style>
      #vitefait-overlay {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        background: rgba(9, 9, 11, 0.92);
        backdrop-filter: blur(12px);
        border: 1px solid #27272a;
        border-radius: 100px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 13px;
        color: #f4f4f5;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        user-select: none;
      }
      #vitefait-overlay .dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        background: #ef4444;
        animation: vf-pulse 1s infinite;
        flex-shrink: 0;
      }
      #vitefait-overlay .label {
        color: #a1a1aa;
        font-weight: 500;
        white-space: nowrap;
      }
      #vitefait-overlay .timer {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: #f4f4f5;
        min-width: 36px;
      }
      #vitefait-overlay .btn-stop {
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 100px;
        padding: 5px 14px;
        font-size: 12px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        white-space: nowrap;
      }
      #vitefait-overlay .btn-stop:hover { background: #dc2626; }
      #vitefait-overlay .btn-hide {
        background: transparent;
        border: none;
        color: #52525b;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0 2px;
      }
      #vitefait-overlay .btn-hide:hover { color: #a1a1aa; }
      @keyframes vf-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    </style>
    <div class="dot"></div>
    <span class="label">⬛ vitefait.io</span>
    <span class="timer" id="vf-timer">00:00</span>
    <button class="btn-stop" id="vf-stop">Arrêter</button>
    <button class="btn-hide" id="vf-hide" title="Masquer">×</button>
  `
  document.body.appendChild(overlayEl)

  // Timer
  let seconds = 0
  const timerEl = document.getElementById('vf-timer')
  const interval = setInterval(() => {
    seconds++
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    if (timerEl) timerEl.textContent = `${m}:${s}`
  }, 1000)
  overlayEl._interval = interval

  // Stop
  document.getElementById('vf-stop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_FROM_POPUP' })
    hideOverlay()
  })

  // Masquer (juste cacher visuellement)
  document.getElementById('vf-hide').addEventListener('click', () => {
    overlayEl.style.display = 'none'
  })
}

function hideOverlay() {
  if (!overlayEl) return
  clearInterval(overlayEl._interval)
  overlayEl.remove()
  overlayEl = null
}

// ── Écoute les messages du background ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_OVERLAY') showOverlay()
  if (msg.type === 'HIDE_OVERLAY') hideOverlay()
})

// ── Au chargement : vérifier si enregistrement en cours ───────────────────
chrome.storage.local.get(['isRecording'], ({ isRecording }) => {
  if (isRecording) showOverlay()
})
