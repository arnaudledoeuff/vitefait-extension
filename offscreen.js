let mediaRecorder = null
let chunks        = []

// Signale au background que l'offscreen est prêt
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' })

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OFFSCREEN_START') {
    startCapture(msg.streamId)
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    stopCapture(sendResponse)
    return true // garde le canal ouvert pour la réponse async
  }
})

async function startCapture(streamId) {
  chunks = []
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource:   'desktop',
          chromeMediaSourceId: streamId,
          maxWidth:            1920,
          maxHeight:           1080,
          maxFrameRate:        30,
        },
      },
      audio: false,
    })
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.start(1000)
    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' })
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: err.message })
  }
}

function stopCapture(sendResponse) {
  if (!mediaRecorder) { sendResponse({ error: 'Capture non démarrée' }); return }
  mediaRecorder.onstop = async () => {
    const blob        = new Blob(chunks, { type: 'video/webm' })
    const arrayBuffer = await blob.arrayBuffer()
    sendResponse({ buffer: Array.from(new Uint8Array(arrayBuffer)) })
    mediaRecorder = null
    chunks = []
  }
  mediaRecorder.stop()
  mediaRecorder.stream.getTracks().forEach(t => t.stop())
}
