import { useState } from "react";
import { C, Kaart, Header, Footer, ProgressBar } from "./theme";
import { leesVoortgang, resetVoortgang, categorieStatus } from "./spelling/voortgang";

// ── VOORTGANGSOVERZICHT PER SPELLINGCATEGORIE ────────────────────────────────
// Eén balkje per spellingcategorie, zodat een kind of ouder in één oogopslag
// ziet waar het al goed gaat en waar nog wat te halen is.
//
// Toon: positief. Geen kruisjes, geen "fout", geen rood. Een zwakke categorie
// heet hier "hier kun je nog op oefenen" en een categorie waarin nog niet
// geoefend is heet "nog niet geoefend" — expliciet géén slechte score.

const STANDEN = {
  sterk:     { kleur: C.groen,  tekst: "gaat al heel goed",          emoji: "🌟" },
  gemiddeld: { kleur: C.geel,   tekst: "bijna onder de knie",        emoji: "👍" },
  oefenen:   { kleur: "#B45309", tekst: "hier kun je nog op oefenen", emoji: "💪" },
  nieuw:     { kleur: C.rand,   tekst: "nog niet geoefend",          emoji: "✨" },
};

// Wanneer komt deze categorie weer aan bod? In kindertaal, niet in datums.
function herhaalTekst(volgendeHerhaling, nu) {
  if (volgendeHerhaling == null) return null;
  const delta = volgendeHerhaling - nu;
  if (delta <= 0) return "staat nu klaar";
  const uren = Math.round(delta / (60 * 60 * 1000));
  if (uren < 24) return `over ${Math.max(1, uren)} uur`;
  const dagen = Math.round(uren / 24);
  return `over ${dagen} ${dagen === 1 ? "dag" : "dagen"}`;
}

function CategorieRegel({ regel, nu, font, dyslexie }) {
  const stand = STANDEN[regel.stand];
  const pct = regel.sterkte == null ? 0 : Math.round(regel.sterkte * 100);
  const wanneer = herhaalTekst(regel.volgendeHerhaling, nu);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
        <span style={{ fontFamily: font, fontWeight: 800, fontSize: dyslexie ? 16 : 15, color: C.zwart }}>
          {stand.emoji} {regel.label}
        </span>
        {regel.rijp && (
          <span style={{
            background: C.geelLicht, border: `1px solid ${C.geel}`, borderRadius: 99,
            padding: "1px 9px", fontFamily: font, fontSize: 10, fontWeight: 700,
            color: "#92400E", whiteSpace: "nowrap",
          }}>
            aan de beurt
          </span>
        )}
      </div>
      <ProgressBar value={pct} max={100} kleur={stand.kleur} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 5 }}>
        <span style={{ fontFamily: font, fontSize: 12, color: C.grijs }}>
          {stand.tekst}
          {regel.pogingen > 0 && ` · ${regel.goed} van ${regel.pogingen} goed`}
        </span>
        {wanneer && !regel.rijp && (
          <span style={{ fontFamily: font, fontSize: 12, color: C.grijs, whiteSpace: "nowrap" }}>
            weer {wanneer}
          </span>
        )}
      </div>
      <div style={{ fontFamily: font, fontSize: 11, color: C.grijs, marginTop: 2, fontStyle: "italic" }}>
        bijvoorbeeld: {regel.voorbeeld}
      </div>
    </div>
  );
}

export default function Voortgangsoverzicht({ font, dyslexie, setDyslexie, onExit }) {
  const [nu] = useState(() => Date.now());
  const [voortgang, setVoortgang] = useState(() => leesVoortgang());

  const regels = categorieStatus(voortgang, nu);
  // Sterkste bovenaan (dat mag gevierd worden), nog niet geoefend onderaan.
  const gesorteerd = [...regels].sort((a, b) => {
    if ((a.sterkte == null) !== (b.sterkte == null)) return a.sterkte == null ? 1 : -1;
    return (b.sterkte ?? 0) - (a.sterkte ?? 0);
  });

  const geoefend = regels.filter((r) => r.pogingen > 0);
  const sterk = regels.filter((r) => r.stand === "sterk").length;
  const totaalPogingen = geoefend.reduce((s, r) => s + r.pogingen, 0);

  function wisVoortgang() {
    const zeker = window.confirm(
      "Weet je het zeker? Je oefengeschiedenis op dit apparaat wordt dan gewist."
    );
    if (zeker) setVoortgang(resetVoortgang());
  }

  return (
    <div style={{ minHeight: "100vh", background: C.creme, fontFamily: font }}>
      <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
        <button onClick={onExit} style={{
          background: "none", border: "none", color: C.grijs, fontFamily: font,
          fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 12,
        }}>
          ← Terug naar menu
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>📊</div>
          <h1 style={{ fontFamily: font, fontWeight: 800, fontSize: 26, color: C.zwart, margin: "8px 0" }}>
            Jouw spellingkaart
          </h1>
          <p style={{ fontFamily: font, color: C.grijs, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Elke soort woord krijgt zijn eigen balkje. Hoe verder het balkje, hoe beter die
            spellingregel al lukt.
          </p>
        </div>

        {totaalPogingen === 0 ? (
          <Kaart style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <p style={{ fontFamily: font, fontWeight: 800, fontSize: 17, color: C.zwart, margin: "0 0 6px" }}>
              Nog een leeg kaartje
            </p>
            <p style={{ fontFamily: font, color: C.grijs, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Zodra je je eerste flitswoorden hebt geoefend, verschijnt hier per soort woord
              een balkje. Dan zie je meteen waar je sterk in bent.
            </p>
          </Kaart>
        ) : (
          <>
            <Kaart style={{ padding: "18px 20px", marginBottom: 14 }}>
              <p style={{ fontFamily: font, fontSize: 14, color: C.zwart, margin: 0, lineHeight: 1.6 }}>
                Je oefende al <strong>{totaalPogingen}</strong>{" "}
                {totaalPogingen === 1 ? "woord" : "woorden"} in{" "}
                <strong>{geoefend.length}</strong>{" "}
                {geoefend.length === 1 ? "soort" : "soorten"} woorden.
                {sterk > 0 && (
                  <>
                    {" "}Daarvan {sterk === 1 ? "gaat er al 1" : `gaan er al ${sterk}`} heel goed 🌟
                  </>
                )}
              </p>
            </Kaart>

            <Kaart>
              {gesorteerd.map((regel) => (
                <CategorieRegel key={regel.sleutel} regel={regel} nu={nu} font={font} dyslexie={dyslexie} />
              ))}
              <p style={{ fontFamily: font, fontSize: 12, color: C.grijs, lineHeight: 1.6,
                margin: "4px 0 0", paddingTop: 12, borderTop: `1px solid ${C.rand}` }}>
                "Aan de beurt" betekent dat die soort woorden tijdens je volgende sessie extra
                vaak langskomt. De app plant dat zelf, net voordat je het dreigt te vergeten.
              </p>
            </Kaart>

            <button onClick={wisVoortgang} style={{
              background: "none", border: "none", color: C.grijs, fontFamily: font,
              fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "8px 0",
              display: "block", margin: "0 auto", textDecoration: "underline",
            }}>
              Oefengeschiedenis wissen
            </button>
          </>
        )}
      </div>
      <Footer font={font} />
    </div>
  );
}
