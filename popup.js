const SUPABASE_URL      = 'https://kdwmnlbttjmfvlbrprxv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd21ubGJ0dGptZnZsYnJwcnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTExOTQsImV4cCI6MjA4NjkyNzE5NH0.UXI7d14FIjfNrk5HarzxbOt8mx7Ha9GqQ0oRX6qG6nQ'

const screenLogin     = document.getElementById('screen-login')
const screenRecording = document.getElementById('screen-recording')
const screenLive      = document.getElementById('screen-live')
const emailInput      = document.getElementById('email')
const passwordInput   = document.getElementById('password')
const btnLogin        = document.getElementById('btn-login')
const loginStatus     = document.getElementById('login-status')
const btnStart        = document.getElementById('btn-start')
const btnStop         = document.getElementById('btn-stop')
const btnLogout       = document.getElementById('btn-logout')
const userEmailEl     = document.getElementById('user-email')

// ── Init ───────────────────────────────────────────────────────────────────
chrome.storage.local.get(['session', 'isRecording'], ({ session, isRecording }) => {
  if (!session?.access_token) return
  if (isRecording) showLiveScreen()
  else showRecordingScreen(session)
})

// ── Login ──────────────────────────────────────────────────────────────────
btnLogin.addEventListener('click', async () => {
  const email    = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password) { setStatus('Remplis les deux champs', 'error'); return }

  btnLogin.disabled = true
  setStatus('Connexion…')

  const res  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  btnLogin.disabled = false

  if (!res.ok) { setStatus(data.error_description || 'Erreur', 'error'); return }

  chrome.storage.local.set({ session: data })
  showRecordingScreen(data)
})

// ── Start ──────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', () => {
  chrome.windows.create({
    url:    chrome.runtime.getURL('recorder.html'),
    type:   'popup',
    width:  300,
    height: 150,
    state:  'normal',
  })
})

// ── Stop depuis n'importe quel onglet ──────────────────────────────────────
btnStop.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_FROM_POPUP' })
  showRecordingScreen()
})

// ── Logout ─────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  chrome.storage.local.remove(['session', 'isRecording'])
  chrome.action.setBadgeText({ text: '' })
  screenRecording.style.display = 'none'
  screenLogin.style.display     = 'block'
})

// ── Helpers ────────────────────────────────────────────────────────────────
function showRecordingScreen(s) {
  if (s) userEmailEl.textContent = s.user?.email || ''
  screenLogin.style.display     = 'none'
  screenLive.style.display      = 'none'
  screenRecording.style.display = 'block'
}

function showLiveScreen() {
  screenLogin.style.display     = 'none'
  screenRecording.style.display = 'none'
  screenLive.style.display      = 'block'
}

function setStatus(msg, type = '') {
  const el = document.getElementById('login-status')
  el.textContent = msg
  el.className   = 'status ' + type
}
