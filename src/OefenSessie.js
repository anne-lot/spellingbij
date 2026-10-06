import { useState, useRef, useEffect } from "react";
import { C, Kaart, Header, Footer, ProgressBar } from "./theme";
import { STANDAARD_FLITSTIJD } from "./data/woorden";
import { registreerPoging } from "./spelling/voortgang";

// ── OEFENSESSIE ───────────────────────────────────────────────────────────────
// De flits/invoer/feedback/klaar-flow, los van "welke woorden" en "welke titel".
// Oorspronkelijk zat dit alleen in Flitswoorden.js; omdat CategorieOefenen.js
// exact dezelfde flow nodig had (zelfde manier van oefenen, alleen een andere
// woordselectie), is die flow hier naar toe verplaatst zodat beide 'm gebruiken
// in plaats van 'm te dupliceren.
//
// De aanroeper regelt: welke woorden (`woorden`), hoe ze heten (`titel`), wat
// er gebeurt bij "nog een keer" (`onOpnieuw`) en "andere groep/categorie"
// (`onAndere`), en mag optioneel meeluisteren met het eindresultaat (`onKlaar`)
// om bijvoorbeeld een losse score bij te werken (zoals Flitswoorden doet per
// groep). De categorie-voortgang per woord wordt hier altijd bijgewerkt via
// registreerPoging, onafhankelijk van wat de aanroeper doet.
// ─────────────────────────────────────────────────────────────────────────────

function bepaalFlitstijd(woord, basisSeconden) {
  const extra = woord.length >= 12 ? 1 : 0;
  return basisSeconden + extra;
}

function normaliseer(tekst) {
  return tekst.trim().toLowerCase();
}

// ── AFTELCIRKEL ───────────────────────────────────────────────────────────────
function Aftelcirkel({ resterend, seconden, font }) {
  const r = 52;
  const omtrek = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 128, height: 128 }}>
      <svg width={128} height={128} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={64} cy={64} r={r} fill="none" stroke={C.rand} strokeWidth={8} />
        <circle
          cx={64} cy={64} r={r} fill="none" stroke={C.geel} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={omtrek}
          strokeDashoffset={omtrek * (1 - resterend)}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: font, fontWeight: 800, fontSize: 22,
        color: C.grijs,
      }}>
        {Math.ceil(resterend * seconden)}
      </span>
    </div>
  );
}

