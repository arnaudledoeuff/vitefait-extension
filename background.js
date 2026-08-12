// L'état (isRecording / recordingStartTime / formulaEvents / recorderWindowId) vit dans
// chrome.storage.local plutôt qu'en variables — le service worker MV3 peut être tué après
// ~30s d'inactivité et perdrait tout état gardé en mémoire pendant un enregistrement long.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.type === 'RECORDING_STARTED') {
    const startTime = msg.startTime || Date.now()
    chrome.storage.local.set({ isRecording: true, recordingStartTime: startTime, formulaEvents: [] })
    chrome.action.setBadgeText({ text: '●' })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    broadcastToTabs({ type: 'SHOW_OVERLAY', startTime })
  }

  if (msg.type === 'RECORDING_STOPPED') {
    chrome.storage.local.set({ isRecording: false, recordingStartTime: null, recorderWindowId: null })
    chrome.action.setBadgeText({ text: '' })
    broadcastToTabs({ type: 'HIDE_OVERLAY' })
  }

  if (msg.type === 'STOP_FROM_POPUP') {
    chrome.runtime.sendMessage({ type: 'STOP' })
  }

  // Reçu depuis content.js (Google Sheets)
  if (msg.type === 'FORMULA_EVENT') {
    handleFormulaEvent(msg)
  }

  // recorder.js demande les events avant l'upload
  if (msg.type === 'GET_FORMULA_EVENTS') {
    handleGetFormulaEvents(sendResponse)
    return true // garde le canal ouvert pour la réponse async
  }
})

async function handleFormulaEvent(msg) {
  const { isRecording, recordingStartTime, formulaEvents = [] } =
    await chrome.storage.local.get(['isRecording', 'recordingStartTime', 'formulaEvents'])
  if (!isRecording || recordingStartTime == null) return

  formulaEvents.push({
    t:       Date.now() - recordingStartTime, // ms depuis début enregistrement
    cell:    msg.cell,
    formula: msg.formula,
  })
  chrome.storage.local.set({ formulaEvents })
}

async function handleGetFormulaEvents(sendResponse) {
  const { formulaEvents = [] } = await chrome.storage.local.get(['formulaEvents'])
  sendResponse({ events: formulaEvents })
  chrome.storage.local.set({ formulaEvents: [] }) // reset après récupération
}

// Réinitialise l'état si la fenêtre d'enregistrement est fermée sans passer par "Arrêter"
// (sinon le badge rouge et le widget restent affichés indéfiniment)
chrome.windows.onRemoved.addListener(async (closedWindowId) => {
  const { recorderWindowId, isRecording } = await chrome.storage.local.get(['recorderWindowId', 'isRecording'])
  if (isRecording && closedWindowId === recorderWindowId) {
    chrome.storage.local.set({ isRecording: false, recordingStartTime: null, recorderWindowId: null })
    chrome.action.setBadgeText({ text: '' })
    broadcastToTabs({ type: 'HIDE_OVERLAY' })
  }
})

// Injecte l'overlay sur les nouveaux onglets si enregistrement en cours
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return
  const { isRecording, recordingStartTime } = await chrome.storage.local.get(['isRecording', 'recordingStartTime'])
  if (isRecording) {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_OVERLAY', startTime: recordingStartTime }).catch(() => {})
  }
})

function broadcastToTabs(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}))
  })
}
