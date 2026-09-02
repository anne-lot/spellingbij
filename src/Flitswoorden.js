import { useState, useRef, useEffect, useCallback } from "react";
import { C, Kaart, Header, Footer, ProgressBar, shuffle } from "./theme";
import flitsData from "./data/flitswoorden.json";

// ── FLITSWOORDEN ──────────────────────────────────────────────────────────────
// Gebaseerd op de onderwijsmethode "Flitswoorden": een woord wordt kort getoond,
// verdwijnt, en het kind typt het over uit het geheugen.
//
// Alles wat je wilt aanpassen zit in src/data/flitswoorden.json:
//   - standaardFlitstijd : seconden dat een woord getoond wordt (fallback)
//   - sessieLengte        : aantal woorden per sessie
//   - per categorie een eigen "flitstijd" en "woorden"-lijst
// ─────────────────────────────────────────────────────────────────────────────

const OPSLAG_KEY = "spellingbij_flitswoorden_v1";

// Nette Nederlandse labels per categorie-id uit het JSON-bestand.
const CATEGORIE_LABEL = {
  kort:          "Korte woorden",
  middel:        "Langere woorden",
  werkwoorden:   "Werkwoorden",
  voorzetsels:   "Voorzetsels",
  signaalwoorden:"Signaalwoorden",
};

const CATEGORIEEN = Object.entries(flitsData.flitswoorden).map(([id, cfg]) => ({
  id,
  label: CATEGORIE_LABEL[id] || id,
  niveau: cfg.niveau,
  flitstijd: cfg.flitstijd,
  woorden: cfg.woorden,
}));

const STANDAARD_FLITSTIJD = flitsData.standaardFlitstijd ?? 3;
const SESSIE_LENGTE = flitsData.sessieLengte ?? 12;

// Bepaal hoe lang één woord getoond wordt. Nu: per categorie instelbaar via JSON,
// met een kleine extra marge voor lange woorden. Later kun je dit verder
// verfijnen (bijv. per niveau of per woord) zonder de rest aan te passen.
function bepaalFlitstijd(woord, categorie) {
  const basis = categorie.flitstijd ?? STANDAARD_FLITSTIJD;
  const extra = woord.length >= 12 ? 1 : 0;
  return basis + extra;
}

function normaliseer(tekst) {
  return tekst.trim().toLowerCase();
}

// ── LOKALE OPSLAG ─────────────────────────────────────────────────────────────
function leesVoortgang() {
  try {
    return JSON.parse(localStorage.getItem(OPSLAG_KEY)) || {};
  } catch {
    return {};
  }
}

