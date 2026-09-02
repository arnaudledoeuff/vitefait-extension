// ─────────────────────────────────────────────────────────────────────────────
// Types partagés, ambiants (fichier .d.ts sans export → visibles partout sans
// import). Indispensable pour les content scripts : déclarés dans le manifest,
// ils ne peuvent pas être des modules ES, donc pas d'`import`.
// ─────────────────────────────────────────────────────────────────────────────

/** Formule Google Sheets capturée au clic. `t` = ms depuis le début de l'enregistrement. */
interface FormulaEvent {
  t: number
  cell: string
  formula: string
}

/** Réponse d'authentification Supabase (`/auth/v1/token`), champs utilisés seulement. */
interface SupabaseSession {
  access_token: string
  refresh_token: string
  user: { id: string; email?: string }
}

/** Clés stockées dans chrome.storage.local. */
interface StorageShape {
  isRecording?: boolean
  recordingStartTime?: number | null
  formulaEvents?: FormulaEvent[]
  recorderWindowId?: number | null
  session?: SupabaseSession
}

/** Messages échangés via chrome.runtime.sendMessage / onMessage. */
type ExtMessage =
  | { type: 'RECORDING_STARTED'; startTime?: number }
  | { type: 'RECORDING_STOPPED' }
  | { type: 'STOP_FROM_POPUP' }
  | { type: 'STOP' }
  | { type: 'FORMULA_EVENT'; cell: string; formula: string }
  | { type: 'GET_FORMULA_EVENTS' }
  | { type: 'SHOW_OVERLAY'; startTime?: number }
  | { type: 'HIDE_OVERLAY' }
  | { type: 'OFFSCREEN_READY' }
  | { type: 'OFFSCREEN_START'; streamId: string }
  | { type: 'OFFSCREEN_STOP' }
  | { type: 'CAPTURE_STARTED' }
  | { type: 'CAPTURE_ERROR'; error: string }

/** Réponse à `GET_FORMULA_EVENTS`. */
interface GetFormulaEventsResponse {
  events: FormulaEvent[]
}

/** Réponse à `OFFSCREEN_STOP`. */
type OffscreenStopResponse =
  | { buffer: number[] }
  | { error: string }
