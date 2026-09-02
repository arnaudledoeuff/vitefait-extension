import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'
import { byId } from './dom.js'
// Types (ExtMessage, StorageShape, SupabaseSession) : ambiants via src/types.d.ts

const screenLogin = byId('screen-login')
const screenRecording = byId('screen-recording')
const screenLive = byId('screen-live')
const emailInput = byId<HTMLInputElement>('email')
const passwordInput = byId<HTMLInputElement>('password')
const btnLogin = byId<HTMLButtonElement>('btn-login')
const btnStart = byId<HTMLButtonElement>('btn-start')
const btnStop = byId<HTMLButtonElement>('btn-stop')
const btnLogout = byId<HTMLButtonElement>('btn-logout')
const userEmailEl = byId('user-email')

// ── Init ───────────────────────────────────────────────────────────────────
void chrome.storage.local.get(['session', 'isRecording']).then((stored: StorageShape) => {
  if (!stored.session?.access_token) return
  if (stored.isRecording) showLiveScreen()
  else showRecordingScreen(stored.session)
})

// ── Login ──────────────────────────────────────────────────────────────────
btnLogin.addEventListener('click', async () => {
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password) { setStatus('Remplis les deux champs', 'error'); return }

  btnLogin.disabled = true
  setStatus('Connexion…')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json() as SupabaseSession & { error_description?: string }
  btnLogin.disabled = false

  if (!res.ok) { setStatus(data.error_description ?? 'Erreur', 'error'); return }

  void chrome.storage.local.set({ session: data } satisfies StorageShape)
  showRecordingScreen(data)
})

// ── Start ──────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('recorder.html'),
    type: 'popup',
    width: 300,
    height: 150,
    state: 'normal',
  })
  void chrome.storage.local.set({ recorderWindowId: win.id ?? null } satisfies StorageShape)
})

// ── Stop depuis n'importe quel onglet ──────────────────────────────────────
btnStop.addEventListener('click', () => {
  void chrome.runtime.sendMessage({ type: 'STOP_FROM_POPUP' } satisfies ExtMessage)
  showRecordingScreen()
})

// ── Logout ─────────────────────────────────────────────────────────────────
btnLogout.addEventListener('click', () => {
  void chrome.storage.local.remove(['session', 'isRecording'])
  void chrome.action.setBadgeText({ text: '' })
  screenRecording.style.display = 'none'
  screenLogin.style.display = 'block'
})

// ── Helpers écrans ─────────────────────────────────────────────────────────
function showRecordingScreen(session?: SupabaseSession): void {
  if (session) userEmailEl.textContent = session.user.email ?? ''
  screenLogin.style.display = 'none'
  screenLive.style.display = 'none'
  screenRecording.style.display = 'block'
}

function showLiveScreen(): void {
  screenLogin.style.display = 'none'
  screenRecording.style.display = 'none'
  screenLive.style.display = 'block'
}

function setStatus(msg: string, type: '' | 'error' = ''): void {
  const el = byId('login-status')
  el.textContent = msg
  el.className = 'status ' + type
}
