const SUPABASE_URL      = 'https://kdwmnlbttjmfvlbrprxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd21ubGJ0dGptZnZsYnJwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTExOTQsImV4cCI6MjA4NjkyNzE5NH0.UXI7d14FIjfNrk5HarzxbOt8mx7Ha9GqQ0oRX6qG6nQ'

let mouseTrack     = []
let recordingStart = null

// ── Messages depuis popup et offscreen ────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_RECORDING') {
    startRecording(msg.streamId)
  }
  if (msg.type === 'STOP_RECORDING') {
    stopRecording(sendResponse)
    return true
  }
  if (msg.type === 'MOUSE' && recordingStart !== null) {
    mouseTrack.push({
      t: +((Date.now() - recordingStart) / 1000).toFixed(2),
      x: +Number(msg.x).toFixed(4),
      y: +Number(msg.y).toFixed(4),
    })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────
async function startRecording(streamId) {
  mouseTrack     = []
  recordingStart = Date.now()
  await ensureOffscreen()
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_START', streamId })
}

// ── Stop ──────────────────────────────────────────────────────────────────
async function stopRecording(sendResponse) {
  const result = await chrome.storage.local.get(['session'])
  const session = result.session
  if (!session?.access_token) { sendResponse({ error: 'Non connecté' }); return }

  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' }, async (res) => {
    if (chrome.runtime.lastError || !res?.chunks) {
      sendResponse({ error: 'Pas de données vidéo' }); return
    }
    try {
      const blob     = new Blob(res.chunks, { type: 'video/webm' })
      const ts       = Date.now()
      const fileName = `${session.user.id}/${ts}.webm`

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/recordings/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${session.access_token}`,
            apikey:          SUPABASE_ANON_KEY,
            'Content-Type': 'video/webm',
          },
          body: blob,
        }
      )
      if (!uploadRes.ok) throw new Error('Erreur upload Storage')

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${fileName}`

      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${session.access_token}`,
          apikey:          SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          Prefer:          'return=minimal',
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

// ── Offscreen ─────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  try {
    await chrome.offscreen.createDocument({
      url:         'offscreen.html',
      reasons:     ['USER_MEDIA'],
      justification: 'Capture écran',
    })
  } catch (e) {
    // Déjà créé, on ignore
  }
}
