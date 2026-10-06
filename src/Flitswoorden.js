import { useState, useCallback } from "react";
import { C, Header, Footer } from "./theme";
import { GROEPEN, SESSIE_LENGTE } from "./data/woorden";
import { leesVoortgang } from "./spelling/voortgang";
import { kiesSessie } from "./spelling/woordkeuze";
import OefenSessie, { terugKnop } from "./OefenSessie";

// ── FLITSWOORDEN ──────────────────────────────────────────────────────────────
// Gebaseerd op de onderwijsmethode "Flitswoorden": een woord wordt kort getoond,
// verdwijnt, en het kind typt het over uit het geheugen. De flits/invoer/
// feedback/klaar-flow zelf zit in OefenSessie.js (gedeeld met CategorieOefenen).
// Dit bestand regelt alleen: welke groep, welke woorden daarbinnen, en de
// losse score-badge per groep.
//
// De woorden zelf staan in src/data/flitswoorden.json en worden ingelezen door
// src/data/woorden.js:
//   - standaardFlitstijd  : seconden dat een woord getoond wordt (fallback)
//   - sessieLengte         : aantal woorden per sessie
//   - flitstijdPerGroep    : flitstijd per groep (3 t/m 8)
//   - flitswoorden.<naam>  : per lijstje een "groep" (3 t/m 8) + "woorden", met
//                            per woord een spellingcategorie. Nieuwe woorden of
//                            een nieuw lijstje toevoegen kan daar zonder code.
//
// Welke woorden een sessie haalt, bepaalt niet de willekeur maar de voortgang
// per spellingcategorie: zie src/spelling/woordkeuze.js. Elke poging wordt
// bovendien per categorie geregistreerd (src/spelling/voortgang.js), zodat de
// app weet wélke spellingregel nog aandacht nodig heeft.
// ─────────────────────────────────────────────────────────────────────────────

// Scores per groep (los van de categorie-voortgang: dit is de "laatst gehaald"-badge).
const OPSLAG_KEY = "spellingbij_flitswoorden_v1";

// ── LOKALE OPSLAG: SCORE PER GROEP ───────────────────────────────────────────
function leesGroepVoortgang() {
  try {
    return JSON.parse(localStorage.getItem(OPSLAG_KEY)) || {};
  } catch {
    return {};
  }
}

function bewaarSessie(groepId, goed, totaal) {
  try {
    const alles = leesGroepVoortgang();
    const vorig = alles[groepId] || {
      sessies: 0, besteScore: 0, laatsteScore: 0, laatsteTotaal: 0,
      totaalGoed: 0, totaalWoorden: 0,
    };
    alles[groepId] = {
      sessies: vorig.sessies + 1,
      besteScore: Math.max(vorig.besteScore, goed),
      laatsteScore: goed,
      laatsteTotaal: totaal,
      totaalGoed: vorig.totaalGoed + goed,
      totaalWoorden: vorig.totaalWoorden + totaal,
    };
    localStorage.setItem(OPSLAG_KEY, JSON.stringify(alles));
  } catch {
    /* localStorage niet beschikbaar — geen probleem, we slaan gewoon niks op */
  }
}

// ── HOOFDCOMPONENT ────────────────────────────────────────────────────────────
export default function Flitswoorden({ font, dyslexie, setDyslexie, onExit, onVoortgang }) {
  const [stap, setStap] = useState("keuze"); // keuze | sessie
  const [groep, setGroep] = useState(null);
  const [woorden, setWoorden] = useState([]);
  const [sessieNummer, setSessieNummer] = useState(0);

  // Niet willekeurig: de woorden komen uit de categorieën die volgens het
  // herhalingsmodel aan bod zijn (rijpe en zwakke categorieën eerst, met
  // ruimte voor categorieën waarin nog niet geoefend is).
  const nieuweSessie = useCallback((g) => {
    setGroep(g);
    setWoorden(kiesSessie(leesVoortgang(), g.woorden, SESSIE_LENGTE));
    setSessieNummer((n) => n + 1);
    setStap("sessie");
  }, []);

  const fs = dyslexie ? 18 : 16;

  // ── SESSIE ──
  if (stap === "sessie" && groep) {
    return (
      <OefenSessie
        key={sessieNummer}
        font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
        titel={`Flitswoorden · ${groep.label}`}
        woorden={woorden}
        basisFlitstijd={groep.flitstijd}
        onKlaar={(resultaten) =>
          bewaarSessie(groep.id, resultaten.filter((r) => r.goed).length, resultaten.length)
        }
        opnieuwLabel={`Nog een keer (${groep.label})`}
        onOpnieuw={() => nieuweSessie(groep)}
        andereLabel="Andere groep"
        onAndere={() => setStap("keuze")}
        onVoortgang={onVoortgang}
        onExit={onExit}
      />
    );
  }

  // ── KEUZESCHERM ──
  const groepVoortgang = leesGroepVoortgang();
  return (
    <div style={{ minHeight: "100vh", background: C.creme, fontFamily: font }}>
      <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
        <button onClick={onExit} style={terugKnop(font)}>← Terug naar menu</button>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 4 }}>⚡</div>
          <h1 style={{ fontFamily: font, fontWeight: 800, fontSize: 28, color: C.zwart, margin: "8px 0" }}>
            Flitswoorden
          </h1>
          <p style={{ fontFamily: font, color: C.grijs, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Je ziet een woord heel even. Daarna verdwijnt het en typ je het uit je hoofd.
          </p>
        </div>

        <p style={{ fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: 14, marginBottom: 10 }}>
          Kies je groep
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GROEPEN.map((g) => {
            const v = groepVoortgang[g.id];
            const leeg = g.woorden.length === 0;
            return (
              <button key={g.id} onClick={() => !leeg && nieuweSessie(g)} disabled={leeg} style={{
                background: C.wit, border: `1.5px solid ${C.rand}`, borderRadius: 14,
                padding: "14px 16px", textAlign: "left", cursor: leeg ? "default" : "pointer",
                fontFamily: font, display: "flex", justifyContent: "space-between",
                alignItems: "center", gap: 12, opacity: leeg ? 0.55 : 1,
              }}>
                <span>
                  <span style={{ fontWeight: 800, fontSize: fs, color: C.zwart, display: "block" }}>
                    {g.label}
                  </span>
                  <span style={{ fontSize: 12, color: C.grijs }}>
                    {leeg
                      ? "binnenkort"
                      : `${g.woorden.length} woorden · ${g.flitstijd} sec per woord`}
                  </span>
                </span>
                {!leeg && v && (
                  <span style={{
                    background: C.geelLicht, border: `1px solid ${C.geel}`, borderRadius: 99,
                    padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#92400E",
                    whiteSpace: "nowrap",
                  }}>
                    laatst {v.laatsteScore}/{v.laatsteTotaal}
                  </span>
                )}
                {leeg && (
                  <span style={{
                    background: C.cremeMid, border: `1px solid ${C.rand}`, borderRadius: 99,
                    padding: "2px 10px", fontSize: 11, fontWeight: 700, color: C.grijs,
                    whiteSpace: "nowrap",
                  }}>
                    binnenkort
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <Footer font={font} />
    </div>
  );
}
