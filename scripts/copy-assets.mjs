// Copie les fichiers statiques (manifest + pages HTML) dans dist/.
// tsc s'occupe des .ts → dist/*.js ; ce script complète le paquet chargé par Chrome.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

const ASSETS = [
  'manifest.json',
  'popup.html',
  'recorder.html',
  'offscreen.html',
]

mkdirSync(dist, { recursive: true })
for (const asset of ASSETS) {
  const dest = join(dist, asset)
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(join(root, asset), dest)
  console.log(`  copié  ${asset}`)
}
console.log('dist/ prêt — charge ce dossier dans chrome://extensions')
