const SUPABASE_URL      = 'https://kdwmnlbttjmfvlbrprxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd21ubGJ0dGptZnZsYnJwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTExOTQsImV4cCI6MjA4NjkyNzE5NH0.UXI7d14FIjfNrk5HarzxbOt8mx7Ha9GqQ0oRX6qG6nQ'

let pendingStreamId = null   // streamId en attente que l'offscreen soit prêt

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PREPARE_OFFSCREEN') {
    ensureOffscreen()
  }
  if (msg.type === 'START_RECORDING') {
    startRecording(msg.streamId)
  }
  if (msg.type === 'STOP_RECORDING') {
    stopRecording(sendResponse)
    return true
  }
  if (msg.type === 'OFFSCREEN_READY') {
    // L'offscreen est prêt — envoyer le streamId maintenant
    if (pendingStreamId) {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START', streamId: pendingStreamId })
      pendingStreamId = null
    }
  }
  if (msg.type === 'CAPTURE_ERROR') {
    chrome.runtime.sendMessage({ type: 'SHOW_ERROR', error: msg.error })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────
async function startRecording(streamId) {
  pendingStreamId = streamId

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Capture écran',
    })
    // L'offscreen enverra OFFSCREEN_READY → on lui envoie le streamId là
  } catch (e) {
    // Offscreen déjà chargé → envoyer directement
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_START', streamId })
    pendingStreamId = null
  }
}

// ── Stop ──────────────────────────────────────────────────────────────────
async function stopRecording(sendResponse) {
  const result  = await chrome.storage.local.get(['session'])
  const session = result.session
  if (!session?.access_token) { sendResponse({ error: 'Non connecté' }); return }

  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' }, async (res) => {
    if (chrome.runtime.lastError || !res?.buffer) {
      sendResponse({ error: res?.error || 'Pas de données vidéo' }); return
    }
    try {
      const blob     = new Blob([new Uint8Array(res.buffer)], { type: 'video/webm' })
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
      if (!uploadRes.ok) throw new Error(`Upload échoué (${uploadRes.status})`)

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
          mouse_track: null,
          created_at:  new Date().toISOString(),
        }),
      })
      if (!dbRes.ok) throw new Error(`DB échouée (${dbRes.status})`)

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
      url:           'offscreen.html',
      reasons:       ['USER_MEDIA'],
      justification: 'Capture écran via getDisplayMedia',
    })
  } catch (e) {
    // Déjà créé — envoyer le streamId directement
    if (pendingStreamId) {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_START', streamId: pendingStreamId })
      pendingStreamId = null
    }
  }
}
