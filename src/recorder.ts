import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'
import { byId } from './dom.js'
// Types (ExtMessage, FormulaEvent, …) : ambiants via src/types.d.ts

const btnStart = byId<HTMLButtonElement>('btn-start')
const btnStop = byId<HTMLButtonElement>('btn-stop')
const statusEl = byId('status')

chrome.runtime.onMessage.addListener((msg: ExtMessage) => {
  if (msg.type === 'STOP') stopRecording()
})

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []

// ── Start ──────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  setStatus('Sélectionne une fenêtre…')
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: true,
    } as DisplayMediaStreamOptions)

    chunks = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.onstop = handleStop
    mediaRecorder.start(1000)

    stream.getVideoTracks()[0].onended = () => stopRecording()

    void chrome.runtime.sendMessage({ type: 'RECORDING_STARTED', startTime: Date.now() } satisfies ExtMessage)

    btnStart.style.display = 'none'
    btnStop.style.display = 'block'
    setStatus('<span class="dot"></span> En cours — clique l\'icône pour arrêter')
  } catch (err) {
    if (err instanceof Error) {
      setStatus(err.name === 'NotAllowedError' ? 'Capture annulée' : err.message, 'error')
    } else {
      setStatus('Erreur inconnue', 'error')
    }
  }
})

// ── Stop ───────────────────────────────────────────────────────────────────
btnStop.addEventListener('click', stopRecording)

function stopRecording(): void {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
  mediaRecorder.stream.getTracks().forEach((t) => t.stop())
  btnStop.style.display = 'none'
  btnStart.style.display = 'block'
  setStatus('Upload en cours…')
}

// ── Upload ─────────────────────────────────────────────────────────────────
async function handleStop(): Promise<void> {
  const result = await chrome.storage.local.get(['session']) as StorageShape
  if (!result.session?.access_token) { setStatus('Non connecté', 'error'); return }

  const session = await refreshSession(result.session)

  // Récupérer les formules capturées depuis le background
  const { events: formulaEvents } = await new Promise<GetFormulaEventsResponse>((resolve) =>
    chrome.runtime.sendMessage({ type: 'GET_FORMULA_EVENTS' } satisfies ExtMessage, resolve),
  )

  try {
    const blob = new Blob(chunks, { type: 'video/webm' })
    const ts = Date.now()
    const fileName = `${session.user.id}/${ts}.webm`

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/recordings/${fileName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'video/webm',
        },
        body: blob,
      },
    )
    if (!uploadRes.ok) {
      const e = await uploadRes.json().catch(() => ({})) as { message?: string }
      throw new Error(`Upload ${uploadRes.status}: ${e.message ?? JSON.stringify(e)}`)
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${fileName}`

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: session.user.id,
        title: `Enregistrement ${new Date().toLocaleString('fr-FR')}`,
        url: publicUrl,
        formula_events: formulaEvents.length > 0 ? formulaEvents : null,
        created_at: new Date().toISOString(),
      } satisfies {
        user_id: string
        title: string
        url: string
        formula_events: FormulaEvent[] | null
        created_at: string
      }),
    })
    if (!dbRes.ok) throw new Error(`DB échouée (${dbRes.status})`)

    void chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' } satisfies ExtMessage)
    setStatus('✓ Vidéo sauvegardée !', 'success')
    chunks = []
    setTimeout(() => window.close(), 2000)
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Erreur inconnue', 'error')
  }
}

async function refreshSession(s: SupabaseSession): Promise<SupabaseSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  })
  if (!res.ok) return s
  const fresh = await res.json() as SupabaseSession
  void chrome.storage.local.set({ session: fresh } satisfies StorageShape)
  return fresh
}

function setStatus(msg: string, type: '' | 'error' | 'success' = ''): void {
  statusEl.innerHTML = msg
  statusEl.className = 'status ' + type
}
