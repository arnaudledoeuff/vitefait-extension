const btnStart = document.getElementById('btn-start')
const btnStop  = document.getElementById('btn-stop')
const status   = document.getElementById('status')

const VITEFAIT_URL = 'https://vitefait-io.vercel.app'
const LOCAL_URL    = 'http://localhost:5173'

async function findVitefaitTab() {
  const tabs = await chrome.tabs.query({})
  return tabs.find(t => t.url?.startsWith(VITEFAIT_URL) || t.url?.startsWith(LOCAL_URL))
}

async function sendCommand(command) {
  const tab = await findVitefaitTab()
  if (!tab) {
    status.textContent = 'Ouvre vitefait.io d\'abord'
    status.className = 'error'
    return
  }
  chrome.tabs.sendMessage(tab.id, { type: command })
  status.className = ''
  if (command === 'vitefait:start') {
    status.textContent = 'Enregistrement en cours...'
    btnStart.style.display = 'none'
    btnStop.style.display  = 'block'
  } else {
    status.textContent = 'Enregistrement arrêté'
    btnStart.style.display = 'block'
    btnStop.style.display  = 'none'
  }
}

btnStart.addEventListener('click', () => sendCommand('vitefait:start'))
btnStop.addEventListener('click',  () => sendCommand('vitefait:stop'))
