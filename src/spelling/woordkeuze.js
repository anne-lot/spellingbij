// ── WOORDSELECTIE OP BASIS VAN VOORTGANG ──────────────────────────────────────
// Losse, herbruikbare keuzelogica: geef voortgangsdata + een woordenlijst en je
// krijgt het volgende woord dat het meest zinvol is om te oefenen.
//
//   import { kiesVolgendWoord, kiesSessie } from "./spelling/woordkeuze";
//   const woord = kiesVolgendWoord(leesVoortgang(), woordenVoorGroep(4));
//
// Een woord ziet uit als { woord, categorie, groep, lijst } (zie src/data/woorden.js).
//
// ── HOE DE WEGING WERKT ──────────────────────────────────────────────────────
// Per categorie wordt een gewicht bepaald; daarna wordt er gewogen-willekeurig
// een categorie gekozen en binnen die categorie een woord dat recent nog niet
// voorbij kwam. Gewogen willekeur in plaats van "altijd de zwakste": zo blijft
// een sessie afwisselend en voorspelt het kind niet wat er komt.
//
//   nog niet geoefend        -> GEWICHT_NIEUW          (3,0)
//   rijp (interval verstreken) -> GEWICHT_RIJP  × zwakte-factor  (2,5 … 5,0)
//   nog niet rijp            -> GEWICHT_NIET_RIJP × zwakte-factor (0,5 … 1,0)
//
// De zwakte-factor is (2 - sterkte): een categorie met sterkte 0 weegt twee keer
// zo zwaar als dezelfde categorie met sterkte 1.
//
// ── AANNAMES (bedoeld om te verfijnen / A/B te testen) ───────────────────────
// B1. Onbeoefende categorieën krijgen een vast, stevig gewicht (3,0) zodat ze
//     regelmatig langskomen en niet pas nadat alles anders sterk is. Ze wegen
//     bewust iets zwaarder dan een rijpe sterke categorie (2,5), maar lichter
//     dan een rijpe zwakke (5,0).
// B2. Niet-rijpe categorieën worden niet uitgesloten maar alleen zwaar gedempt
//     (0,5). Volledig uitsluiten zou een sessie onmogelijk maken zodra alles net
//     geoefend is, en een beetje herhaling binnen het interval schaadt niet.
// B3. Binnen een sessie mag één categorie maximaal MAX_AANDEEL (40%) van de
//     woorden vullen. Zonder die rem kan een sessie volledig uit één regel
//     bestaan; dat is efficiënt maar demotiverend.
// B4. Binnen een categorie krijgen woorden die het langst niet voorbij kwamen
//     voorrang (oudste derde van de lijst, daarbinnen willekeurig). Het logboek
//     uit de voortgangsdata levert die "laatst gezien"-tijden.

import { sterkte as berekenSterkte, isRijp, statVoor } from "./voortgang";

export const GEWICHT_NIEUW = 3.0;
export const GEWICHT_RIJP = 2.5;
export const GEWICHT_NIET_RIJP = 0.5;
export const MAX_AANDEEL = 0.4;

// Gewicht van één categorie. Geëxporteerd zodat je de weging kunt inspecteren
// of in een test kunt vastpinnen.
export function categorieGewicht(voortgang, categorie, nu = Date.now()) {
  const stat = statVoor(voortgang, categorie);
  if (!stat.pogingen) return GEWICHT_NIEUW;                       // B1
  const s = berekenSterkte(stat) ?? 0;
  const zwakte = 2 - s;                                           // 1,0 … 2,0
  const basis = isRijp(stat, nu) ? GEWICHT_RIJP : GEWICHT_NIET_RIJP; // B2
  return basis * zwakte;
}

// Alle gewichten in één keer, aflopend gesorteerd — handig om te zien waarom de
// app kiest wat hij kiest.
export function categorieGewichten(voortgang, woordenlijst, nu = Date.now()) {
  const categorieen = [...new Set(woordenlijst.map((w) => w.categorie))];
  return categorieen
    .map((categorie) => ({ categorie, gewicht: categorieGewicht(voortgang, categorie, nu) }))
    .sort((a, b) => b.gewicht - a.gewicht);
}

// Wanneer is elk woord voor het laatst voorbij gekomen? (0 = nog nooit)
function laatstGezien(voortgang) {
  const kaart = new Map();
  for (const regel of voortgang?.logboek ?? []) {
    const vorige = kaart.get(regel.woord) ?? 0;
    if (regel.ts > vorige) kaart.set(regel.woord, regel.ts);
  }
  return kaart;
}

