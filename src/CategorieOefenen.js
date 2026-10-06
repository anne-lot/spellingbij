import { useState, useCallback } from "react";
import { C, Header, Footer } from "./theme";
import { CATEGORIE_SLEUTELS, categorieLabel, categorieVoorbeeldWoorden, categorieGroep, woordenVoorCategorie } from "./data/woorden";
import { WERKWOORD_CATEGORIE, zinnenVoorCategorie } from "./data/werkwoorden";
import { leesVoortgang } from "./spelling/voortgang";
import { kiesCategorieSessie, kiesWerkwoordSessie } from "./spelling/woordkeuze";
import OefenSessie, { terugKnop } from "./OefenSessie";
import WerkwoordOefening from "./WerkwoordOefening";

// ── CATEGORIE OEFENEN ─────────────────────────────────────────────────────────
// Een kind (of ouder) kiest zelf één spellingcategorie en oefent daar gericht
// op, los van de groepsindeling. De flits/invoer/feedback/klaar-flow komt uit
// OefenSessie.js (gedeeld met Flitswoorden); dit bestand regelt alleen het
// keuzescherm en de woordselectie binnen de gekozen categorie.
//
// Woordselectie: kiesCategorieSessie (src/spelling/woordkeuze.js) geeft eerst
// woorden die nog fout staan, dan nog onbeoefende woorden, dan de rest op
// basis van "langst niet gezien" — allemaal op basis van de bestaande
// voortgangsdata in localStorage (dezelfde als het categorie-overzicht).
// ─────────────────────────────────────────────────────────────────────────────

const SESSIE_LENGTE = 10;

// Eén voorbeeldwoord, met het stukje dat de regel laat zien dikgedrukt en
// gelig gemarkeerd (bv. de e in "lade"). Zonder "nadruk" (samenstellingen,
// onregelmatige woorden) gewoon het woord zelf — die hebben geen klankregel
// om uit te lichten, dat is precies hun eigenschap.
function WoordMetNadruk({ woord, nadruk, font, fontSize }) {
  const stijl = { fontFamily: font, fontWeight: 700, fontSize, color: C.zwart };
  const i = nadruk ? woord.toLowerCase().indexOf(nadruk.toLowerCase()) : -1;
  if (i === -1) return <span style={stijl}>{woord}</span>;
  return (
    <span style={stijl}>
      {woord.slice(0, i)}
      <span style={{ fontWeight: 800, background: C.geelMid, borderRadius: 5, padding: "0 2px" }}>
        {woord.slice(i, i + nadruk.length)}
      </span>
      {woord.slice(i + nadruk.length)}
    </span>
  );
}

