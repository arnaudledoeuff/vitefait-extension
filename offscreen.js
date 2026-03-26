let mediaRecorder = null
let chunks        = []

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OFFSCREEN_START') {
    startCapture(msg.streamId)
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    stopCapture(sendResponse)
    return true // async
  }
})

async function startCapture(streamId) {
  chunks = []
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource:   'desktop',
        chromeMediaSourceId: streamId,
      },
    },
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
      },
    },
  })

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'

  mediaRecorder = new MediaRecorder(stream, { mimeType })
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  mediaRecorder.start(1000)
}

function stopCapture(sendResponse) {
  if (!mediaRecorder) { sendResponse({ error: 'Pas de recorder actif' }); return }
  mediaRecorder.onstop = () => {
    sendResponse({ chunks })
    mediaRecorder = null
  }
  mediaRecorder.stop()
  mediaRecorder.stream.getTracks().forEach(t => t.stop())
}
