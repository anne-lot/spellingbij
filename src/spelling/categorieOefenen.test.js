import { kiesCategorieSessie } from "./woordkeuze";
import { registreerPoging } from "./voortgang";
import { woordenVoorCategorie, CATEGORIE_SLEUTELS } from "../data/woorden";

const UUR = 60 * 60 * 1000;

function metPogingen(pogingen, start = 1_000_000) {
  let data = { versie: 1, categorieen: {}, logboek: [] };
  pogingen.forEach(([woord, categorie, correct, offsetUur = 0]) => {
    data = registreerPoging({ woord, categorie, correct, nu: start + offsetUur * UUR }, data);
  });
  return data;
}

// Categorieën die bewust (nog) geen woorden hebben: "ie-als-i" wacht op eigen
// (nog te bepalen) voorbeeldwoorden, en "werkwoord-tegenwoordige-tijd" is
// geen woord-categorie maar een zin-categorie (zie src/data/werkwoorden.js)
// en komt dus per definitie niet in woordenVoorCategorie voor.
const NOG_GEEN_WOORDEN = ["ie-als-i", "werkwoord-tegenwoordige-tijd"];

describe("woordenVoorCategorie", () => {
  test("geeft voor elke categorie met woorden een niet-lege, gedupliceerde lijst", () => {
    for (const sleutel of CATEGORIE_SLEUTELS) {
      if (NOG_GEEN_WOORDEN.includes(sleutel)) continue;
      const woorden = woordenVoorCategorie(sleutel);
      expect(woorden.length).toBeGreaterThan(0);
      expect(woorden.every((w) => w.categorie === sleutel)).toBe(true);
      expect(new Set(woorden.map((w) => w.woord)).size).toBe(woorden.length);
    }
  });

  test("categorieën die nog op review wachten zijn (nu nog) leeg, niet kapot", () => {
    for (const sleutel of NOG_GEEN_WOORDEN) {
      expect(woordenVoorCategorie(sleutel)).toEqual([]);
    }
  });
});

describe("kiesCategorieSessie", () => {
  const lijst = [
    { woord: "trein", categorie: "ei-ij" },
    { woord: "klein", categorie: "ei-ij" },
    { woord: "wijn", categorie: "ei-ij" },
    { woord: "altijd", categorie: "ei-ij" },
    { woord: "blijven", categorie: "ei-ij" },
  ];

  test("geeft een lege sessie bij een lege lijst", () => {
    expect(kiesCategorieSessie({ logboek: [] }, [], 10)).toEqual([]);
  });

  test("wordt niet langer dan de beschikbare woorden, ook als 'aantal' groter is", () => {
    const sessie = kiesCategorieSessie({ logboek: [] }, lijst, 10);
    expect(sessie).toHaveLength(lijst.length);
    expect(new Set(sessie.map((w) => w.woord)).size).toBe(lijst.length);
  });

  test("woorden die nog fout staan komen vóór nieuwe woorden, die weer vóór beheerste woorden (C1/C2)", () => {
    const data = metPogingen([
      ["trein", "ei-ij", true, 0],      // al beheerst, langst geleden (ts het kleinst)
      ["klein", "ei-ij", true, 1],      // al beheerst, meer recent
      ["wijn", "ei-ij", false, 2],      // staat nog fout
      // "altijd" en "blijven": nooit geoefend -> nieuw
    ]);
    const sessie = kiesCategorieSessie(data, lijst, 5);
    expect(sessie[0].woord).toBe("wijn");                       // fout: eerst
    expect(["altijd", "blijven"]).toContain(sessie[1].woord);   // dan nieuw
    expect(["altijd", "blijven"]).toContain(sessie[2].woord);
    // pas daarna de al beheerste woorden, langst geleden geoefend eerst
    expect(sessie[3].woord).toBe("trein");
    expect(sessie[4].woord).toBe("klein");
  });

  test("alleen fout èn nieuw is al genoeg om de gevraagde 'aantal' te vullen", () => {
    const data = metPogingen([["wijn", "ei-ij", false]]);
    const sessie = kiesCategorieSessie(data, lijst, 3);
    expect(sessie).toHaveLength(3);
    expect(sessie.map((w) => w.woord)).toContain("wijn");
  });

  test("een vervangbare randomfunctie maakt de volgorde binnen 'nieuw' deterministisch", () => {
    const vast = () => 0.01;
    const a = kiesCategorieSessie({ logboek: [] }, lijst, 5, { random: vast });
    const b = kiesCategorieSessie({ logboek: [] }, lijst, 5, { random: vast });
    expect(a.map((w) => w.woord)).toEqual(b.map((w) => w.woord));
  });
});
