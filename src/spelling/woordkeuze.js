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

// ── GERICHT OEFENEN OP ÉÉN CATEGORIE ─────────────────────────────────────────
// Voor CategorieOefenen.js: een kind kiest zelf één spellingregel en oefent
// alleen daarbinnen. categorieGewicht/kiesVolgendWoord werken op CATEGORIE-
// niveau (zie A1 in voortgang.js) — met maar één categorie in de pool heeft die
// weging niets om tussen te kiezen. Daarom hier een apart, woord-niveau sortering.
//
// AANNAMES
// C1. Dit kijkt per WOORD naar de laatste poging in het logboek, niet naar het
//     categorie-brede sterktemodel. Voor een sessie die bewust op één categorie
//     focust is dat nauwkeuriger: zo komt precies het woord terug dat nog niet
//     lukte, niet een willekeurig ander woord uit dezelfde categorie.
// C2. Woorden zonder voorgeschiedenis ("nieuw") komen vóór woorden die al eens
//     goed gingen, maar NA woorden die nog fout staan. Zo blijft de sessie niet
//     hangen in steeds dezelfde kleine foutenset terwijl de rest van de
//     categorie nooit aan bod komt, én krijgt een nog onbeoefend woord
//     voorrang boven een woord dat al beheerst wordt.
// C3. Het logboek bewaart maar de laatste LOGBOEK_MAX pogingen (voortgang.js).
//     Bij een zeer actieve speler kan een oud woord daardoor als "nieuw"
//     verschijnen. Geaccepteerd: liever dat dan een onbegrensd logboek.
export function kiesCategorieSessie(voortgangsData, woordenInCategorie, aantal, opties = {}) {
  return kiesOpGeschiedenis(woordenInCategorie, voortgangsData, aantal, {
    ...opties,
    sleutelVan: (w) => w.woord,
  });
}

// Zelfde algoritme als kiesCategorieSessie (C1/C2/C3), maar voor items die
// niet per se een "woord"-veld hebben — nu gebruikt door kiesCategorieSessie
// zelf (sleutelVan = woord) en door kiesWerkwoordSessie hieronder
// (sleutelVan = juisteVorm, want een werkwoordzin heeft geen los woord).
function kiesOpGeschiedenis(items, voortgangsData, aantal, opties = {}) {
  const { random = Math.random, sleutelVan = (x) => x.woord } = opties;
  if (!items || items.length === 0) return [];

  const laatstePoging = new Map();
  for (const regel of voortgangsData?.logboek ?? []) {
    const vorige = laatstePoging.get(regel.woord);
    if (!vorige || regel.ts > vorige.ts) laatstePoging.set(regel.woord, regel);
  }

  const nogNietGoed = [];
  const nieuw = [];
  const overig = [];
  for (const item of items) {
    const poging = laatstePoging.get(sleutelVan(item));
    if (!poging) nieuw.push(item);
    else if (!poging.correct) nogNietGoed.push({ item, ts: poging.ts });
    else overig.push({ item, ts: poging.ts });
  }
  // Langst geleden fout resp. langst geleden goed: eerst, net als B4 bij kiesVolgendWoord.
  nogNietGoed.sort((a, b) => a.ts - b.ts);
  overig.sort((a, b) => a.ts - b.ts);

  const volgorde = [...nogNietGoed.map((x) => x.item), ...schudWoorden(nieuw, random), ...overig.map((x) => x.item)];
  return volgorde.slice(0, Math.min(aantal, volgorde.length));
}

// Dezelfde prioritering (fout > nieuw > langst geleden goed) maar dan voor
// zinnen uit src/data/werkwoorden.js. Een zin heeft geen eigen "woord", dus de
// geschiedenis wordt opgezocht via "juisteVorm" (zie ook de toelichting bij
// registreerPoging-aanroepen voor werkwoordzinnen: woord = juisteVorm).
export function kiesWerkwoordSessie(voortgangsData, zinnen, aantal, opties = {}) {
  return kiesOpGeschiedenis(zinnen, voortgangsData, aantal, {
    ...opties,
    sleutelVan: (z) => z.juisteVorm,
  });
}

