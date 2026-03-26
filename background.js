chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_STARTED') {
    chrome.action.setBadgeText({ text: '●' })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    chrome.storage.local.set({ isRecording: true })
    broadcastToTabs({ type: 'SHOW_OVERLAY' })
  }
  if (msg.type === 'RECORDING_STOPPED') {
    chrome.action.setBadgeText({ text: '' })
    chrome.storage.local.set({ isRecording: false })
    broadcastToTabs({ type: 'HIDE_OVERLAY' })
  }
  if (msg.type === 'STOP_FROM_POPUP') {
    chrome.runtime.sendMessage({ type: 'STOP' })
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
