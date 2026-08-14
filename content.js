// ── Capture des formules Google Sheets ────────────────────────────────────
// Injecté uniquement sur docs.google.com/spreadsheets (voir manifest)

// Sélecteurs de la barre de formule — Google peut les changer, on teste en cascade
const FORMULA_SELECTORS = [
  '#t-formula-bar-input',
  '.cell-input',
  '[data-target="formula-bar"]',
  '.formula-bar-input',
]

// Sélecteurs de la "Name Box" (référence cellule active ex: D4)
const CELL_REF_SELECTORS = [
  '#t-name-box',
  '.goog-flat-menu-button-caption',
  '[id*="name-box"]',
]

let lastCell    = null
let lastFormula = null

function getFormulaBar() {
  for (const sel of FORMULA_SELECTORS) {
    const el = document.querySelector(sel)
    if (el) return el
  }
  console.warn('[vitefait] Barre de formule introuvable — sélecteurs à mettre à jour')
  return null
}

function getCellRef() {
  for (const sel of CELL_REF_SELECTORS) {
    const el = document.querySelector(sel)
    const text = el?.value || el?.textContent?.trim()
    if (text?.match(/^[A-Z]+\d+/)) return text.trim()
  }
  return null
}

function onFormulaChange() {
  try {
    const bar     = getFormulaBar()
    const formula = (bar?.value || bar?.textContent || '').trim()
    const cell    = getCellRef()

    // Ne capturer que les formules et filtrer les doublons
    if (!formula.startsWith('=')) return
    if (formula === lastFormula && cell === lastCell) return

    lastFormula = formula
    lastCell    = cell

    chrome.runtime.sendMessage({
      type:    'FORMULA_EVENT',
      cell:    cell || '?',
      formula,
    })
  } catch (_) {}
}

// ── Capture au clic uniquement ────────────────────────────────────────────
// Volontairement pas de MutationObserver/keyup : on ne veut pas capturer
// chaque frappe pendant la saisie, seulement l'état de la formule au moment
// où l'utilisateur clique sur une cellule (plus simple à suivre en démo).
function attachObserver() {
  const bar = getFormulaBar()
  if (!bar) return false

  document.addEventListener('click', () => {
    // Léger délai : Sheets met à jour la barre de formule juste après le clic
    setTimeout(onFormulaChange, 50)
  }, { passive: true })

  return true
}

// Retry tant que Sheets n'est pas prêt
function waitForSheets() {
  if (attachObserver()) return
  const obs = new MutationObserver(() => {
    if (attachObserver()) obs.disconnect()
  })
  obs.observe(document.body, { childList: true, subtree: true })
}

waitForSheets()
