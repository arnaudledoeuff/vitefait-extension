const SUPABASE_URL      = 'https://kdwmnlbttjmfvlbrprxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd21ubGJ0dGptZnZsYnJwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTExOTQsImV4cCI6MjA4NjkyNzE5NH0.UXI7d14FIjfNrk5HarzxbOt8mx7Ha9GqQ0oRX6qG6nQ'

const btnStart = document.getElementById('btn-start')
const btnStop  = document.getElementById('btn-stop')
const status   = document.getElementById('status')

let mediaRecorder = null
let chunks        = []

// ── Start ──────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  setStatus('Sélectionne une fenêtre…')
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true,
    })

    chunks = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.onstop = handleStop
    mediaRecorder.start(1000)

    stream.getVideoTracks()[0].onended = () => stopRecording()

    btnStart.style.display = 'none'
    btnStop.style.display  = 'block'
    setStatus('<span class="dot"></span> En cours — tu peux minimiser cette fenêtre')
  } catch (err) {
    setStatus(err.name === 'NotAllowedError' ? 'Capture annulée' : err.message, 'error')
  }
})

// ── Stop ───────────────────────────────────────────────────────────────────
btnStop.addEventListener('click', stopRecording)

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
  mediaRecorder.stream.getTracks().forEach(t => t.stop())
  btnStop.style.display  = 'none'
  btnStart.style.display = 'block'
  setStatus('Upload en cours…')
}

// ── Upload ─────────────────────────────────────────────────────────────────
async function handleStop() {
  const result = await chrome.storage.local.get(['session'])
  if (!result.session?.access_token) { setStatus('Non connecté', 'error'); return }

  const session = await refreshSession(result.session)

  try {
    const blob     = new Blob(chunks, { type: 'video/webm' })
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
    if (!uploadRes.ok) {
      const e = await uploadRes.json().catch(() => ({}))
      throw new Error(`Upload ${uploadRes.status}: ${e.message || JSON.stringify(e)}`)
    }

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
        user_id:    session.user.id,
        title:      `Enregistrement ${new Date().toLocaleString('fr-FR')}`,
        url:        publicUrl,
        created_at: new Date().toISOString(),
      }),
    })
    if (!dbRes.ok) throw new Error(`DB échouée (${dbRes.status})`)

    setStatus('✓ Vidéo sauvegardée !', 'success')
    chunks = []
    setTimeout(() => window.close(), 2000)
  } catch (err) {
    setStatus(err.message, 'error')
  }
}

async function refreshSession(s) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  })
  if (!res.ok) return s
  const fresh = await res.json()
  chrome.storage.local.set({ session: fresh })
  return fresh
}

function setStatus(msg, type = '') {
  status.innerHTML  = msg
  status.className  = 'status ' + type
}
