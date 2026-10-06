import { ALLE_WOORDEN, CATEGORIE_SLEUTELS, categorieLabel } from "./woorden";
import { ALLE_WERKWOORDZINNEN, WERKWOORD_CATEGORIE, zinnenVoorCategorie, splitsZin } from "./werkwoorden";
import groep6Data from "./groep6_nieuw.json";

// ── CONTENT-GATING: ongecontroleerde groep 6-content mag de app niet raken ──
// Dit is de kern van "ik wil de inhoud nog laten nakijken voordat het live
// gaat": zolang een item "gecontroleerd": false heeft, mag het nergens in de
// speelbare woorddata opduiken. Zodra iemand het vlaggetje in
// groep6_nieuw.json omzet naar true, hoort het er zonder codewijziging bij.
//
// De inhoud van groep6_nieuw.json is per 2026-10 nagekeken en op true gezet
// (zie het commit-bericht); de mechanisme-test hieronder draait daarom op een
// losse, bewust-gemengde fixture in plaats van op de live inhoud van het
// bestand — zo blijft deze test ook beschermen tegen een toekomstig nieuw
// item dat per ongeluk zonder review meeloopt, onafhankelijk van wat er op
// dit moment in groep6_nieuw.json staat.
jest.mock("./groep6_nieuw.json", () => ({
  _toelichting: {},
  woorden: [
    { categorie: "apostrof", woord: "GECONTROLEERD_FIXTURE", juisteVorm: "GECONTROLEERD_FIXTURE", gecontroleerd: true },
    { categorie: "apostrof", woord: "NOG_NIET_FIXTURE", juisteVorm: "NOG_NIET_FIXTURE", gecontroleerd: false },
  ],
  zinnen: [
    { categorie: "werkwoord-tegenwoordige-tijd", zin: "Ik ___ fixture.", juisteVorm: "fix", gecontroleerd: true },
    { categorie: "werkwoord-tegenwoordige-tijd", zin: "Jij ___ fixture.", juisteVorm: "fixt", gecontroleerd: false },
  ],
}));

test("alleen items met gecontroleerd:true komen in ALLE_WOORDEN terecht", () => {
  expect(ALLE_WOORDEN.some((w) => w.woord === "GECONTROLEERD_FIXTURE")).toBe(true);
  expect(ALLE_WOORDEN.some((w) => w.woord === "NOG_NIET_FIXTURE")).toBe(false);
});

test("alleen zinnen met gecontroleerd:true komen in ALLE_WERKWOORDZINNEN terecht", () => {
  expect(ALLE_WERKWOORDZINNEN.some((z) => z.juisteVorm === "fix")).toBe(true);
  expect(ALLE_WERKWOORDZINNEN.some((z) => z.juisteVorm === "fixt")).toBe(false);
});

describe("werkwoorden.js", () => {
  test("splitsZin knipt de zin bij het gat", () => {
    expect(splitsZin("Ik ___ naar school.")).toEqual(["Ik ", " naar school."]);
    expect(splitsZin("geen gat hier")).toEqual(["geen gat hier", ""]);
  });

  test("zinnenVoorCategorie geeft alleen zinnen van die categorie terug", () => {
    expect(zinnenVoorCategorie(WERKWOORD_CATEGORIE)).toEqual(ALLE_WERKWOORDZINNEN);
    expect(zinnenVoorCategorie("niet-bestaand")).toEqual([]);
  });
});

test("de nieuwe categoriesleutels hebben allemaal een label", () => {
  for (const sleutel of [
    "onveranderlijke-woorden", "apostrof", "c-als-s-k", "leenwoorden-ge",
    "ie-als-i", "werkwoord-tegenwoordige-tijd",
  ]) {
    expect(categorieLabel(sleutel)).not.toBe(sleutel); // een echt label, geen fallback op de sleutel zelf
  }
});

test("'werkwoord-verleden-tijd' (t-kofschip) staat NIET in de actieve categorieën", () => {
  expect(CATEGORIE_SLEUTELS).not.toContain("werkwoord-verleden-tijd");
});

// Met de mock hierboven is groep6Data zelf ook de fixture — dus geen losse
// test meer op de live inhoud van het echte bestand in dit bestand. Die hoort
// (en staat) in src/spelling/categorieOefenen.test.js / zelfDoen.test.js, die
// via de echte, ongemockte ALLE_WOORDEN/ALLE_WERKWOORDZINNEN lopen.
test("de fixture zelf gebruikt alleen bestaande categoriesleutels (sanity check op de mock)", () => {
  const sleutels = new Set([...groep6Data.woorden, ...groep6Data.zinnen].map((i) => i.categorie));
  for (const s of sleutels) expect(CATEGORIE_SLEUTELS).toContain(s);
});