export default function CategorieOefenen({ font, dyslexie, setDyslexie, onExit, onVoortgang }) {
  const [stap, setStap] = useState("keuze"); // keuze | sessie
  const [categorie, setCategorie] = useState(null);
  const [woorden, setWoorden] = useState([]);
  const [sessieNummer, setSessieNummer] = useState(0);
  const isWerkwoordCategorie = categorie === WERKWOORD_CATEGORIE;

  const nieuweSessie = useCallback((sleutel) => {
    setCategorie(sleutel);
    if (sleutel === WERKWOORD_CATEGORIE) {
      // Werkwoordzinnen zijn geen "woorden": andere bron, ander selectie-
      // algoritme (zelfde fout/nieuw/langst-geleden-prioriteit, maar op basis
      // van de juiste vorm i.p.v. een los woord — zie woordkeuze.js).
      setWoorden(kiesWerkwoordSessie(leesVoortgang(), zinnenVoorCategorie(sleutel), SESSIE_LENGTE));
    } else {
      const pool = woordenVoorCategorie(sleutel);
      setWoorden(kiesCategorieSessie(leesVoortgang(), pool, SESSIE_LENGTE));
    }
    setSessieNummer((n) => n + 1);
    setStap("sessie");
  }, []);

  // ── SESSIE: werkwoordzinnen (itemvorm "zin met een gat") ──
  if (stap === "sessie" && isWerkwoordCategorie) {
    return (
      <WerkwoordOefening
        key={sessieNummer}
        font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
        titel={`Oefenen · ${categorieLabel(categorie)}`}
        zinnen={woorden}
        opnieuwLabel={`Nog een keer (${categorieLabel(categorie)})`}
        onOpnieuw={() => nieuweSessie(categorie)}
        andereLabel="Andere categorie"
        onAndere={() => setStap("keuze")}
        onVoortgang={onVoortgang}
        onExit={onExit}
      />
    );
  }

  // ── SESSIE: gewone woordcategorieën ──
  if (stap === "sessie" && categorie) {
    return (
      <OefenSessie
        key={sessieNummer}
        font={font} dyslexie={dyslexie} setDyslexie={setDyslexie}
        titel={`Oefenen · ${categorieLabel(categorie)}`}
        woorden={woorden}
        opnieuwLabel={`Nog een keer (${categorieLabel(categorie)})`}
        onOpnieuw={() => nieuweSessie(categorie)}
        andereLabel="Andere categorie"
        onAndere={() => setStap("keuze")}
        onVoortgang={onVoortgang}
        onExit={onExit}
        // Binnen deze sessie is de categorie al bekend (je koos 'm zelf), dus
        // de "ze horen bij ..."-regel aan het eind zou alleen herhalen wat je
        // al weet.
        toonFoutCategorieHint={false}
      />
    );
  }

  // ── KEUZESCHERM ──
  // Kindvriendelijk opgezet: de woorden staan groot en bovenaan (met de letters
  // die de regel laten zien dikgedrukt en gemarkeerd), de naam van de regel
  // staat klein eronder — een kind herkent een categorie sneller aan "lade,
  // bode" dan aan het woord "Stomme e".
  const woordGrootte = dyslexie ? 25 : 22;

  return (
    <div style={{ minHeight: "100vh", background: C.creme, fontFamily: font }}>
      <Header dyslexie={dyslexie} setDyslexie={setDyslexie} font={font} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
        <button onClick={onExit} style={terugKnop(font)}>← Terug naar menu</button>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 4 }}>🎯</div>
          <h1 style={{ fontFamily: font, fontWeight: 800, fontSize: 28, color: C.zwart, margin: "8px 0" }}>
            Kies een categorie
          </h1>
          <p style={{ fontFamily: font, color: C.grijs, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Oefen gericht op één spellingregel. Jij kiest welke.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CATEGORIE_SLEUTELS.map((sleutel) => {
            const voorbeelden = categorieVoorbeeldWoorden(sleutel);
            const groep = categorieGroep(sleutel);
            return (
              <button key={sleutel} onClick={() => nieuweSessie(sleutel)} style={{
                background: C.wit, border: `1.5px solid ${C.rand}`, borderRadius: 18,
                padding: "16px 18px", textAlign: "left", cursor: "pointer",
                fontFamily: font, display: "block", width: "100%",
              }}>
                <span style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginBottom: 5 }}>
                  {voorbeelden.map((vw, i) => (
                    <WoordMetNadruk key={i} woord={vw.woord} nadruk={vw.nadruk} font={font} fontSize={woordGrootte} />
                  ))}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: C.grijs,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {categorieLabel(sleutel)}
                  </span>
                  {/* Geen apart groepskeuzescherm hier — categorieën gaan door
                      elkaar. Deze badge laat alleen zien dat het bij groep 6 hoort. */}
                  {groep && (
                    <span style={{
                      background: C.cremeMid, border: `1px solid ${C.rand}`, borderRadius: 99,
                      padding: "1px 8px", fontSize: 10, fontWeight: 700, color: C.grijs,
                    }}>
                      groep {groep}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <Footer font={font} />
    </div>
  );
}
