const SUPABASE_URL      = 'https://kdwmnlbttjmfvlbrprxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd21ubGJ0dGptZnZsYnJwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTExOTQsImV4cCI6MjA4NjkyNzE5NH0.UXI7d14FIjfNrk5HarzxbOt8mx7Ha9GqQ0oRX6qG6nQ'

const screenLogin     = document.getElementById('screen-login')
const screenRecording = document.getElementById('screen-recording')
const emailInput      = document.getElementById('email')
const passwordInput   = document.getElementById('password')
const btnLogin        = document.getElementById('btn-login')
const loginStatus     = document.getElementById('login-status')
const btnStart        = document.getElementById('btn-start')
const recStatus       = document.getElementById('rec-status')
const btnLogout       = document.getElementById('btn-logout')
const userEmailEl     = document.getElementById('user-email')

// ── Init ───────────────────────────────────────────────────────────────────
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

// ── Ouvrir la fenêtre enregistreur ─────────────────────────────────────────
btnStart.addEventListener('click', () => {
  chrome.windows.create({
    url:    chrome.runtime.getURL('recorder.html'),
    type:   'popup',
    width:  300,
    height: 160,
  })
  window.close()
})

// ── Logout ─────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  chrome.storage.local.remove('session')
  screenRecording.style.display = 'none'
  screenLogin.style.display     = 'block'
})

// ── Helpers ────────────────────────────────────────────────────────────────
function showRecordingScreen(s) {
  screenLogin.style.display     = 'none'
  screenRecording.style.display = 'block'
  userEmailEl.textContent       = s.user?.email || ''
}

function setStatus(el, msg, type = '') {
  el.textContent = msg
  el.className   = 'status ' + type
}
