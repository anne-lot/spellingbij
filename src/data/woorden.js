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
export const ALLE_WOORDEN = Object.entries(flitsData.flitswoorden).flatMap(
  ([lijstNaam, cfg]) => (cfg.woorden ?? []).map((item) => normaliseerWoord(item, lijstNaam, cfg))
);

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
