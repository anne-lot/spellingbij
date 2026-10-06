import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { C, Header, Footer, Kaart } from "./theme";
import { ALLE_WOORDEN, STANDAARD_FLITSTIJD, categorieLabel } from "./data/woorden";
import { ALLE_WERKWOORDZINNEN, splitsZin } from "./data/werkwoorden";
import { ITEMVORM, ITEMVORMEN } from "./data/zelfDoenConfig";
import { leesVoortgang, registreerPoging, categorieStatus } from "./spelling/voortgang";
import { kiesZelfDoenRonde } from "./spelling/woordkeuze";
import { leesGeschiedenis, bewaarResultaat } from "./spelling/zelfDoenGeschiedenis";
import { primaireKnop, lichteKnop, terugKnop } from "./OefenSessie";
import { STANDEN } from "./Voortgangsoverzicht";
import Honingraat from "./Honingraat";

// ── ZELF DOEN ─────────────────────────────────────────────────────────────────
// Het kind laat zelfstandig zien wat het heeft geleerd: een ronde van (tot) 20
// items uit categorieën die al geoefend zijn in de leerfase (Flitswoorden /
// CategorieOefenen), zonder feedback, hints of een tweede poging. De leerfase
// zelf verandert hier niets aan — dit is alleen een momentopname.
//
// Woordselectie: kiesZelfDoenRonde (src/spelling/woordkeuze.js) mixt woorden
// die het kind al eens zag met een klein aandeel nieuwe woorden uit dezelfde
// categorieën (transfer-check). Resultaten gaan via registreerPoging in het
// bestaande categorie-voortgangsmodel, dus een gemiste poging komt vanzelf
// terug in de gespreide herhaling.
//
// Itemvorm is configureerbaar (src/data/zelfDoenConfig.js); nu is alleen
// "dicteewoord" gebouwd. "Dicteren" zonder audio: het woord verschijnt kort en
// verdwijnt — zelfde vervangingsmechanisme als in de leerfase, maar zonder
// zichtbare afteltimer, om geen tijdsdruk te suggereren tijdens het typen.
// ─────────────────────────────────────────────────────────────────────────────

const AANTAL_ITEMS = 20;
const TOON_DUUR_MS = STANDAARD_FLITSTIJD * 1000;

function normaliseer(tekst) {
  return tekst.trim().toLowerCase();
}

// Eén ronde mag woorden én werkwoordzinnen bevatten (zie kiesZelfDoenRonde,
// dat op "categorie" en "sleutel" werkt in plaats van op "woord" alleen).
// Een woord krijgt zichzelf als sleutel, een zin de vorm die getypt moet
// worden — er is immers geen los "woord" bij een zin-met-gat-item.
// Eenmalig berekend op moduleniveau: deze bronlijsten veranderen niet tijdens
// het draaien van de app.
const ALLE_ZELFDOEN_ITEMS = [
  ...ALLE_WOORDEN.map((w) => ({ ...w, sleutel: w.woord })),
  ...ALLE_WERKWOORDZINNEN.map((z) => ({ ...z, sleutel: z.juisteVorm })),
];

// Het juiste antwoord van een item, ongeacht of het een los woord is of een
// werkwoordzin (dan is de zin zelf de vraag, en juisteVorm het antwoord).
function juistAntwoord(item) {
  return item.zin ? item.juisteVorm : item.woord;
}