function schudWoorden(woorden, random) {
  const a = [...woorden];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── "ZELF DOEN": EEN RONDE SAMENSTELLEN OVER MEERDERE GEOEFENDE CATEGORIEËN ──
// Voor ZelfDoen.js: een ronde van (ongeveer) 20 items, samengesteld uit alle
// categorieën die het kind al heeft geoefend. Grotendeels woorden die het al
// eens gezien heeft in de leerfase, met een klein aandeel nieuwe woorden uit
// diezelfde categorieën — dat laatste is een eenvoudige transfer-check: lukt
// de regel ook bij een woord dat nooit geflitst is?
//
// AANNAMES
// D1. "Geoefend" = de categorie heeft minstens 1 poging in het voortgangs-
//     model, ongeacht hoe sterk die inmiddels is. De ronde moet laten zien wat
//     er geleerd is, niet alleen wat al perfect beheerst wordt.
// D2. Van de 20 items is een vast aandeel nieuw (NIEUW_AANDEEL, nu 25% = 5 van
//     20); de rest komt uit al eens gezien woorden. Is er van één van beide te
//     weinig, dan vult de andere pool het tekort op — de ronde komt zo altijd
//     zo dicht mogelijk bij `aantal` zonder te crashen op een kleine categorie.
// D3. "Gezien" wordt bepaald over het hele logboek, niet per categorie: een
//     item dat ooit is voorgekomen telt als gezien. Dat kan in theorie een
//     item meenemen dat in een andere sessievorm is geoefend, maar in de
//     praktijk is dat precies wat je wilt weten: heeft het kind dit al eens
//     gezien, ja of nee. Bij een werkwoordzin is er geen los "woord" — de
//     sleutel is dan de juiste vorm (zie item.sleutel, gezet door de
//     aanroeper; zonder dat veld valt dit terug op item.woord).
// D4. De einduitkomst wordt geschud (niet "eerst de bekende, dan de nieuwe"),
//     zodat een item niet aanvoelt als makkelijk-of-moeilijk aan de volgorde.
//     Dit mixt ook woord- en zin-items door elkaar als beide voorkomen.
export const ZELFDOEN_NIEUW_AANDEEL = 0.25;

// `alleItems` mag een mix zijn van gewone woorden en werkwoordzinnen (zie
// ZelfDoen.js, dat beide samenvoegt). Elk item heeft een `categorie`, en voor
// de "gezien"-check (D3) een `sleutel` — bij een gewoon woord is dat het woord
// zelf; die wordt hier gebruikt als er geen expliciet `sleutel`-veld is
// meegegeven, zodat bestaand gebruik met kale woordobjecten blijft werken.
export function kiesZelfDoenRonde(voortgangsData, alleItems, opties = {}) {
  const { aantal = 20, random = Math.random } = opties;
  const sleutelVan = (item) => item.sleutel ?? item.woord;

  const geoefendeCategorieen = CATEGORIE_SLEUTELS_MET_POGINGEN(voortgangsData);
  if (geoefendeCategorieen.size === 0) return [];

  // Een item is "gezien" als zijn sleutel ooit in het logboek voorkwam (D3).
  const gezienSleutels = new Set((voortgangsData?.logboek ?? []).map((r) => r.woord));

  const gezienPool = [];
  const nieuwPool = [];
  for (const item of alleItems) {
    if (!geoefendeCategorieen.has(item.categorie)) continue;
    (gezienSleutels.has(sleutelVan(item)) ? gezienPool : nieuwPool).push(item);
  }

  const aantalNieuwGewenst = Math.round(aantal * ZELFDOEN_NIEUW_AANDEEL);
  const aantalGezienGewenst = aantal - aantalNieuwGewenst;

  const nieuwGeschud = schudWoorden(nieuwPool, random);
  const gezienGeschud = schudWoorden(gezienPool, random);

  let nieuwGekozen = nieuwGeschud.slice(0, aantalNieuwGewenst);
  let gezienGekozen = gezienGeschud.slice(0, aantalGezienGewenst);

  // Tekort in één pool? Vul aan vanuit de rest van de andere pool (D2).
  const tekortNieuw = aantalNieuwGewenst - nieuwGekozen.length;
  if (tekortNieuw > 0) gezienGekozen = gezienGeschud.slice(0, aantalGezienGewenst + tekortNieuw);
  const tekortGezien = aantalGezienGewenst - gezienGekozen.length;
  if (tekortGezien > 0) nieuwGekozen = nieuwGeschud.slice(0, aantalNieuwGewenst + tekortGezien);

  const ronde = [...gezienGekozen, ...nieuwGekozen];
  return schudWoorden(ronde, random).slice(0, aantal); // D4
}

function CATEGORIE_SLEUTELS_MET_POGINGEN(voortgangsData) {
  const sleutels = new Set();
  for (const [sleutel, stat] of Object.entries(voortgangsData?.categorieen ?? {})) {
    if (stat?.pogingen > 0) sleutels.add(sleutel);
  }
  return sleutels;
}
