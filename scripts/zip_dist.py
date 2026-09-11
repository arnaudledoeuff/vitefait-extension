#!/usr/bin/env python3
"""Zippe dist/ pour distribution manuelle (téléchargement direct, hors Web Store).

Le zip contient le CONTENU de dist/ à la racine (pas un dossier "dist/" imbriqué) :
une fois dézippé par l'utilisateur, le dossier obtenu peut être sélectionné
directement dans chrome://extensions > "Charger l'extension non empaquetée".
"""
import json
import pathlib
import zipfile

root = pathlib.Path(__file__).resolve().parent.parent
dist = root / 'dist'
release_dir = root / 'release'

if not dist.is_dir():
    raise SystemExit('dist/ introuvable — lance `npm run build` avant `npm run package`.')

manifest = json.loads((dist / 'manifest.json').read_text())
version = manifest['version']

release_dir.mkdir(exist_ok=True)
zip_path = release_dir / f'vitefait-extension-v{version}.zip'

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for file in sorted(dist.rglob('*')):
        if file.is_file():
            zf.write(file, arcname=file.relative_to(dist))

size_kb = zip_path.stat().st_size / 1024
print(f'Créé : {zip_path.relative_to(root)} ({size_kb:.0f} Ko)')
