import { kiesZelfDoenRonde, ZELFDOEN_NIEUW_AANDEEL, kiesWerkwoordSessie } from "./woordkeuze";
import { registreerPoging } from "./voortgang";
import { leesGeschiedenis, bewaarResultaat, GESCHIEDENIS_MAX } from "./zelfDoenGeschiedenis";
import { ALLE_WOORDEN } from "../data/woorden";

function metPogingen(pogingen) {
  let data = { versie: 1, categorieen: {}, logboek: [] };
  pogingen.forEach(([woord, categorie, correct]) => {
    data = registreerPoging({ woord, categorie, correct }, data);
  });
  return data;
}

describe("kiesZelfDoenRonde", () => {
  const woorden = [
    { woord: "trein", categorie: "ei-ij" },
    { woord: "klein", categorie: "ei-ij" },
    { woord: "wijn", categorie: "ei-ij" },
    { woord: "rijden", categorie: "ei-ij" },
    { woord: "goud", categorie: "au-ou" },
    { woord: "koud", categorie: "au-ou" },
  ];

  test("geeft niets terug als er nog geen enkele categorie geoefend is", () => {
    const leeg = { versie: 1, categorieen: {}, logboek: [] };
    expect(kiesZelfDoenRonde(leeg, woorden, { aantal: 20 })).toEqual([]);
  });

  test("gebruikt alleen woorden uit categorieën met minstens 1 poging (D1)", () => {
    const data = metPogingen([["trein", "ei-ij", true]]); // au-ou blijft ongeoefend
    const ronde = kiesZelfDoenRonde(data, woorden, { aantal: 20 });
    expect(ronde.every((w) => w.categorie === "ei-ij")).toBe(true);
    expect(ronde.length).toBeGreaterThan(0);
  });

  test("wordt niet langer dan het aantal beschikbare woorden in geoefende categorieën", () => {
    const data = metPogingen([["trein", "ei-ij", true]]);
    const ronde = kiesZelfDoenRonde(data, woorden, { aantal: 20 });
    // Alleen de 4 ei-ij-woorden komen in aanmerking (au-ou is niet geoefend).
    expect(ronde.length).toBe(4);
    expect(new Set(ronde.map((w) => w.woord)).size).toBe(4);
  });

  test("mixt gezien en nieuw volgens het aandeel, met terugval bij een tekort (D2)", () => {
    // Twintig woorden, 15 al eens gezien, 5 nog nooit -> precies het aandeel.
    const grotePool = Array.from({ length: 20 }, (_, i) => ({ woord: `w${i}`, categorie: "ei-ij" }));
    const gezienPogingen = grotePool.slice(0, 15).map((w) => [w.woord, "ei-ij", true]);
    const data = metPogingen(gezienPogingen);

    const ronde = kiesZelfDoenRonde(data, grotePool, { aantal: 20 });
    const gezienWoorden = new Set(gezienPogingen.map((p) => p[0]));
    const aantalNieuw = ronde.filter((w) => !gezienWoorden.has(w.woord)).length;
    expect(ronde).toHaveLength(20);
    expect(aantalNieuw).toBe(Math.round(20 * ZELFDOEN_NIEUW_AANDEEL)); // precies 5 beschikbaar
  });

  test("vult het tekort aan nieuwe woorden op met gezien woorden (D2)", () => {
    // Alle 6 woorden al eens gezien -> geen nieuwe woorden beschikbaar, maar de
    // ronde moet toch zo dicht mogelijk bij `aantal` komen.
    const data = metPogingen(woorden.map((w) => [w.woord, w.categorie, true]));
    const ronde = kiesZelfDoenRonde(data, woorden, { aantal: 20 });
    expect(ronde).toHaveLength(woorden.length);
  });

  test("een vervangbare randomfunctie maakt de ronde deterministisch", () => {
    const data = metPogingen([["trein", "ei-ij", true], ["goud", "au-ou", false]]);
    const vast = () => 0.37;
    const a = kiesZelfDoenRonde(data, woorden, { aantal: 20, random: vast });
    const b = kiesZelfDoenRonde(data, woorden, { aantal: 20, random: vast });
    expect(a.map((w) => w.woord)).toEqual(b.map((w) => w.woord));
  });

  test("werkt met de echte woordenlijst zonder te crashen", () => {
    const data = metPogingen([["trein", "ei-ij", true], ["goud", "au-ou", false]]);
    const ronde = kiesZelfDoenRonde(data, ALLE_WOORDEN, { aantal: 20 });
    expect(ronde.length).toBeGreaterThan(0);
    expect(ronde.every((w) => ["ei-ij", "au-ou"].includes(w.categorie))).toBe(true);
  });
});

describe("zelfDoenGeschiedenis", () => {
  const OPSLAG_KEY = "spellingbij_zelfdoen_geschiedenis_v1";
  beforeEach(() => localStorage.removeItem(OPSLAG_KEY));

  test("begint leeg", () => {
    expect(leesGeschiedenis()).toEqual([]);
  });

  test("bewaart een resultaat en leest het terug", () => {
    bewaarResultaat({ ts: 1, totaal: 20, goed: 14, categorieen: ["ei-ij"] });
    expect(leesGeschiedenis()).toEqual([{ ts: 1, totaal: 20, goed: 14, categorieen: ["ei-ij"] }]);
  });

  test("bewaart maar de laatste GESCHIEDENIS_MAX resultaten", () => {
    for (let i = 0; i < GESCHIEDENIS_MAX + 5; i++) {
      bewaarResultaat({ ts: i, totaal: 20, goed: i, categorieen: [] });
    }
    const geschiedenis = leesGeschiedenis();
    expect(geschiedenis).toHaveLength(GESCHIEDENIS_MAX);
    expect(geschiedenis[0].ts).toBe(5); // de oudste 5 zijn verdwenen
    expect(geschiedenis[geschiedenis.length - 1].ts).toBe(GESCHIEDENIS_MAX + 4);
  });
});

describe("kiesWerkwoordSessie", () => {
  const zinnen = [
    { zin: "Ik ___ naar school.", juisteVorm: "loop", categorie: "werkwoord-tegenwoordige-tijd" },
    { zin: "Jij ___ hard.", juisteVorm: "loopt", categorie: "werkwoord-tegenwoordige-tijd" },
    { zin: "Wij ___ samen.", juisteVorm: "lopen", categorie: "werkwoord-tegenwoordige-tijd" },
  ];

  test("geeft een lege sessie bij een lege lijst", () => {
    expect(kiesWerkwoordSessie({ logboek: [] }, [], 10)).toEqual([]);
  });

  test("zet de zin met een laatst-foute vorm vooraan", () => {
    const data = metPogingen([["loopt", "werkwoord-tegenwoordige-tijd", false]]);
    const sessie = kiesWerkwoordSessie(data, zinnen, 3);
    expect(sessie[0].juisteVorm).toBe("loopt");
  });

  test("wordt niet langer dan het aantal beschikbare zinnen", () => {
    const sessie = kiesWerkwoordSessie({ logboek: [] }, zinnen, 10);
    expect(sessie).toHaveLength(3);
  });
});
