// ── VOORTGANG PER SPELLINGCATEGORIE ───────────────────────────────────────────
// Houdt per spellingcategorie bij hoe goed het gaat en wanneer die categorie
// weer aan bod moet komen. Alles lokaal in localStorage, geen account, geen
// backend. Eén apparaat = één kind; net als de rest van de app.
//
// De bewaarde vorm:
//   {
//     versie: 1,
//     categorieen: {
//       "ei-ij": {
//         pogingen: 12,            // totaal aantal keren geoefend
//         fout: 3,                 // totaal aantal fouten
//         laatsteOefening: 17…,    // ms sinds epoch
//         recent: [true,false,…],  // laatste STERKTE_VENSTER pogingen, nieuwste achteraan
//         niveau: 2,               // Leitner-bak, 0 t/m NIVEAU_INTERVALLEN_UREN.length-1
//         volgendeHerhaling: 17…   // ms sinds epoch
//       }
//     },
//     logboek: [{ woord, categorie, correct, ts }]
//   }
//
// ── AANNAMES IN HET INTERVALMODEL ────────────────────────────────────────────
// Deze zijn bewust expliciet en op één plek, zodat ze te verfijnen of A/B te
// testen zijn zonder de rest van de app aan te raken.
//
// A1. We plannen herhaling per CATEGORIE, niet per woord. Aanname: fouten binnen
//     een categorie hebben dezelfde oorzaak (de spellingregel). Met ~450 woorden
//     en een paar sessies per week levert per-woord-planning veel te weinig
//     datapunten per woord op; per categorie is er na 5 pogingen al signaal.
//     Verfijning later: per woord bijhouden en de categorie als prior gebruiken.
//
// A2. Sterkte = percentage correct over de laatste STERKTE_VENSTER (5) pogingen.
//     Simpel en reactief: één fout zakt direct door. Nadeel: ruisgevoelig bij
//     weinig pogingen. Alternatief om te testen: exponentieel gewogen gemiddelde.
//
// A3. Bij goed gaat de categorie één Leitner-bak omhoog, bij fout terug naar bak
//     0 (volledige reset, zoals klassiek Leitner). Zachter alternatief dat het
//     overwegen waard is: niveau - 1 in plaats van 0, zodat een losse slip niet
//     alle opgebouwde winst wist.
//
// A4. De intervallen verdubbelen ruwweg (4 uur → 1 → 3 → 7 → 14 dagen) en zijn
//     afgetopt op 14 dagen. Aanname: een kind gebruikt de app niet dagelijks en
//     een schoolperiode is kort; langere intervallen dan twee weken geven geen
//     bruikbare herhaling meer binnen een blok.
//
// A5. Bak 0 heeft interval 0: na een fout is de categorie onmiddellijk weer
//     "rijp", zodat dezelfde regel nog in dezelfde sessie terugkomt.
//
// A6. "Rijp" is een harde drempel (nu >= volgendeHerhaling), geen geleidelijke
//     vergeetcurve. Wie het model wil verfijnen kan hier een retentiekans
//     R = exp(-t / S) invoeren en daarop wegen in plaats van op een ja/nee.
//
// A7. Een categorie waarin nog nooit geoefend is heeft géén volgendeHerhaling.
//     De woordselectie behandelt die apart (zie src/spelling/woordkeuze.js), om
//     te voorkomen dat alleen zwakke categorieën langskomen.

import { CATEGORIE_SLEUTELS, CATEGORIEEN, categorieLabel, categorieVoorbeeld } from "../data/woorden";

export const OPSLAG_KEY = "spellingbij_categorie_voortgang_v1";
export const VERSIE = 1;

// Lengte van het venster waarover de sterkte wordt berekend (zie A2).
export const STERKTE_VENSTER = 5;

// Interval per Leitner-bak, in uren (zie A4/A5).
export const NIVEAU_INTERVALLEN_UREN = [0, 4, 24, 72, 168, 336];
export const MAX_NIVEAU = NIVEAU_INTERVALLEN_UREN.length - 1;

// Het logboek is bedoeld voor terugkijken en voor "welk woord had ik recent al?".
// We kappen het af zodat localStorage niet volloopt.
export const LOGBOEK_MAX = 400;

// Drempels voor de kleuren/teksten in het voortgangsoverzicht.
export const DREMPEL_STERK = 0.8;
export const DREMPEL_GEMIDDELD = 0.5;

const UUR_MS = 60 * 60 * 1000;

function leegCategorie() {
  return {
    pogingen: 0,
    fout: 0,
    laatsteOefening: null,
    recent: [],
    niveau: 0,
    volgendeHerhaling: null,
  };
}

function leegVoortgang() {
  return { versie: VERSIE, categorieen: {}, logboek: [] };
}

// ── LEZEN / SCHRIJVEN ────────────────────────────────────────────────────────
export function leesVoortgang() {
  try {
    const ruw = JSON.parse(localStorage.getItem(OPSLAG_KEY));
    if (!ruw || typeof ruw !== "object") return leegVoortgang();
    return {
      versie: ruw.versie ?? VERSIE,
      categorieen: ruw.categorieen ?? {},
      logboek: Array.isArray(ruw.logboek) ? ruw.logboek : [],
    };
  } catch {
    // localStorage geblokkeerd of corrupte inhoud: we beginnen schoon. Oefenen
    // moet altijd blijven werken, ook zonder opslag.
    return leegVoortgang();
  }
}

