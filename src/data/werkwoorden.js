// ── WERKWOORDZINNEN ───────────────────────────────────────────────────────────
// Losse databron voor de itemvorm "zin met een gat" (werkwoordspelling
// tegenwoordige tijd). Een los woord dicteren werkt hier niet: welke vorm
// goed is hangt af van het onderwerp in de zin, dus elk item is een hele zin.
//
// Bron: src/data/groep6_nieuw.json → "zinnen". Net als bij de woorden daar
// alleen de items die al "gecontroleerd": true hebben (zie data/woorden.js
// voor dezelfde aanpak op de losse woorden).
//
// Eén item: { categorie, zin (met "___" als gat), infinitief, onderwerp,
//             juisteVorm, strategie }
import groep6Data from "./groep6_nieuw.json";
import { CATEGORIEEN, FALLBACK_CATEGORIE } from "./woorden";

export const WERKWOORD_CATEGORIE = "werkwoord-tegenwoordige-tijd";

export const ALLE_WERKWOORDZINNEN = (groep6Data.zinnen ?? [])
  .filter((item) => item.gecontroleerd === true)
  .map((item) => ({
    categorie: CATEGORIEEN[item.categorie] ? item.categorie : FALLBACK_CATEGORIE,
    zin: item.zin,
    infinitief: item.infinitief,
    onderwerp: item.onderwerp,
    juisteVorm: item.juisteVorm,
    strategie: item.strategie,
  }));

// Zinnen van één categorie (nu alleen WERKWOORD_CATEGORIE, maar zo blijft dit
// uitbreidbaar als er later een tweede zin-met-gat-categorie bijkomt).
export function zinnenVoorCategorie(categorieSleutel) {
  return ALLE_WERKWOORDZINNEN.filter((z) => z.categorie === categorieSleutel);
}

// Splitst een zin op het gat, voor het renderen als "voor ___ na".
export function splitsZin(zin, gatMarkering = "___") {
  const i = zin.indexOf(gatMarkering);
  if (i === -1) return [zin, ""];
  return [zin.slice(0, i), zin.slice(i + gatMarkering.length)];
}
