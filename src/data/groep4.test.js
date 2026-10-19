import { ALLE_WOORDEN, CATEGORIE_SLEUTELS, categorieLabel, categorieGroep } from "./woorden";
import groep4Data from "./groep4_nieuw.json";

// ── CONTENT-GATING: zelfde mechanisme als src/data/groep6.test.js, maar dan
// voor de groep4_nieuw.json (M4-stof). Gebruikt een eigen gemockte fixture,
// onafhankelijk van de huidige (deels al goedgekeurde) staat van het echte
// bestand — zie groep6.test.js voor de uitleg waarom.
jest.mock("./groep4_nieuw.json", () => ({
  _toelichting: {},
  woorden: [
    { categorie: "be-ge-ver", woord: "GECONTROLEERD_FIXTURE", juisteVorm: "GECONTROLEERD_FIXTURE", gecontroleerd: true },
    { categorie: "be-ge-ver", woord: "NOG_NIET_FIXTURE", juisteVorm: "NOG_NIET_FIXTURE", gecontroleerd: false },
  ],
}));

test("alleen items met gecontroleerd:true komen in ALLE_WOORDEN terecht", () => {
  expect(ALLE_WOORDEN.some((w) => w.woord === "GECONTROLEERD_FIXTURE")).toBe(true);
  expect(ALLE_WOORDEN.some((w) => w.woord === "NOG_NIET_FIXTURE")).toBe(false);
});

test("de nieuwe groep4-categoriesleutels hebben allemaal een label en een groep-4-badge", () => {
  for (const sleutel of ["aai-ooi-oei", "eer-oor-eur", "eeuw-ieuw-uw", "be-ge-ver"]) {
    expect(categorieLabel(sleutel)).not.toBe(sleutel);
    expect(categorieGroep(sleutel)).toBe(4);
  }
});

test("de fixture zelf gebruikt alleen bestaande categoriesleutels (sanity check op de mock)", () => {
  const sleutels = new Set(groep4Data.woorden.map((i) => i.categorie));
  for (const s of sleutels) expect(CATEGORIE_SLEUTELS).toContain(s);
});
