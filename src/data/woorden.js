// ── WOORDDATA ─────────────────────────────────────────────────────────────────
// Eén plek waar alle woordenlijsten worden ingelezen en genormaliseerd, zodat
// elke oefenvorm (Flitswoorden, dictee, …) met hetzelfde woordformaat werkt:
//
//   { woord: "maan", categorie: "open-lettergreep", groep: 4, lijst: "g4_..." }
//
// FORMAAT VAN src/data/flitswoorden.json
//   "g4_voorbeeld": {
//     "groep": 4,
//     "standaardCategorie": "open-lettergreep",   // optioneel
//     "woorden": [
//       { "w": "maan", "categorie": "open-lettergreep" },
//       "lopen"                                    // mag ook: erft standaardCategorie
//     ]
//   }
//
// Een woord mag dus als object (met eigen categorie) of als losse string worden
// opgeschreven. Een string erft "standaardCategorie" van zijn lijst, en anders
// FALLBACK_CATEGORIE. Zo kun je snel nieuwe woorden toevoegen zonder voor elk
// woord een categorie te hoeven bedenken.

import flitsData from "./flitswoorden.json";
import categorieData from "./categorieen.json";
import groep6Data from "./groep6_nieuw.json";

export const FALLBACK_CATEGORIE = "onregelmatig";

// { "ei-ij": { label, voorbeeld }, ... }
export const CATEGORIEEN = categorieData.categorieen;
export const CATEGORIE_SLEUTELS = Object.keys(CATEGORIEEN);

export function categorieLabel(sleutel) {
  return CATEGORIEEN[sleutel]?.label ?? sleutel;
}

export function categorieVoorbeeld(sleutel) {
  return CATEGORIEEN[sleutel]?.voorbeeld ?? "";
}

// Alleen gezet bij categorieën die aan één specifieke groep hangen (nu de
// nieuwe groep 6-categorieën). Er is geen groepskeuze in dit scherm — dit is
// puur een label ("groep 6"), geen filter. null = geen label nodig.
export function categorieGroep(sleutel) {
  return CATEGORIEEN[sleutel]?.groep ?? null;
}

// Voorbeeldwoorden met het stukje dat de regel laat zien, bv.
// [{ woord:"takken", nadruk:"kk" }, ...] — zie _toelichting in categorieen.json.
// Valt terug op de losse "voorbeeld"-string (zonder nadruk) als een categorie
// nog geen voorbeeldWoorden heeft, zodat een handmatig toegevoegde categorie
// nooit crasht.
export function categorieVoorbeeldWoorden(sleutel) {
  const cat = CATEGORIEEN[sleutel];
  if (cat?.voorbeeldWoorden) return cat.voorbeeldWoorden;
  return (cat?.voorbeeld ?? "").split(",").map((w) => ({ woord: w.trim(), nadruk: null })).filter((w) => w.woord);
}

// Instellingen uit de woorddata (ongewijzigd t.o.v. eerder).
export const STANDAARD_FLITSTIJD = flitsData.standaardFlitstijd ?? 3;
export const SESSIE_LENGTE = flitsData.sessieLengte ?? 12;
export const FLITSTIJD_PER_GROEP = flitsData.flitstijdPerGroep ?? {};

export const ALLE_GROEPEN = [3, 4, 5, 6, 7, 8];

// Normaliseer één item uit een "woorden"-array naar het interne woordformaat.
function normaliseerWoord(item, lijstNaam, cfg) {
  const woord = typeof item === "string" ? item : item.w ?? item.woord;
  const ruw = typeof item === "string" ? undefined : item.categorie;
  const categorie = ruw ?? cfg.standaardCategorie ?? FALLBACK_CATEGORIE;
  return {
    woord,
    // Een categorie die (nog) niet in categorieen.json staat mag de app niet
    // laten omvallen; die valt terug op de hoogfrequent-bak.
    categorie: CATEGORIEEN[categorie] ? categorie : FALLBACK_CATEGORIE,
    groep: cfg.groep,
    lijst: lijstNaam,
  };
}

// Alle woorden uit alle lijsten, platgeslagen.
const WOORDEN_UIT_FLITSDATA = Object.entries(flitsData.flitswoorden).flatMap(
  ([lijstNaam, cfg]) => (cfg.woorden ?? []).map((item) => normaliseerWoord(item, lijstNaam, cfg))
);

// Nieuwe (groep 6-)woorden uit src/data/groep6_nieuw.json — alleen de items die
// al "gecontroleerd": true hebben. Zo blijft nieuwe inhoud onzichtbaar in de
// app totdat een leerkracht (of jij) 'm heeft nagekeken; het omzetten is dan
// alleen nog een vlaggetje in die JSON, geen codewijziging.
const WOORDEN_UIT_GROEP6_NIEUW = (groep6Data.woorden ?? [])
  .filter((item) => item.gecontroleerd === true)
  .map((item) => ({
    woord: item.woord,
    categorie: CATEGORIEEN[item.categorie] ? item.categorie : FALLBACK_CATEGORIE,
    groep: 6,
    lijst: "g6_nieuw",
    ...(item.hint ? { hint: item.hint } : {}),
  }));

export const ALLE_WOORDEN = [...WOORDEN_UIT_FLITSDATA, ...WOORDEN_UIT_GROEP6_NIEUW];

// Woorden van één groep. De bronlijsten overlappen deels ("want" staat zowel bij
// de functiewoorden als bij de signaalwoorden), dus dedupliceren we hier: binnen
// één sessie wil je een woord niet twee keer tegenkomen.
export function woordenVoorGroep(groepNr) {
  const gezien = new Set();
  return ALLE_WOORDEN.filter((w) => {
    if (w.groep !== groepNr || gezien.has(w.woord)) return false;
    gezien.add(w.woord);
    return true;
  });
}

// Woorden van één spellingcategorie, over alle groepen heen. Zelfde dedup-reden
// als woordenVoorGroep: een woord kan in meerdere bronlijsten voorkomen.
export function woordenVoorCategorie(categorieSleutel) {
  const gezien = new Set();
  return ALLE_WOORDEN.filter((w) => {
    if (w.categorie !== categorieSleutel || gezien.has(w.woord)) return false;
    gezien.add(w.woord);
    return true;
  });
}

// De groepen zoals de keuzeschermen ze gebruiken.
export const GROEPEN = ALLE_GROEPEN.map((nr) => ({
  nr,
  id: `groep-${nr}`,
  label: `Groep ${nr}`,
  flitstijd: FLITSTIJD_PER_GROEP[nr] ?? STANDAARD_FLITSTIJD,
  woorden: woordenVoorGroep(nr),
}));

// Welke categorieën komen in een woordenlijst voor?
export function categorieenInLijst(woordenlijst) {
  return [...new Set(woordenlijst.map((w) => w.categorie))];
}
