let recordingStartTime = null
let formulaEvents      = []

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {

  if (msg.type === 'RECORDING_STARTED') {
    recordingStartTime = msg.startTime || Date.now()
    formulaEvents      = []
    chrome.action.setBadgeText({ text: '●' })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    chrome.storage.local.set({ isRecording: true })
    broadcastToTabs({ type: 'SHOW_OVERLAY' })
  }

  if (msg.type === 'RECORDING_STOPPED') {
    recordingStartTime = null
    chrome.action.setBadgeText({ text: '' })
    chrome.storage.local.set({ isRecording: false })
    broadcastToTabs({ type: 'HIDE_OVERLAY' })
  }

  if (msg.type === 'STOP_FROM_POPUP') {
    chrome.runtime.sendMessage({ type: 'STOP' })
  }

  // Reçu depuis content.js (Google Sheets)
  if (msg.type === 'FORMULA_EVENT' && recordingStartTime !== null) {
    formulaEvents.push({
      t:       Date.now() - recordingStartTime, // ms depuis début enregistrement
      cell:    msg.cell,
      formula: msg.formula,
    })
  }

  // recorder.js demande les events avant l'upload
  if (msg.type === 'GET_FORMULA_EVENTS') {
    sendResponse({ events: formulaEvents })
    formulaEvents = [] // reset après récupération
    return true
  }
})

// Injecte l'overlay sur les nouveaux onglets si enregistrement en cours
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== 'complete') return
  const { isRecording } = await chrome.storage.local.get(['isRecording'])
  if (isRecording) {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_OVERLAY' }).catch(() => {})
  }
})

function broadcastToTabs(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}))
  })
}