export function bewaarVoortgang(voortgang) {
  try {
    localStorage.setItem(OPSLAG_KEY, JSON.stringify(voortgang));
  } catch {
    /* geen opslag beschikbaar — de sessie werkt verder, alleen zonder geheugen */
  }
  return voortgang;
}

export function resetVoortgang() {
  try {
    localStorage.removeItem(OPSLAG_KEY);
  } catch {
    /* niets te doen */
  }
  return leegVoortgang();
}

// ── REKENHULPEN (pure functies, los te testen) ───────────────────────────────

// Sterkte: aandeel goed over de laatste STERKTE_VENSTER pogingen (zie A2).
// null = nog nooit geoefend, dus "onbekend" en niet "slecht".
export function sterkte(stat) {
  if (!stat || !stat.recent || stat.recent.length === 0) return null;
  const venster = stat.recent.slice(-STERKTE_VENSTER);
  return venster.filter(Boolean).length / venster.length;
}

export function intervalMs(niveau) {
  const i = Math.max(0, Math.min(MAX_NIVEAU, niveau ?? 0));
  return NIVEAU_INTERVALLEN_UREN[i] * UUR_MS;
}

// Is het interval verstreken, dus is deze categorie toe aan herhaling?
export function isRijp(stat, nu = Date.now()) {
  if (!stat || stat.pogingen === 0) return false;        // zie A7
  if (stat.volgendeHerhaling == null) return true;
  return nu >= stat.volgendeHerhaling;
}

export function statVoor(voortgang, categorie) {
  return voortgang?.categorieen?.[categorie] ?? leegCategorie();
}

// Nieuw niveau na een poging (zie A3).
export function volgendNiveau(huidigNiveau, correct) {
  if (!correct) return 0;
  return Math.min(MAX_NIVEAU, (huidigNiveau ?? 0) + 1);
}

// ── POGING VERWERKEN ─────────────────────────────────────────────────────────
// Dit is het hart van de foutdiagnose: een fout wordt niet alleen als "fout"
// geteld, maar gekoppeld aan de categorie van het DOELwoord. Zo weet de app niet
// alleen dát het misging, maar ook welke spellingregel eronder zit.
//
// Geef een los `voortgang`-object mee om puur te rekenen (handig in tests);
// zonder dat argument wordt localStorage gelezen en geschreven.
export function registreerPoging({ woord, categorie, correct, getypt, nu = Date.now() }, voortgang) {
  const bewaren = voortgang === undefined;
  const data = voortgang ?? leesVoortgang();
  const sleutel = CATEGORIEEN[categorie] ? categorie : "onregelmatig";

  const vorig = data.categorieen[sleutel] ?? leegCategorie();
  const niveau = volgendNiveau(vorig.niveau, correct);
  const recent = [...vorig.recent, !!correct].slice(-STERKTE_VENSTER);

  data.categorieen = {
    ...data.categorieen,
    [sleutel]: {
      pogingen: vorig.pogingen + 1,
      fout: vorig.fout + (correct ? 0 : 1),
      laatsteOefening: nu,
      recent,
      niveau,
      volgendeHerhaling: nu + intervalMs(niveau),
    },
  };

  data.logboek = [
    ...data.logboek,
    { woord, categorie: sleutel, correct: !!correct, ts: nu, ...(getypt != null ? { getypt } : {}) },
  ].slice(-LOGBOEK_MAX);

  return bewaren ? bewaarVoortgang(data) : data;
}

// ── OVERZICHT ───────────────────────────────────────────────────────────────
// Eén regel per categorie, klaar voor weergave. "nieuw" is expliciet geen
// slechte score: er is simpelweg nog niet geoefend.
export function categorieStatus(voortgang, nu = Date.now()) {
  return CATEGORIE_SLEUTELS.map((sleutel) => {
    const stat = statVoor(voortgang, sleutel);
    const s = sterkte(stat);
    let stand;
    if (s == null) stand = "nieuw";
    else if (s >= DREMPEL_STERK) stand = "sterk";
    else if (s >= DREMPEL_GEMIDDELD) stand = "gemiddeld";
    else stand = "oefenen";
    return {
      sleutel,
      label: categorieLabel(sleutel),
      voorbeeld: categorieVoorbeeld(sleutel),
      pogingen: stat.pogingen,
      fout: stat.fout,
      goed: stat.pogingen - stat.fout,
      sterkte: s,
      niveau: stat.niveau,
      stand,
      rijp: isRijp(stat, nu),
      laatsteOefening: stat.laatsteOefening,
      volgendeHerhaling: stat.volgendeHerhaling,
    };
  });
}

// ── FOUTDIAGNOSE OP LETTERNIVEAU ────────────────────────────────────────────
// Positie van de eerste afwijking tussen doelwoord en wat het kind typte, zodat
// het feedbackscherm precies dát stukje kan uitlichten. -1 = geen verschil.
export function eersteVerschil(doel = "", getypt = "") {
  const a = doel.toLowerCase();
  const b = getypt.trim().toLowerCase();
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}
