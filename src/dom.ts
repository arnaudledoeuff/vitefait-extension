/** Récupère un élément par id, lève si absent (les pages de l'extension sont statiques). */
export function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Élément #${id} introuvable`)
  return el as T
}
