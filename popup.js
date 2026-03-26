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

// ── Init : vérifie si déjà connecté ────────────────────────────────────────
chrome.storage.local.get(['session'], ({ session }) => {
  if (session?.access_token) showRecordingScreen(session)
})

// ── Login ──────────────────────────────────────────────────────────────────
btnLogin.addEventListener('click', async () => {
  const email    = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password) { setStatus(loginStatus, 'Remplis les deux champs', 'error'); return }

  btnLogin.disabled = true
  setStatus(loginStatus, 'Connexion…')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  btnLogin.disabled = false

  if (!res.ok) { setStatus(loginStatus, data.error_description || 'Erreur de connexion', 'error'); return }

  chrome.storage.local.set({ session: data })
  showRecordingScreen(data)
})

// ── Start recording ────────────────────────────────────────────────────────
btnStart.addEventListener('click', () => {
  btnStart.style.display = 'none'
  btnStop.style.display  = 'block'
  setStatus(recStatus, 'Sélectionne une fenêtre…')
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (res) => {
    if (res?.error) {
      setStatus(recStatus, res.error, 'error')
      btnStart.style.display = 'block'
      btnStop.style.display  = 'none'
    } else {
      setStatus(recStatus, '<span class="dot"></span> En cours…')
    }
  })
})

// ── Stop recording ─────────────────────────────────────────────────────────
btnStop.addEventListener('click', () => {
  btnStop.disabled = true
  setStatus(recStatus, 'Upload en cours…')
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (res) => {
    btnStop.disabled       = false
    btnStart.style.display = 'block'
    btnStop.style.display  = 'none'
    if (res?.error) setStatus(recStatus, res.error, 'error')
    else setStatus(recStatus, '✓ Vidéo sauvegardée !', 'success')
  })
})

// ── Logout ─────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  chrome.storage.local.remove('session')
  screenRecording.style.display = 'none'
  screenLogin.style.display     = 'block'
  setStatus(loginStatus, '')
})

// ── Helpers ────────────────────────────────────────────────────────────────
function showRecordingScreen(session) {
  screenLogin.style.display     = 'none'
  screenRecording.style.display = 'block'
  userEmailEl.textContent       = session.user?.email || ''
  chrome.storage.local.set({ session })
}

function setStatus(el, msg, type = '') {
  el.innerHTML   = msg
  el.className   = 'status ' + type
}
