// ── Capture des formules Google Sheets ────────────────────────────────────
// Injecté uniquement sur sheets.google.com (voir manifest)

if (!location.hostname.includes('docs.google.com')) return // garde extra

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

// ── Attendre que Sheets soit chargé (SPA) ─────────────────────────────────
function attachObserver() {
  const bar = getFormulaBar()
  if (!bar) return false

  // MutationObserver sur la barre de formule (contenteditable ou input)
  const obs = new MutationObserver(onFormulaChange)
  obs.observe(bar, { characterData: true, childList: true, subtree: true })

  // Fallback : événements clavier/souris sur le document (changement de cellule)
  document.addEventListener('keyup',   onFormulaChange, { passive: true })
  document.addEventListener('mouseup', onFormulaChange, { passive: true })

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