// ── HOOFDCOMPONENT ────────────────────────────────────────────────────────────
export default function OefenSessie({
  font, dyslexie, setDyslexie,
  titel, woorden, basisFlitstijd = STANDAARD_FLITSTIJD,
  onKlaar, opnieuwLabel, onOpnieuw, andereLabel, onAndere,
  onVoortgang, onExit, toonFoutCategorieHint = true,
}) {
  const [stap, setStap] = useState("flits"); // flits | invoer | feedback | klaar
  const [index, setIndex] = useState(0);
  const [invoer, setInvoer] = useState("");
  const [resultaten, setResultaten] = useState([]); // { woord, categorie, getypt, goed }
  const [resterend, setResterend] = useState(1);

  const invoerRef = useRef(null);
  const pageStyle = { minHeight: "100vh", background: C.creme, fontFamily: font };

  const huidigItem = woorden[index];
  const huidigWoord = huidigItem?.woord;
  const flitstijd = huidigWoord ? bepaalFlitstijd(huidigWoord, basisFlitstijd) : basisFlitstijd;

  // ── Aftellen tijdens de flits ──
  useEffect(() => {
    if (stap !== "flits" || !huidigWoord) return;
    const duurMs = flitstijd * 1000;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const verstreken = now - start;
      const over = Math.max(0, 1 - verstreken / duurMs);
      setResterend(over);
      if (verstreken < duurMs) {
        raf = requestAnimationFrame(tick);
      } else {
        setStap("invoer");
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stap, index, flitstijd, huidigWoord]);

  // ── Focus op invoerveld ──
  useEffect(() => {
    if (stap === "invoer" && invoerRef.current) invoerRef.current.focus();
  }, [stap]);

  // ── Automatisch door na een goed antwoord ──
  useEffect(() => {
    if (stap !== "feedback") return;
    const laatste = resultaten[resultaten.length - 1];
    if (laatste && laatste.goed) {
      const t = setTimeout(volgende, 1000);
      return () => clearTimeout(t);
    }
  }, [stap]); // eslint-disable-line react-hooks/exhaustive-deps

  function bevestig() {
    if (!invoer.trim()) return;
    const goed = normaliseer(invoer) === normaliseer(huidigWoord);
    const getypt = invoer.trim();
    // Foutdiagnose: niet alleen "fout", maar gekoppeld aan de spellingcategorie
    // van het doelwoord. Dit voedt het herhalingsmodel voor volgende sessies.
    registreerPoging({ woord: huidigWoord, categorie: huidigItem.categorie, correct: goed, getypt });
    setResultaten((r) => [...r, { woord: huidigWoord, categorie: huidigItem.categorie, getypt, goed, hint: huidigItem.hint }]);
    setStap("feedback");
  }

  function volgende() {
    if (index + 1 >= woorden.length) {
      onKlaar?.(resultaten);
      setStap("klaar");
    } else {
      setIndex((i) => i + 1);
      setInvoer("");
      setResterend(1);
      setStap("flits");
    }
  }

  // Lege sessie (bv. een categorie zonder woorden) — nette uitweg i.p.v. vastlopen.
  if (woorden.length === 0) {
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>
          <Kaart style={{ textAlign: "center" }}>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 15 }}>
              Hier staan nog geen woorden in.
            </p>
            <button onClick={onAndere} style={{ ...lichteKnop(font), width: "100%", marginTop: 12 }}>
              {andereLabel ?? "Terug"}
            </button>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── FLITS: woord kort tonen ──
  if (stap === "flits") {
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <SessieBalk titel={titel} index={index} totaal={woorden.length} font={font} />
          <Kaart style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 13, fontWeight: 700, marginTop: 0, marginBottom: 24 }}>
              Kijk goed…
            </p>
            <div style={{
              fontFamily: font, fontWeight: 800, color: C.zwart,
              fontSize: dyslexie ? 44 : 56, letterSpacing: 1, lineHeight: 1.2,
              wordBreak: "break-word", margin: "8px 0 28px",
            }}>
              {huidigWoord}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Aftelcirkel resterend={resterend} seconden={flitstijd} font={font} />
            </div>
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── INVOER: woord overtypen ──
  if (stap === "invoer") {
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <SessieBalk titel={titel} index={index} totaal={woorden.length} font={font} />
          <Kaart style={{ textAlign: "center", padding: "40px 24px" }}>
            <p style={{ fontFamily: font, fontWeight: 700, color: C.zwart, fontSize: dyslexie ? 19 : 17, marginTop: 0, marginBottom: 20 }}>
              Welk woord zag je? Typ het over.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); bevestig(); }}>
              <input
                ref={invoerRef}
                value={invoer}
                onChange={(e) => setInvoer(e.target.value)}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                style={{
                  width: "100%", boxSizing: "border-box", textAlign: "center",
                  fontFamily: font, fontWeight: 800, fontSize: dyslexie ? 26 : 30,
                  color: C.zwart, padding: "14px 16px", borderRadius: 14,
                  border: `2px solid ${C.rand}`, outline: "none", background: C.cremeMid,
                }}
              />
              <button type="submit" disabled={!invoer.trim()} style={{
                ...primaireKnop(font), marginTop: 18, width: "100%",
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
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <SessieBalk titel={titel} index={index} totaal={woorden.length} font={font} />
          <Kaart style={{ textAlign: "center", padding: "40px 24px" }}>
            {laatste.goed ? (
              <>
                <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
                <p style={{ fontFamily: font, fontWeight: 800, color: C.groen, fontSize: dyslexie ? 22 : 20, margin: "0 0 8px" }}>
                  Goed zo!
                </p>
                <div style={{
                  fontFamily: font, fontWeight: 800, fontSize: dyslexie ? 28 : 32, color: C.zwart,
                }}>
                  {laatste.woord}
                </div>
                {laatste.hint && (
                  <p style={{ fontFamily: font, fontSize: 13, color: C.grijs, margin: "14px 0 0", lineHeight: 1.5 }}>
                    💡 {laatste.hint}
                  </p>
                )}
                <p style={{ fontFamily: font, color: C.grijs, fontSize: 13, marginTop: 10, marginBottom: 0 }}>
                  Ga door naar het volgende woord…
                </p>
              </>
            ) : (
              <>
                {/* Geen waardeoordeel: geen rood, geen "fout", geen kruis — gewoon
                    neutraal en kort het juiste woord laten zien. Dat gebeurt hier
                    altijd, nooit overslaan: die correctie na een ophaalpoging is
                    wat het testeffect oplevert. */}
                <div style={{ fontSize: 40, marginBottom: 8 }}>✏️</div>
                <p style={{ fontFamily: font, fontWeight: 800, color: C.zwart, fontSize: dyslexie ? 20 : 18, margin: "0 0 18px" }}>
                  Dit woord schrijf je zo:
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                  <VergelijkVak label="Jij typte" woord={laatste.getypt}
                    kleur={C.grijs} bg={C.cremeMid} font={font} dyslexie={dyslexie} />
                  <VergelijkVak label="Het woord was" woord={laatste.woord}
                    kleur={C.groen} bg={C.groenLicht} font={font} dyslexie={dyslexie} />
                </div>
                {laatste.hint && (
                  <p style={{ fontFamily: font, fontSize: 13, color: C.grijs, margin: "0 0 20px", lineHeight: 1.5 }}>
                    💡 {laatste.hint}
                  </p>
                )}
                <button onClick={volgende} style={{ ...primaireKnop(font), width: "100%" }}>
                  Volgende woord →
                </button>
              </>
            )}
          </Kaart>
        </div>
        <Footer font={font} />
      </div>
    );
  }

  // ── KLAAR: samenvatting ──
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
                  Deze woorden mag je nog een keer oefenen:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {fout.map((r, i) => (
                    <span key={i} style={{ background: C.wit, border: `1px solid ${C.rand}`, borderRadius: 99,
                      padding: "3px 12px", fontFamily: font, fontWeight: 700, fontSize: 13, color: C.zwart }}>
                      {r.woord}
                    </span>
                  ))}
                </div>
                {toonFoutCategorieHint && (
                  <p style={{ fontFamily: font, fontSize: 12, color: "#92400E", margin: "10px 0 0", lineHeight: 1.5 }}>
                    Daar krijg je snel weer woorden van.
                  </p>
                )}
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

