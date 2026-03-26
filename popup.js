const SUPABASE_URL      = 'https://kdwmnlbttjmfvlbrprxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd21ubGJ0dGptZnZsYnJwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTExOTQsImV4cCI6MjA4NjkyNzE5NH0.UXI7d14FIjfNrk5HarzxbOt8mx7Ha9GqQ0oRX6qG6nQ'

const screenLogin     = document.getElementById('screen-login')
const screenRecording = document.getElementById('screen-recording')
const emailInput      = document.getElementById('email')
const passwordInput   = document.getElementById('password')
const btnLogin        = document.getElementById('btn-login')
const loginStatus     = document.getElementById('login-status')
const btnStart        = document.getElementById('btn-start')
const btnStop         = document.getElementById('btn-stop')
const recStatus       = document.getElementById('rec-status')
const btnLogout       = document.getElementById('btn-logout')
const userEmailEl     = document.getElementById('user-email')
const warning         = document.getElementById('warning')

let mediaRecorder = null
let chunks        = []
let session       = null

// ── Init ───────────────────────────────────────────────────────────────────
chrome.storage.local.get(['session'], (result) => {
  if (result.session?.access_token) showRecordingScreen(result.session)
})

// ── Login ──────────────────────────────────────────────────────────────────
btnLogin.addEventListener('click', async () => {
  const email    = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password) { setStatus(loginStatus, 'Remplis les deux champs', 'error'); return }

  btnLogin.disabled = true
  setStatus(loginStatus, 'Connexion…')

  const res  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  btnLogin.disabled = false

  if (!res.ok) { setStatus(loginStatus, data.error_description || 'Erreur', 'error'); return }

  chrome.storage.local.set({ session: data })
  showRecordingScreen(data)
})

// ── Start ──────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  setStatus(recStatus, 'Sélectionne une fenêtre…')
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
    warning.style.display  = 'block'
    setStatus(recStatus, '⬤ En cours…')
  } catch (err) {
    setStatus(recStatus, err.message === 'Permission denied' ? 'Capture annulée' : err.message, 'error')
  }
})

// ── Stop ───────────────────────────────────────────────────────────────────
btnStop.addEventListener('click', () => stopRecording())

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
  mediaRecorder.stream.getTracks().forEach(t => t.stop())
  btnStop.style.display  = 'none'
  btnStart.style.display = 'block'
  warning.style.display  = 'none'
  setStatus(recStatus, 'Upload en cours…')
}

// ── Upload ─────────────────────────────────────────────────────────────────
async function handleStop() {
  const result = await chrome.storage.local.get(['session'])
  session = result.session
  if (!session?.access_token) { setStatus(recStatus, 'Non connecté', 'error'); return }

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
        user_id:    session.user.id,
        title:      `Enregistrement ${new Date().toLocaleString('fr-FR')}`,
        url:        publicUrl,
        created_at: new Date().toISOString(),
      }),
    })
    if (!dbRes.ok) throw new Error(`DB échouée (${dbRes.status})`)

    setStatus(recStatus, '✓ Vidéo sauvegardée !', 'success')
    chunks = []
  } catch (err) {
    setStatus(recStatus, err.message, 'error')
  }
}

// ── Logout ─────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  chrome.storage.local.remove('session')
  screenRecording.style.display = 'none'
  screenLogin.style.display     = 'block'
})

// ── Helpers ────────────────────────────────────────────────────────────────
function showRecordingScreen(s) {
  session = s
  screenLogin.style.display     = 'none'
  screenRecording.style.display = 'block'
  userEmailEl.textContent       = s.user?.email || ''
}

function setStatus(el, msg, type = '') {
  el.textContent = msg
  el.className   = 'status ' + type
}
