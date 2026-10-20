import { useState, useEffect } from "react";
import {
  C, FONT_LINK_NUNITO, FONT_LINK_DYSLEXIC,
  Logo, Header, Footer,
} from "./theme";
import Flitswoorden from "./Flitswoorden";
import CategorieOefenen from "./CategorieOefenen";
import ZelfDoen from "./ZelfDoen";
import Voortgangsoverzicht from "./Voortgangsoverzicht";

// ── MAIN APP ──────────────────────────────────────────────────────────────────
const FASE = { HOME:"home", FLITSWOORDEN:"flitswoorden", CATEGORIE:"categorie", ZELFDOEN:"zelfdoen", VOORTGANG:"voortgang" };

export default function SpellingApp() {
  const [fase, setFase] = useState(FASE.HOME);
  const [dyslexie, setDyslexie] = useState(false);

  const font = dyslexie ? "OpenDyslexic, sans-serif" : "'Nunito', sans-serif";

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = FONT_LINK_NUNITO;
    document.head.appendChild(link);
    const link2 = document.createElement("link");
    link2.rel = "stylesheet"; link2.href = FONT_LINK_DYSLEXIC;
    document.head.appendChild(link2);
  }, []);

  const pageStyle = {
    minHeight: "100vh", background: C.creme,
    fontFamily: font, transition: "font-family 0.2s",
  };

  // ── FLITSWOORDEN (losse oefenvorm) ──
  if (fase === FASE.FLITSWOORDEN)
    return <Flitswoorden font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
      onExit={() => setFase(FASE.HOME)} onVoortgang={() => setFase(FASE.VOORTGANG)} />;

  // ── CATEGORIE OEFENEN (kies zelf één spellingregel) ──
  if (fase === FASE.CATEGORIE)
    return <CategorieOefenen font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
      onExit={() => setFase(FASE.HOME)} onVoortgang={() => setFase(FASE.VOORTGANG)} />;

  // ── ZELF DOEN (zelfstandig laten zien wat je kan) ──
  if (fase === FASE.ZELFDOEN)
    return <ZelfDoen font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
      onExit={() => setFase(FASE.HOME)} onVoortgang={() => setFase(FASE.VOORTGANG)} />;

  // ── VOORTGANGSOVERZICHT PER SPELLINGCATEGORIE ──
  if (fase === FASE.VOORTGANG)
    return <Voortgangsoverzicht font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
      onExit={() => setFase(FASE.HOME)} />;

  // ── HOME ──
  if (fase === FASE.HOME) return (
    <div style={pageStyle}>
      <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} onLogoClick={() => setFase(FASE.HOME)} />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo size={80} />
          <h1 style={{ fontFamily: font, fontWeight: 800, fontSize: 32, color: C.zwart, margin: "16px 0 8px" }}>
            Oefen je <span style={{ color: C.geel }}>flitswoorden</span>
          </h1>
          <p style={{ fontFamily: font, color: C.grijs, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            Een woord flitst heel even voorbij. Daarna verdwijnt het en typ je het uit je hoofd over.
          </p>
        </div>

        <button onClick={() => setFase(FASE.FLITSWOORDEN)} style={{
          background: C.cremeMid, color: C.zwart, border: `2px solid ${C.geelRand}`, borderRadius: 16,
          padding: "16px 24px", fontWeight: 800, fontSize: 18, cursor: "pointer",
          width: "100%", fontFamily: font, letterSpacing: 0.3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "transform 0.1s",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <span style={{ textAlign: "left", flex: 1 }}>
            Start Flitswoorden
            <span style={{ display: "block", fontWeight: 700, fontSize: 12, color: C.grijs }}>
              5 woordcategorieën
            </span>
          </span>
          <span style={{ color: C.grijs }}>→</span>
        </button>

        <p style={{ fontFamily: font, fontSize: 12, color: C.grijs, lineHeight: 1.6,
          margin: "10px 2px 0", textAlign: "center" }}>
          De app houdt bij welke soort woorden je nog moeilijk vindt en laat die vaker
          terugkomen — net voordat je ze dreigt te vergeten.
        </p>

        <button onClick={() => setFase(FASE.CATEGORIE)} style={{
          background: C.wit, color: C.zwart, border: `1.5px solid ${C.rand}`, borderRadius: 14,
          padding: "12px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer",
          width: "100%", fontFamily: font, marginTop: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <span style={{ textAlign: "left", flex: 1 }}>
            Oefen één categorie
            <span style={{ display: "block", fontWeight: 700, fontSize: 12, color: C.grijs }}>
              kies zelf welke spellingregel
            </span>
          </span>
          <span style={{ color: C.grijs }}>→</span>
        </button>

        <button onClick={() => setFase(FASE.ZELFDOEN)} style={{
          background: C.wit, color: C.zwart, border: `1.5px solid ${C.rand}`, borderRadius: 14,
          padding: "12px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer",
          width: "100%", fontFamily: font, marginTop: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🍯</span>
          <span style={{ textAlign: "left", flex: 1 }}>
            Zelf doen
            <span style={{ display: "block", fontWeight: 700, fontSize: 12, color: C.grijs }}>
              laat zien wat je al kan
            </span>
          </span>
          <span style={{ color: C.grijs }}>→</span>
        </button>

        <button onClick={() => setFase(FASE.VOORTGANG)} style={{
          background: C.wit, color: C.zwart, border: `1.5px solid ${C.rand}`, borderRadius: 14,
          padding: "12px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer",
          width: "100%", fontFamily: font, marginTop: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span style={{ textAlign: "left", flex: 1 }}>
            Jouw spellingkaart
            <span style={{ display: "block", fontWeight: 700, fontSize: 12, color: C.grijs }}>
              zie per soort woord hoe het gaat
            </span>
          </span>
          <span style={{ color: C.grijs }}>→</span>
        </button>
      </div>
      <Footer font={font} />
    </div>
  );

  return null;
}