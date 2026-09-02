// Recompile en continu : tsc --watch + copie des assets à chaque changement.
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const runCopy = () => spawn(process.execPath, ['scripts/copy-assets.mjs'], { cwd: root, stdio: 'inherit' })

runCopy()
spawn('npx', ['tsc', '--watch', '--preserveWatchOutput'], { cwd: root, stdio: 'inherit', shell: true })

let timer
for (const asset of ['manifest.json', 'popup.html', 'recorder.html', 'offscreen.html']) {
  watch(join(root, asset), () => {
    clearTimeout(timer)
    timer = setTimeout(runCopy, 100)
  })
}
console.log('watch : tsc + assets — Ctrl+C pour arrêter')