function kiesGewogen(items, gewichtVan, random) {
  const totaal = items.reduce((s, it) => s + gewichtVan(it), 0);
  if (totaal <= 0) return items[Math.floor(random() * items.length)] ?? null;
  let trekking = random() * totaal;
  for (const it of items) {
    trekking -= gewichtVan(it);
    if (trekking <= 0) return it;
  }
  return items[items.length - 1];
}

/**
 * Kies het volgende te oefenen woord.
 *
 * @param voortgangsData  resultaat van leesVoortgang()
 * @param woordenlijst    array van { woord, categorie, ... }
 * @param opties.nu       tijdstip in ms (default Date.now()), handig in tests
 * @param opties.vermijd  woorden (strings) die je niet nog eens wilt — bv. de
 *                        woorden die al in deze sessie zitten
 * @param opties.random   vervangbare randomfunctie (default Math.random) zodat
 *                        de keuze in tests deterministisch te maken is
 * @param opties.gewichten  optioneel: { [categorie]: gewicht } om de weging te
 *                        overrulen (gebruikt door kiesSessie voor het aandeel-cap)
 * @returns het gekozen woordobject, of null bij een lege lijst
 */
export function kiesVolgendWoord(voortgangsData, woordenlijst, opties = {}) {
  const { nu = Date.now(), vermijd = [], random = Math.random, gewichten } = opties;
  if (!woordenlijst || woordenlijst.length === 0) return null;

  const teVermijden = vermijd instanceof Set ? vermijd : new Set(vermijd);
  // Woorden die nog niet in deze sessie zitten; is alles al gebruikt, dan mag
  // alles weer mee (liever een herhaling dan geen woord).
  const beschikbaar = woordenlijst.filter((w) => !teVermijden.has(w.woord));
  const pool = beschikbaar.length > 0 ? beschikbaar : woordenlijst;

  const perCategorie = new Map();
  for (const w of pool) {
    if (!perCategorie.has(w.categorie)) perCategorie.set(w.categorie, []);
    perCategorie.get(w.categorie).push(w);
  }

  const categorieen = [...perCategorie.keys()];
  const gewichtVan = (c) =>
    gewichten && c in gewichten ? gewichten[c] : categorieGewicht(voortgangsData, c, nu);

  // Als het aandeel-cap alle categorieën op 0 heeft gezet, laat het cap vallen.
  const bruikbaar = categorieen.filter((c) => gewichtVan(c) > 0);
  const kandidaatCategorieen = bruikbaar.length > 0 ? bruikbaar : categorieen;

  const categorie = kiesGewogen(kandidaatCategorieen, gewichtVan, random);
  const woorden = perCategorie.get(categorie);

  // Binnen de categorie: de woorden die het langst niet voorbij kwamen (B4).
  const gezien = laatstGezien(voortgangsData);
  const gesorteerd = [...woorden].sort(
    (a, b) => (gezien.get(a.woord) ?? 0) - (gezien.get(b.woord) ?? 0)
  );
  // Oudste derde, maar altijd minstens twee kandidaten zodat er iets te kiezen
  // valt, en nooit meer dan de categorie groot is.
  const venster = Math.min(gesorteerd.length, Math.max(2, Math.ceil(gesorteerd.length / 3)));
  const oudste = gesorteerd.slice(0, venster);
  return oudste[Math.floor(random() * oudste.length)] ?? gesorteerd[0];
}

/**
 * Stel een hele sessie samen met kiesVolgendWoord. Geen woord komt twee keer
 * voor en geen categorie vult meer dan MAX_AANDEEL van de sessie (B3).
 *
 * @param aantal  gewenst aantal woorden; wordt afgetopt op de lijstlengte
 */
export function kiesSessie(voortgangsData, woordenlijst, aantal, opties = {}) {
  const { nu = Date.now(), random = Math.random, maxAandeel = MAX_AANDEEL } = opties;
  if (!woordenlijst || woordenlijst.length === 0) return [];

  const doel = Math.min(aantal, woordenlijst.length);
  const maxPerCategorie = Math.max(1, Math.ceil(doel * maxAandeel));

  const sessie = [];
  const gebruikt = new Set();
  const perCategorieTeller = {};

  while (sessie.length < doel) {
    // Categorieën die hun plafond raakten tijdelijk op 0 zetten.
    const gewichten = {};
    for (const [categorie, n] of Object.entries(perCategorieTeller))
      if (n >= maxPerCategorie) gewichten[categorie] = 0;

    const woord = kiesVolgendWoord(voortgangsData, woordenlijst, {
      nu, random, vermijd: gebruikt, gewichten,
    });
    if (!woord || gebruikt.has(woord.woord)) break;  // niets meer te kiezen

    sessie.push(woord);
    gebruikt.add(woord.woord);
    perCategorieTeller[woord.categorie] = (perCategorieTeller[woord.categorie] ?? 0) + 1;
  }
  return sessie;
}
