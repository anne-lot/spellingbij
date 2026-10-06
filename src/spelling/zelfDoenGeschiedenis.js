// ── GESCHIEDENIS VAN "ZELF DOEN"-RONDES ──────────────────────────────────────
// Los opgeslagen van het categorie-voortgangsmodel (dat blijft de bron voor de
// gespreide herhaling). Dit is alleen een kort logje van de laatste rondes,
// zodat een kind of ouder de ontwikkeling kan zien ("vorige keer 12, nu 16").
// Net als de rest van de app: puur lokaal, geen account.

export const OPSLAG_KEY = "spellingbij_zelfdoen_geschiedenis_v1";
export const GESCHIEDENIS_MAX = 10;

export function leesGeschiedenis() {
  try {
    const ruw = JSON.parse(localStorage.getItem(OPSLAG_KEY));
    return Array.isArray(ruw) ? ruw : [];
  } catch {
    return [];
  }
}

// { ts, totaal, goed, categorieen: [sleutel, ...] }
export function bewaarResultaat(resultaat) {
  try {
    const geschiedenis = [...leesGeschiedenis(), resultaat].slice(-GESCHIEDENIS_MAX);
    localStorage.setItem(OPSLAG_KEY, JSON.stringify(geschiedenis));
    return geschiedenis;
  } catch {
    /* geen opslag beschikbaar — de ronde telt nog steeds mee in het
       categorie-voortgangsmodel, alleen dit overzichtje gaat dan verloren */
    return leesGeschiedenis();
  }
}
