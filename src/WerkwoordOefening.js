import { useState, useRef, useEffect } from "react";
import { C, Kaart, Header, Footer, ProgressBar } from "./theme";
import { splitsZin } from "./data/werkwoorden";
import { registreerPoging } from "./spelling/voortgang";
import { primaireKnop, lichteKnop } from "./OefenSessie";

// ── WERKWOORDOEFENING ────────────────────────────────────────────────────────
// Itemvorm "zin met een gat" (optie b uit de Zelf-doen-configuratie), hier
// uitgebouwd voor de gewone oefenmodus van CategorieOefenen.js. Een los woord
// dicteren werkt niet voor werkwoordspelling: welke vorm goed is hangt af van
// het onderwerp in de zin. Vandaar een eigen, kleine sessieflow naast
// OefenSessie.js (dat is specifiek voor los-woord-flitsen) — de twee delen wel
// dezelfde knopstijlen en dezelfde neutrale feedbacktoon.
//
// Net als bij de rest van de leerfase: feedback mag er altijd zijn, zonder
// waardeoordeel. Hier staat er bovendien een korte, neutrale uitleg van de
// strategie bij (bv. "jij/hij/zij/het: stam + t"), aangeleverd per item.
// ─────────────────────────────────────────────────────────────────────────────

function normaliseer(tekst) {
  return tekst.trim().toLowerCase();
}

