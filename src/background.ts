// L'état (isRecording / recordingStartTime / formulaEvents / recorderWindowId) vit dans
// chrome.storage.local plutôt qu'en variables — le service worker MV3 peut être tué après
// ~30s d'inactivité et perdrait tout état gardé en mémoire pendant un enregistrement long.

// Types (ExtMessage, StorageShape, …) : ambiants via src/types.d.ts

chrome.runtime.onMessage.addListener((msg: ExtMessage, _sender, sendResponse) => {

  if (msg.type === 'RECORDING_STARTED') {
    const startTime = msg.startTime ?? Date.now()
    void chrome.storage.local.set({ isRecording: true, recordingStartTime: startTime, formulaEvents: [] })
    void chrome.action.setBadgeText({ text: '●' })
    void chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    broadcastToTabs({ type: 'SHOW_OVERLAY', startTime })
  }

  if (msg.type === 'RECORDING_STOPPED') {
    void chrome.storage.local.set({ isRecording: false, recordingStartTime: null, recorderWindowId: null })
    void chrome.action.setBadgeText({ text: '' })
    broadcastToTabs({ type: 'HIDE_OVERLAY' })
  }

  if (msg.type === 'STOP_FROM_POPUP') {
    void chrome.runtime.sendMessage({ type: 'STOP' } satisfies ExtMessage)
  }

  // Reçu depuis content.ts (Google Sheets)
  if (msg.type === 'FORMULA_EVENT') {
    void handleFormulaEvent(msg)
  }

  // recorder.ts demande les events avant l'upload
  if (msg.type === 'GET_FORMULA_EVENTS') {
    void handleGetFormulaEvents(sendResponse)
    return true // garde le canal ouvert pour la réponse async
  }
})

async function handleFormulaEvent(msg: Extract<ExtMessage, { type: 'FORMULA_EVENT' }>): Promise<void> {
  const { isRecording, recordingStartTime, formulaEvents = [] } =
    await chrome.storage.local.get(['isRecording', 'recordingStartTime', 'formulaEvents']) as StorageShape
  if (!isRecording || recordingStartTime == null) return

  const event: FormulaEvent = {
    t: Date.now() - recordingStartTime, // ms depuis début enregistrement
    cell: msg.cell,
    formula: msg.formula,
  }
  formulaEvents.push(event)
  void chrome.storage.local.set({ formulaEvents } satisfies StorageShape)
}

async function handleGetFormulaEvents(
  sendResponse: (response: GetFormulaEventsResponse) => void,
): Promise<void> {
  const { formulaEvents = [] } =
    await chrome.storage.local.get(['formulaEvents']) as StorageShape
  sendResponse({ events: formulaEvents })
  void chrome.storage.local.set({ formulaEvents: [] } satisfies StorageShape) // reset après récupération
}

// Réinitialise l'état si la fenêtre d'enregistrement est fermée sans passer par "Arrêter"
// (sinon le badge rouge et le widget restent affichés indéfiniment)
chrome.windows.onRemoved.addListener(async (closedWindowId) => {
  const { recorderWindowId, isRecording } =
    await chrome.storage.local.get(['recorderWindowId', 'isRecording']) as StorageShape
  if (isRecording && closedWindowId === recorderWindowId) {
    void chrome.storage.local.set({ isRecording: false, recordingStartTime: null, recorderWindowId: null })
    void chrome.action.setBadgeText({ text: '' })
    broadcastToTabs({ type: 'HIDE_OVERLAY' })
  }
})

// Injecte l'overlay sur les nouveaux onglets si enregistrement en cours
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return
  const { isRecording, recordingStartTime } =
    await chrome.storage.local.get(['isRecording', 'recordingStartTime']) as StorageShape
  if (isRecording) {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_OVERLAY', startTime: recordingStartTime ?? undefined } satisfies ExtMessage).catch(() => {})
  }
})

function broadcastToTabs(msg: ExtMessage): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
    }
  })
}