export default function ZelfDoen({ font, dyslexie, setDyslexie, onExit, onVoortgang }) {
  const [stap, setStap] = useState("intro"); // intro | toon | typen | klaar
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [invoer, setInvoer] = useState("");
  const [antwoorden, setAntwoorden] = useState([]); // { woord, categorie, getypt, goed }
  const [ronde, setRonde] = useState(0); // forceert een schone staat bij "nog een keer"

  const invoerRef = useRef(null);
  const pageStyle = { minHeight: "100vh", background: C.creme, fontFamily: font };

  const huidigItem = items[index];

  // Een werkwoordzin heeft geen "flits"-fase nodig: de zin met het gat IS de
  // vraag, er is niets om eerst te laten zien en weer te verbergen.
  const stapVoorItem = (item) => (item?.zin ? "typen" : "toon");

  const begin = useCallback(() => {
    const gekozen = kiesZelfDoenRonde(leesVoortgang(), ALLE_ZELFDOEN_ITEMS, { aantal: AANTAL_ITEMS });
    setItems(gekozen);
    setIndex(0);
    setInvoer("");
    setAntwoorden([]);
    setRonde((n) => n + 1);
    setStap(gekozen.length > 0 ? stapVoorItem(gekozen[0]) : "intro");
  }, []);

  // ── Woord kort tonen, dan verdwijnen (geen zichtbare afteltimer: geen
  //    tijdsdruk tijdens het typen zelf, alleen een vaste, rustige kijktijd).
  //    Geldt alleen voor losse woorden — een zin start al meteen op "typen". ──
  useEffect(() => {
    if (stap !== "toon" || !huidigItem) return;
    const t = setTimeout(() => setStap("typen"), TOON_DUUR_MS);
    return () => clearTimeout(t);
  }, [stap, index, huidigItem]);

  useEffect(() => {
    if (stap === "typen" && invoerRef.current) invoerRef.current.focus();
  }, [stap, index]);

  function bevestig() {
    if (!invoer.trim()) return;
    const getypt = invoer.trim();
    const juist = juistAntwoord(huidigItem);
    const goed = normaliseer(getypt) === normaliseer(juist);

    // Geen feedback hierover op het scherm — alleen stil wegschrijven. De
    // honingraat krijgt zometeen wel een neutrale "beantwoord"-vulling.
    registreerPoging({ woord: juist, categorie: huidigItem.categorie, correct: goed, getypt });
    const nieuweAntwoorden = [...antwoorden, { woord: juist, categorie: huidigItem.categorie, getypt, goed }];
    setAntwoorden(nieuweAntwoorden);
    setInvoer("");

    if (index + 1 >= items.length) {
      bewaarResultaat({
        ts: Date.now(),
        totaal: nieuweAntwoorden.length,
        goed: nieuweAntwoorden.filter((a) => a.goed).length,
        categorieen: [...new Set(nieuweAntwoorden.map((a) => a.categorie))],
      });
      setStap("klaar");
    } else {
      setIndex((i) => i + 1);
      setStap(stapVoorItem(items[index + 1]));
    }
  }

  // ── INTRO ──
  if (stap === "intro") {
    const geoefend = categorieStatus(leesVoortgang()).some((r) => r.pogingen > 0);
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>
          <button onClick={onExit} style={terugKnop(font)}>← Terug naar menu</button>
          <Kaart style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🍯</div>
            <h1 style={{ fontFamily: font, fontWeight: 800, fontSize: 26, color: C.zwart, margin: "0 0 10px" }}>
              Zelf doen
            </h1>
            {geoefend ? (
              <>
                <p style={{ fontFamily: font, color: C.grijs, fontSize: 15, lineHeight: 1.7, margin: "0 0 20px" }}>
                  Laat zelf zien wat je al kan! Je krijgt {AANTAL_ITEMS} woorden uit de categorieën
                  die je al oefende. Geen hulp, geen herkansing — gewoon doen wat je kan.
                  Elke cel in de honingraat hierboven staat voor één woord.
                </p>
                <button onClick={begin} style={{ ...primaireKnop(font), width: "100%" }}>
                  Beginnen 🍯
                </button>
              </>
            ) : (
              <p style={{ fontFamily: font, color: C.grijs, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                Oefen eerst een paar woorden — bijvoorbeeld bij Flitswoorden of "Oefen één
                categorie" — dan kun je hier straks laten zien wat je hebt geleerd.
              </p>
            )}
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── TOON / TYPEN ──
  if (stap === "toon" || stap === "typen") {
    const antwoordenMetGaten = Array.from({ length: items.length }, (_, i) => {
      const a = antwoorden[i];
      return a ? a.goed : null;
    });
    return (
      <div style={pageStyle} key={ronde}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ marginBottom: 20 }}>
            <Honingraat aantal={items.length} antwoorden={antwoordenMetGaten} huidigIndex={index} fase="maken" />
          </div>
          <Kaart style={{ textAlign: "center", padding: "40px 24px" }}>
            {stap === "toon" ? (
              <>
                <p style={{ fontFamily: font, color: C.grijs, fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 24 }}>
                  Kijk goed…
                </p>
                <div style={{
                  fontFamily: font, fontWeight: 800, color: C.zwart,
                  fontSize: dyslexie ? 40 : 52, letterSpacing: 1, lineHeight: 1.2,
                  wordBreak: "break-word",
                }}>
                  {huidigItem.woord}
                </div>
              </>
            ) : (
              <>
                {huidigItem.zin ? (
                  <>
                    <p style={{ fontFamily: font, color: C.grijs, fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>
                      Welk woord hoort in het gat?
                    </p>
                    <p style={{
                      fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: dyslexie ? 20 : 18,
                      lineHeight: 1.6, margin: "0 0 20px",
                    }}>
                      {splitsZin(huidigItem.zin)[0]}
                      <span style={{
                        display: "inline-block", minWidth: 54, borderBottom: `3px dashed ${C.geel}`, margin: "0 4px",
                      }}>&nbsp;</span>
                      {splitsZin(huidigItem.zin)[1]}
                    </p>
                  </>
                ) : (
                  <p style={{ fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: dyslexie ? 19 : 17, marginTop: 0, marginBottom: 20 }}>
                    Typ het woord over.
                  </p>
                )}
                <form onSubmit={(e) => { e.preventDefault(); bevestig(); }}>
                  <input
                    ref={invoerRef}
                    value={invoer}
                    onChange={(e) => setInvoer(e.target.value)}
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                    style={{
                      width: "100%", boxSizing: "border-box", textAlign: "center",
                      fontFamily: font, fontWeight: 800, fontSize: dyslexie ? 24 : 28,
                      color: C.zwart, padding: "14px 16px", borderRadius: 14,
                      border: `2px solid ${C.rand}`, outline: "none", background: C.cremeMid,
                    }}
                  />
                  <button type="submit" disabled={!invoer.trim()} style={{
                    ...primaireKnop(font), marginTop: 18, width: "100%",
                    opacity: invoer.trim() ? 1 : 0.4, cursor: invoer.trim() ? "pointer" : "default",
                  }}>
                    Volgende →
                  </button>
                </form>
              </>
            )}
          </Kaart>
          <p style={{ fontFamily: font, fontSize: 12, color: C.grijs, textAlign: "center" }}>
            {index + 1} van {items.length}
          </p>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── KLAAR: resultaat ──
  if (stap === "klaar") {
    return <ZelfDoenResultaat
      font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
      antwoorden={antwoorden} onOpnieuw={begin} onExit={onExit} onVoortgang={onVoortgang}
    />;
  }

  return null;
}

// ── RESULTAATSCHERM ───────────────────────────────────────────────────────────
function ZelfDoenResultaat({ font, dyslexie, setDyslexie, antwoorden, onOpnieuw, onExit, onVoortgang }) {
  const goedAantal = antwoorden.filter((a) => a.goed).length;
  const totaal = antwoorden.length;
  const fout = antwoorden.filter((a) => !a.goed);
  const antwoordenGoed = antwoorden.map((a) => a.goed);

  // Per-categorie stand, maar alleen voor de categorieën uit déze ronde —
  // reuse van hetzelfde model/kleuren als het overzicht en het categorie-kiezen.
  const categorieenInRonde = useMemo(() => [...new Set(antwoorden.map((a) => a.categorie))], [antwoorden]);
  const statusPerCategorie = useMemo(() => {
    const alle = categorieStatus(leesVoortgang());
    return Object.fromEntries(alle.map((r) => [r.sleutel, r]));
  }, []);

  const geschiedenis = useMemo(() => leesGeschiedenis(), []);
  const vorige = geschiedenis.slice(0, -1).slice(-5); // de huidige ronde zit er al in, die tonen we los

  return (
    <div style={{ minHeight: "100vh", background: C.creme, fontFamily: font }}>
      <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 16px" }}>
        <Kaart style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 18 }}>
            <Honingraat aantal={totaal} antwoorden={antwoordenGoed} fase="klaar" />
          </div>
          <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.zwart, margin: "0 0 8px" }}>
            Je hebt {goedAantal} {goedAantal === 1 ? "cel" : "cellen"} met honing gevuld!
          </h2>
          <p style={{ fontFamily: font, color: C.grijs, fontSize: 14, margin: "0 0 4px" }}>
            Van de {totaal} woorden die je zelf liet zien.
          </p>
        </Kaart>

        {vorige.length > 0 && (
          <Kaart style={{ padding: "14px 18px" }}>
            <p style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 12, margin: "0 0 8px" }}>
              Eerdere keren
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {vorige.map((r, i) => (
                <span key={i} style={{
                  background: C.cremeMid, border: `1px solid ${C.rand}`, borderRadius: 99,
                  padding: "3px 12px", fontFamily: font, fontWeight: 700, fontSize: 13, color: C.zwart,
                }}>
                  {r.goed}/{r.totaal}
                </span>
              ))}
              <span style={{
                background: C.geelLicht, border: `1px solid ${C.geel}`, borderRadius: 99,
                padding: "3px 12px", fontFamily: font, fontWeight: 800, fontSize: 13, color: "#92400E",
              }}>
                nu: {goedAantal}/{totaal}
              </span>
            </div>
          </Kaart>
        )}

        <Kaart>
          <p style={{ fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: 14, margin: "0 0 12px" }}>
            Per soort woord
          </p>
          {categorieenInRonde.map((sleutel) => {
            const r = statusPerCategorie[sleutel];
            const stand = STANDEN[r?.stand] ?? STANDEN.nieuw;
            return (
              <div key={sleutel} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span aria-hidden="true" style={{
                  width: 10, height: 10, borderRadius: 99, background: stand.kleur, flexShrink: 0,
                }} />
                <span style={{ fontFamily: font, fontWeight: 700, fontSize: 13, color: C.zwart }}>
                  {categorieLabel(sleutel)}
                </span>
                <span style={{ fontFamily: font, fontSize: 12, color: C.grijs }}>
                  — {stand.tekst}
                </span>
              </div>
            );
          })}
        </Kaart>

        {fout.length > 0 && (
          <Kaart style={{ background: C.geelLicht, border: `1px solid ${C.geel}44` }}>
            <p style={{ fontFamily: font, fontWeight: 700, color: "#92400E", fontSize: 13, margin: "0 0 8px" }}>
              Deze woorden mag je nog een keertje oefenen:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {fout.map((a, i) => (
                <span key={i} style={{
                  background: C.wit, border: `1px solid ${C.rand}`, borderRadius: 99,
                  padding: "3px 12px", fontFamily: font, fontWeight: 700, fontSize: 13, color: C.zwart,
                }}>
                  {a.woord}
                </span>
              ))}
            </div>
          </Kaart>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button onClick={onOpnieuw} style={{ ...primaireKnop(font), width: "100%" }}>
            Nog een keer
          </button>
          {onVoortgang && (
            <button onClick={onVoortgang} style={{ ...lichteKnop(font), width: "100%" }}>
              Bekijk je voortgang
            </button>
          )}
          <button onClick={onExit} style={{ ...lichteKnop(font), width: "100%" }}>
            Terug naar menu
          </button>
        </div>
      </div>
      <Footer font={font} />
    </div>
  );
}

// Validatie van de itemvorm-config: nooit crashen op een verkeerde waarde.
if (!Object.values(ITEMVORMEN).includes(ITEMVORM) || ITEMVORM !== ITEMVORMEN.DICTEEWOORD) {
  // eslint-disable-next-line no-console
  console.warn(`ZelfDoen: itemvorm "${ITEMVORM}" is nog niet gebouwd, val terug op dicteewoord.`);
}
