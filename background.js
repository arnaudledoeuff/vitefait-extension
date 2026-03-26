importScripts('config.js')

let mouseTrack    = []
let recordingStart = null

// ── Messages depuis popup ──────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_RECORDING') {
    startRecording(sendResponse)
    return true // async
  }
  if (msg.type === 'STOP_RECORDING') {
    stopRecording(sendResponse)
    return true
  }
  if (msg.type === 'MOUSE') {
    if (recordingStart !== null) {
      mouseTrack.push({
        t: +((Date.now() - recordingStart) / 1000).toFixed(2),
        x: +msg.x.toFixed(4),
        y: +msg.y.toFixed(4),
      })
    }
  }
})

// ── Start ──────────────────────────────────────────────────────────────────
async function startRecording(sendResponse) {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab'],
    async (streamId) => {
      if (!streamId) { sendResponse({ error: 'Capture annulée' }); return }

      mouseTrack     = []
      recordingStart = Date.now()

      await ensureOffscreen()
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START', streamId })
      sendResponse({ ok: true })
    }
  )
}

// ── Stop ───────────────────────────────────────────────────────────────────
async function stopRecording(sendResponse) {
  const { session } = await chrome.storage.local.get(['session'])
  if (!session?.access_token) { sendResponse({ error: 'Non connecté' }); return }

  // Demande le blob à l'offscreen
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' }, async (res) => {
    if (!res?.chunks) { sendResponse({ error: 'Pas de données vidéo' }); return }

    try {
      const blob     = new Blob(res.chunks, { type: 'video/webm' })
      const ts       = Date.now()
      const fileName = `${session.user.id}/${ts}.webm`

      // Upload Storage
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/recordings/${fileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'video/webm',
        },
        body: blob,
      })
      if (!uploadRes.ok) throw new Error('Erreur upload')

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${fileName}`

      // Insert DB
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          user_id:     session.user.id,
          title:       `Enregistrement ${new Date().toLocaleString('fr-FR')}`,
          url:         publicUrl,
          mouse_track: mouseTrack.length > 0 ? mouseTrack : null,
          created_at:  new Date().toISOString(),
        }),
      })
      if (!dbRes.ok) throw new Error('Erreur base de données')

      recordingStart = null
      mouseTrack     = []
      sendResponse({ ok: true })
    } catch (err) {
      sendResponse({ error: err.message })
    }
  })
}

// ── Offscreen document ─────────────────────────────────────────────────────
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument()
  if (!existing) {
    await chrome.offscreen.createDocument({
      url:    'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Capture écran via getDisplayMedia',
    })
  }
}