// ── KLEINE HULPCOMPONENTEN ────────────────────────────────────────────────────
function SessieBalk({ titel, index, totaal, font }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>
          {titel}
        </span>
        <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>
          {Math.min(index + 1, totaal)}/{totaal}
        </span>
      </div>
      <ProgressBar value={index} max={totaal} kleur={C.geel} />
    </div>
  );
}

function VergelijkVak({ label, woord, kleur, bg, font, dyslexie }) {
  return (
    <div style={{ background: bg, border: `2px solid ${kleur}`, borderRadius: 12, padding: "10px 16px", minWidth: 120 }}>
      <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: kleur, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: font, fontWeight: 800, fontSize: dyslexie ? 20 : 22, color: C.zwart, wordBreak: "break-word" }}>
        {woord || "—"}
      </div>
    </div>
  );
}

// ── KNOPSTIJLEN ───────────────────────────────────────────────────────────────
// Geëxporteerd zodat de keuzeschermen (Flitswoorden, CategorieOefenen) dezelfde
// knoppenstijl gebruiken zonder 'm te dupliceren.
export function primaireKnop(font) {
  return {
    background: C.cremeMid, color: C.zwart, border: `2px solid ${C.geelRand}`, borderRadius: 14,
    padding: "14px 28px", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: font,
  };
}
export function lichteKnop(font) {
  return {
    background: C.cremeMid, color: C.zwart, border: `2px solid ${C.rand}`, borderRadius: 14,
    padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: font,
  };
}
export function terugKnop(font) {
  return {
    background: "none", border: "none", color: C.grijs, fontFamily: font, fontWeight: 700,
    fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 12,
  };
}
