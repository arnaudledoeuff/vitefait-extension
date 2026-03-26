// Gestion du badge et relais des commandes stop
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_STARTED') {
    chrome.action.setBadgeText({ text: '●' })
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    chrome.storage.local.set({ isRecording: true })
  }
  if (msg.type === 'RECORDING_STOPPED') {
    chrome.action.setBadgeText({ text: '' })
    chrome.storage.local.set({ isRecording: false })
  }
  if (msg.type === 'STOP_FROM_POPUP') {
    // Cherche la fenêtre recorder et lui envoie STOP
    chrome.runtime.sendMessage({ type: 'STOP' })
  }
})