function bewaarSessie(categorieId, goed, totaal) {
  try {
    const alles = leesVoortgang();
    const vorig = alles[categorieId] || {
      sessies: 0, besteScore: 0, laatsteScore: 0, laatsteTotaal: 0,
      totaalGoed: 0, totaalWoorden: 0,
    };
    alles[categorieId] = {
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
export default function Flitswoorden({ font, dyslexie, setDyslexie, onExit }) {
  const [stap, setStap] = useState("keuze"); // keuze | flits | invoer | feedback | klaar
  const [categorie, setCategorie] = useState(null);
  const [sessieWoorden, setSessieWoorden] = useState([]);
  const [index, setIndex] = useState(0);
  const [invoer, setInvoer] = useState("");
  const [resultaten, setResultaten] = useState([]); // { woord, getypt, goed }
  const [resterend, setResterend] = useState(1);

  const invoerRef = useRef(null);
  const pageStyle = { minHeight: "100vh", background: C.creme, fontFamily: font };

  const huidigWoord = sessieWoorden[index];
  const flitstijd = categorie && huidigWoord ? bepaalFlitstijd(huidigWoord, categorie) : STANDAARD_FLITSTIJD;

  // ── Sessie starten ──
  const startSessie = useCallback((cat) => {
    const woorden = shuffle(cat.woorden).slice(0, Math.min(SESSIE_LENGTE, cat.woorden.length));
    setCategorie(cat);
    setSessieWoorden(woorden);
    setIndex(0);
    setInvoer("");
    setResultaten([]);
    setResterend(1);
    setStap("flits");
  }, []);

  // ── Aftellen tijdens de flits ──
  useEffect(() => {
    if (stap !== "flits") return;
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
  }, [stap, index, flitstijd]);

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
    setResultaten((r) => [...r, { woord: huidigWoord, getypt: invoer.trim(), goed }]);
    setStap("feedback");
  }

  function volgende() {
    if (index + 1 >= sessieWoorden.length) {
      const goedAantal = (resultaten.filter((r) => r.goed)).length;
      bewaarSessie(categorie.id, goedAantal, sessieWoorden.length);
      setStap("klaar");
    } else {
      setIndex((i) => i + 1);
      setInvoer("");
      setResterend(1);
      setStap("flits");
    }
  }

  const fs = dyslexie ? 18 : 16;

  // ── KEUZESCHERM ──
  if (stap === "keuze") {
    const voortgang = leesVoortgang();
    return (
      <div style={pageStyle}>
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
            Kies een categorie
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CATEGORIEEN.map((cat) => {
              const v = voortgang[cat.id];
              return (
                <button key={cat.id} onClick={() => startSessie(cat)} style={{
                  background: C.wit, border: `1.5px solid ${C.rand}`, borderRadius: 14,
                  padding: "14px 16px", textAlign: "left", cursor: "pointer",
                  fontFamily: font, display: "flex", justifyContent: "space-between",
                  alignItems: "center", gap: 12,
                }}>
                  <span>
                    <span style={{ fontWeight: 800, fontSize: fs, color: C.zwart, display: "block" }}>
                      {cat.label}
                    </span>
                    <span style={{ fontSize: 12, color: C.grijs }}>
                      {cat.niveau} · {cat.woorden.length} woorden · {cat.flitstijd ?? STANDAARD_FLITSTIJD} sec per woord
                    </span>
                  </span>
                  {v && (
                    <span style={{
                      background: C.geelLicht, border: `1px solid ${C.geel}`, borderRadius: 99,
                      padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#92400E",
                      whiteSpace: "nowrap",
                    }}>
                      laatst {v.laatsteScore}/{v.laatsteTotaal}
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

  // ── FLITS: woord kort tonen ──
  if (stap === "flits") {
    return (
      <div style={pageStyle}>
        <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <SessieBalk categorie={categorie} index={index} totaal={sessieWoorden.length} font={font} />
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
          <SessieBalk categorie={categorie} index={index} totaal={sessieWoorden.length} font={font} />
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
                ...zwarteKnop(font), marginTop: 18, width: "100%",
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
          <SessieBalk categorie={categorie} index={index} totaal={sessieWoorden.length} font={font} />
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
                <p style={{ fontFamily: font, color: C.grijs, fontSize: 13, marginTop: 16, marginBottom: 0 }}>
                  Ga door naar het volgende woord…
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>👀</div>
                <p style={{ fontFamily: font, fontWeight: 800, color: "#92400E", fontSize: dyslexie ? 20 : 18, margin: "0 0 18px" }}>
                  Bijna! Kijk goed naar het verschil.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                  <VergelijkVak label="Jij typte" woord={laatste.getypt} kleur={C.rood} bg={C.roodLicht} font={font} dyslexie={dyslexie} />
                  <VergelijkVak label="Het woord was" woord={laatste.woord} kleur={C.groen} bg={C.groenLicht} font={font} dyslexie={dyslexie} />
                </div>
                <button onClick={volgende} style={{ ...zwarteKnop(font), width: "100%" }}>
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
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => startSessie(categorie)} style={{ ...zwarteKnop(font), width: "100%" }}>
                Nog een keer ({categorie.label})
              </button>
              <button onClick={() => setStap("keuze")} style={{ ...lichteKnop(font), width: "100%" }}>
                Andere categorie
              </button>
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
function SessieBalk({ categorie, index, totaal, font }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: font, fontWeight: 700, color: C.grijs, fontSize: 13 }}>
          Flitswoorden · {categorie.label}
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
function zwarteKnop(font) {
  return {
    background: C.zwart, color: C.geel, border: "none", borderRadius: 14,
    padding: "14px 28px", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: font,
  };
}
function lichteKnop(font) {
  return {
    background: C.cremeMid, color: C.zwart, border: `2px solid ${C.rand}`, borderRadius: 14,
    padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: font,
  };
}
function terugKnop(font) {
  return {
    background: "none", border: "none", color: C.grijs, fontFamily: font, fontWeight: 700,
    fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 12,
  };
}
