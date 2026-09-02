// Types (ExtMessage, OffscreenStopResponse) : ambiants via src/types.d.ts

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []

// Signale au background que l'offscreen est prêt
void chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' } satisfies ExtMessage)

chrome.runtime.onMessage.addListener((msg: ExtMessage, _sender, sendResponse) => {
  if (msg.type === 'OFFSCREEN_START') {
    void startCapture(msg.streamId)
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    stopCapture(sendResponse)
    return true // garde le canal ouvert pour la réponse async
  }
})

async function startCapture(streamId: string): Promise<void> {
  chunks = []
  try {
    // `mandatory` : contrainte legacy Chrome pour la capture desktop, hors spec
    const constraints = {
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30,
        },
      },
      audio: false,
    } as unknown as MediaStreamConstraints

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    mediaRecorder.start(1000)
    void chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' } satisfies ExtMessage)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    void chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error } satisfies ExtMessage)
  }
}

function stopCapture(sendResponse: (response: OffscreenStopResponse) => void): void {
  const recorder = mediaRecorder
  if (!recorder) { sendResponse({ error: 'Capture non démarrée' }); return }
  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    const arrayBuffer = await blob.arrayBuffer()
    sendResponse({ buffer: Array.from(new Uint8Array(arrayBuffer)) })
    mediaRecorder = null
    chunks = []
  }
  recorder.stop()
  recorder.stream.getTracks().forEach((t) => t.stop())
}
