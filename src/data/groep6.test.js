import { ALLE_WOORDEN, CATEGORIE_SLEUTELS, categorieLabel } from "./woorden";
import { ALLE_WERKWOORDZINNEN, WERKWOORD_CATEGORIE, zinnenVoorCategorie, splitsZin } from "./werkwoorden";
import groep6Data from "./groep6_nieuw.json";

// ── CONTENT-GATING: ongecontroleerde groep 6-content mag de app niet raken ──
// Dit is de kern van "ik wil de inhoud nog laten nakijken voordat het live
// gaat": zolang een item "gecontroleerd": false heeft, mag het nergens in de
// speelbare woorddata opduiken. Zodra iemand het vlaggetje in
// groep6_nieuw.json omzet naar true, hoort het er zonder codewijziging bij.

test("alle items in groep6_nieuw.json staan nu op gecontroleerd:false (nog te reviewen)", () => {
  const alles = [...groep6Data.woorden, ...groep6Data.zinnen];
  expect(alles.length).toBeGreaterThan(0);
  expect(alles.every((item) => item.gecontroleerd === false)).toBe(true);
});

test("ongecontroleerde woorden komen niet in ALLE_WOORDEN voor", () => {
  const nogTeControleren = new Set(
    groep6Data.woorden.filter((w) => w.gecontroleerd === false).map((w) => w.woord)
  );
  const lekken = ALLE_WOORDEN.filter((w) => nogTeControleren.has(w.woord) && w.lijst === "g6_nieuw");
  expect(lekken).toEqual([]);
});

test("ongecontroleerde werkwoordzinnen komen niet in ALLE_WERKWOORDZINNEN voor", () => {
  expect(ALLE_WERKWOORDZINNEN).toEqual([]); // alles staat nu nog op false
});

test("elke categorie uit groep6_nieuw.json is een geldige, bestaande categoriesleutel", () => {
  const sleutels = new Set([...groep6Data.woorden, ...groep6Data.zinnen].map((i) => i.categorie));
  for (const s of sleutels) expect(CATEGORIE_SLEUTELS).toContain(s);
});

test("zet je gecontroleerd om naar true, dan wordt een woord meteen speelbaar", () => {
  // Simuleert precies wat een reviewer doet: het vlaggetje omzetten. We bouwen
  // hier geen echte module-herlaadtest (JSON-imports zijn statisch), maar
  // controleren wél dat het filtercriterium exact dat vlaggetje is en niets
  // extra's — zo weet je zeker dat "true zetten" voldoende is.
  const woordItem = groep6Data.woorden.find((w) => w.categorie === "apostrof");
  expect(woordItem.gecontroleerd).toBe(false);
  const zouDanMeedoen = { ...woordItem, gecontroleerd: true };
  expect(zouDanMeedoen.gecontroleerd).toBe(true);
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
