# vitefait.io — Extension Chrome

Démarre et arrête tes enregistrements [vitefait.io](https://vitefait-io.vercel.app) depuis n'importe quel onglet, avec un tracking de souris cross-tabs.

Écrite en **TypeScript**, compilée par `tsc` vers `dist/` (aucun bundler).

## Développement

```bash
npm install
npm run build      # compile src/*.ts -> dist/*.js + copie manifest/HTML
npm run watch      # recompile à chaque changement
npm run typecheck  # vérifie les types sans générer de fichiers
```

## Installation dans Chrome

1. `npm install && npm run build`
2. Ouvre `chrome://extensions`
3. Active le **Mode développeur** (en haut à droite)
4. Clique **« Charger l'extension non empaquetée »**
5. Sélectionne le dossier **`dist/`** (pas la racine du repo)

Après un `npm run build` (ou en `npm run watch`), clique l'icône « recharger » de l'extension dans `chrome://extensions` pour prendre les changements.

## Utilisation

1. Ouvre [vitefait.io](https://vitefait-io.vercel.app) dans un onglet
2. Clique sur l'icône de l'extension dans la barre Chrome
3. Clique **Démarrer l'enregistrement**
4. Navigue sur n'importe quel onglet — la souris est trackée partout
5. Clique **Arrêter l'enregistrement** depuis n'importe quel onglet

## Structure

```
src/
├── types.d.ts     types ambiants partagés (messages, session, storage)
├── config.ts      URL + clé anon Supabase
├── dom.ts         helper byId()
├── background.ts  service worker — état + badge + broadcast overlay
├── content.ts     capture des formules Google Sheets (content script)
├── overlay.ts     widget flottant "enregistrement en cours" (content script)
├── popup.ts       popup de l'extension — login + start/stop
├── recorder.ts    fenêtre d'enregistrement — capture + upload Supabase
└── offscreen.ts   capture desktop via document offscreen (non câblé actuellement)
manifest.json, *.html   copiés tels quels dans dist/
```