export default function WerkwoordOefening({
  font, dyslexie, setDyslexie, titel, zinnen,
  opnieuwLabel, onOpnieuw, andereLabel, onAndere, onVoortgang, onExit,
}) {
  const [stap, setStap] = useState("typen"); // typen | feedback | klaar
  const [index, setIndex] = useState(0);
  const [invoer, setInvoer] = useState("");
  const [resultaten, setResultaten] = useState([]); // { zin, juisteVorm, getypt, goed, strategie }

  const invoerRef = useRef(null);
  const pageStyle = { minHeight: "100vh", background: C.creme, fontFamily: font };
  const huidigItem = zinnen[index];

  useEffect(() => {
    if (stap === "typen" && invoerRef.current) invoerRef.current.focus();
  }, [stap, index]);

  useEffect(() => {
    if (stap !== "feedback") return;
    const laatste = resultaten[resultaten.length - 1];
    if (laatste?.goed) {
      const t = setTimeout(volgende, 1200); // iets langer dan bij losse woorden: hier staat ook de strategie-uitleg
      return () => clearTimeout(t);
    }
  }, [stap]); // eslint-disable-line react-hooks/exhaustive-deps

  function bevestig() {
    if (!invoer.trim()) return;
    const getypt = invoer.trim();
    const goed = normaliseer(getypt) === normaliseer(huidigItem.juisteVorm);
    // Voor werkwoordzinnen is er geen los "woord"; de juiste vorm is de
    // spelling die we willen laten terugkomen in de gespreide herhaling.
    registreerPoging({ woord: huidigItem.juisteVorm, categorie: huidigItem.categorie, correct: goed, getypt });
    setResultaten((r) => [...r, { ...huidigItem, getypt, goed }]);
    setInvoer("");
    setStap("feedback");
  }

  function volgende() {
    if (index + 1 >= zinnen.length) {
      setStap("klaar");
    } else {
      setIndex((i) => i + 1);
      setStap("typen");
    }
  }

  if (zinnen.length === 0) {
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>
          <Kaart style={{ textAlign: "center" }}>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 15 }}>Hier staan nog geen zinnen in.</p>
            <button onClick={onAndere} style={{ ...lichteKnop(font), width: "100%", marginTop: 12 }}>
              {andereLabel ?? "Terug"}
            </button>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── TYPEN ──
  if (stap === "typen") {
    const [voor, na] = splitsZin(huidigItem.zin);
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <SessieBalk titel={titel} index={index} totaal={zinnen.length} font={font} />
          <Kaart style={{ textAlign: "center", padding: "36px 24px" }}>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>
              Welk woord hoort in het gat?
            </p>
            <p style={{
              fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: dyslexie ? 20 : 18,
              lineHeight: 1.6, margin: "0 0 24px",
            }}>
              {voor}
              <span style={{
                display: "inline-block", minWidth: 54, borderBottom: `3px dashed ${C.geel}`,
                margin: "0 4px",
              }}>&nbsp;</span>
              {na}
            </p>
            <form onSubmit={(e) => { e.preventDefault(); bevestig(); }}>
              <input
                ref={invoerRef}
                value={invoer}
                onChange={(e) => setInvoer(e.target.value)}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                placeholder="typ hier het woord"
                style={{
                  width: "100%", boxSizing: "border-box", textAlign: "center",
                  fontFamily: font, fontWeight: 800, fontSize: dyslexie ? 22 : 24,
                  color: C.zwart, padding: "12px 16px", borderRadius: 14,
                  border: `2px solid ${C.rand}`, outline: "none", background: C.cremeMid,
                }}
              />
              <button type="submit" disabled={!invoer.trim()} style={{
                ...primaireKnop(font), marginTop: 16, width: "100%",
                opacity: invoer.trim() ? 1 : 0.4, cursor: invoer.trim() ? "pointer" : "default",
              }}>
                Klaar (Enter)
              </button>
            </form>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── FEEDBACK ──
  if (stap === "feedback") {
    const laatste = resultaten[resultaten.length - 1];
    const [voor, na] = splitsZin(laatste.zin);
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <SessieBalk titel={titel} index={index} totaal={zinnen.length} font={font} />
          <Kaart style={{ textAlign: "center", padding: "36px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{laatste.goed ? "✅" : "✏️"}</div>
            <p style={{ fontFamily: font, fontWeight: 800, color: laatste.goed ? C.groen : C.zwart,
              fontSize: dyslexie ? 20 : 18, margin: "0 0 16px" }}>
              {laatste.goed ? "Goed zo!" : "Zo schrijf je dat:"}
            </p>
            <p style={{ fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: dyslexie ? 19 : 17, lineHeight: 1.6, margin: "0 0 18px" }}>
              {voor}
              <span style={{ background: C.geelMid, borderRadius: 5, padding: "0 4px", fontWeight: 800 }}>
                {laatste.juisteVorm}
              </span>
              {na}
            </p>
            {/* Geen waardeoordeel, wel de strategie erbij — dat is precies waar
                deze categorie om vraagt: niet alleen wát goed is, maar waarom. */}
            {laatste.strategie && (
              <p style={{ fontFamily: font, fontSize: 13, color: C.grijs, margin: "0 0 20px", lineHeight: 1.5 }}>
                💡 {laatste.strategie}
              </p>
            )}
            {!laatste.goed && (
              <button onClick={volgende} style={{ ...primaireKnop(font), width: "100%" }}>
                Volgende zin →
              </button>
            )}
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── KLAAR ──
  if (stap === "klaar") {
    const goed = resultaten.filter((r) => r.goed).length;
    const totaal = resultaten.length;
    const fout = resultaten.filter((r) => !r.goed);
    const emoji = goed === totaal ? "🌟" : goed >= totaal * 0.6 ? "😊" : "💪";
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>
          <Kaart style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
            <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.zwart, margin: "0 0 6px" }}>
              Sessie klaar!
            </h2>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 15, margin: "0 0 18px" }}>
              Je had er <strong style={{ color: C.zwart }}>{goed}</strong> van de {totaal} in één keer goed.
            </p>
            <div style={{ maxWidth: 280, margin: "0 auto 20px" }}>
              <ProgressBar value={goed} max={totaal} kleur={C.geel} />
            </div>
            {fout.length > 0 && (
              <div style={{ textAlign: "left", background: C.geelLicht, border: `1px solid ${C.geel}44`,
                borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
                <p style={{ fontFamily: font, fontWeight: 700, color: "#92400E", fontSize: 13, margin: "0 0 8px" }}>
                  Deze vormen mag je nog een keertje oefenen:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {fout.map((r, i) => (
                    <span key={i} style={{ background: C.wit, border: `1px solid ${C.rand}`, borderRadius: 99,
                      padding: "3px 12px", fontFamily: font, fontWeight: 700, fontSize: 13, color: C.zwart }}>
                      {r.juisteVorm}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {onOpnieuw && (
                <button onClick={onOpnieuw} style={{ ...primaireKnop(font), width: "100%" }}>
                  {opnieuwLabel ?? "Nog een keer"}
                </button>
              )}
              {onAndere && (
                <button onClick={onAndere} style={{ ...lichteKnop(font), width: "100%" }}>
                  {andereLabel ?? "Terug"}
                </button>
              )}
              {onVoortgang && (
                <button onClick={onVoortgang} style={{ ...lichteKnop(font), width: "100%" }}>
                  Bekijk je voortgang
                </button>
              )}
              <button onClick={onExit} style={{ ...lichteKnop(font), width: "100%" }}>
                Terug naar menu
              </button>
            </div>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  return null;
}

function SessieBalk({ titel, index, totaal, font }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>{titel}</span>
        <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>
          {Math.min(index + 1, totaal)}/{totaal}
        </span>
      </div>
      <ProgressBar value={index} max={totaal} kleur={C.geel} />
    </div>
  );
}
