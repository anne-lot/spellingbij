import { render, screen, fireEvent, act } from "@testing-library/react";
import ZelfDoen from "./ZelfDoen";
import { resetVoortgang, registreerPoging, leesVoortgang } from "./spelling/voortgang";
import { leesGeschiedenis } from "./spelling/zelfDoenGeschiedenis";

// De echte werkwoordcontent staat nog op gecontroleerd:false (zie
// src/data/groep6_nieuw.json), dus ALLE_WERKWOORDZINNEN is normaal leeg. Hier
// doen we alsof er al goedgekeurde zinnen zijn, om het mengen van item-vormen
// (los woord vs. zin-met-gat) binnen één ronde te kunnen testen. Moet op het
// topniveau van de module staan — jest hoist jest.mock() alleen daar boven de
// imports, niet als hij binnen een describe/test-callback staat.
jest.mock("./data/werkwoorden", () => ({
  ALLE_WERKWOORDZINNEN: [
    { categorie: "werkwoord-tegenwoordige-tijd", zin: "Ik ___ naar school.", juisteVorm: "loop", strategie: "ik-vorm: stam." },
    { categorie: "werkwoord-tegenwoordige-tijd", zin: "Jij ___ hard.", juisteVorm: "loopt", strategie: "stam + t." },
  ],
  splitsZin: (zin) => {
    const i = zin.indexOf("___");
    return [zin.slice(0, i), zin.slice(i + 3)];
  },
}));

const OPSLAG_KEY_GESCHIEDENIS = "spellingbij_zelfdoen_geschiedenis_v1";

const props = { font: "sans-serif", dyslexie: false, setDyslexie: () => {}, onExit: () => {} };

beforeEach(() => {
  resetVoortgang();
  localStorage.removeItem(OPSLAG_KEY_GESCHIEDENIS);
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

function geeftGeenCategorieenGeoefend() {
  // Helper: zorg dat minstens één categorie wél geoefend is, zodat de intro
  // meteen een "Beginnen"-knop toont.
  registreerPoging({ woord: "trein", categorie: "ei-ij", correct: true });
  registreerPoging({ woord: "klein", categorie: "ei-ij", correct: true });
}

test("zonder enige geoefende categorie toont de intro een vriendelijke doorverwijzing, geen 'Beginnen'", () => {
  render(<ZelfDoen {...props} />);
  expect(screen.getByText("Zelf doen")).toBeInTheDocument();
  expect(screen.getByText(/Oefen eerst een paar woorden/i)).toBeInTheDocument();
  expect(screen.queryByText(/Beginnen/i)).not.toBeInTheDocument();
  // Nergens de woorden "toets", "Cito" of "proeftoets" — ook niet toevallig in een variant.
  expect(document.body.textContent).not.toMatch(/toets|cito/i);
});

test("na het oefenen van een categorie kan een ronde beginnen, zonder feedback per item", () => {
  geeftGeenCategorieenGeoefend();
  render(<ZelfDoen {...props} />);
  fireEvent.click(screen.getByText(/Beginnen/i));

  // "Kijk goed…" fase: het woord staat er, geen invoerveld, geen feedbacktekst.
  expect(screen.getByText(/Kijk goed/i)).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

  act(() => jest.advanceTimersByTime(3500));
  expect(screen.getByRole("textbox")).toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox"), { target: { value: "helemaal fout" } });
  fireEvent.click(screen.getByText(/Volgende/i));

  // Geen "Goed zo", geen rood, geen kruisje — gewoon door naar het volgende item.
  expect(screen.queryByText(/Goed zo/i)).not.toBeInTheDocument();
  expect(screen.queryByText("✗")).not.toBeInTheDocument();
  expect(screen.getByText(/Kijk goed/i)).toBeInTheDocument(); // volgend item, "toon"-fase
});

test("een volledige ronde werkt de categorie-voortgang bij en toont het resultaat met honingraat", () => {
  geeftGeenCategorieenGeoefend();
  render(<ZelfDoen {...props} />);
  fireEvent.click(screen.getByText(/Beginnen/i));

  // Alleen ei-ij is geoefend, dus de ronde bestaat uit de ei-ij-woorden (klein pool).
  let aantalItems = 0;
  while (screen.queryByText(/Kijk goed/i)) {
    aantalItems++;
    act(() => jest.advanceTimersByTime(3500));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "klein" } }); // soms goed, soms niet
    fireEvent.click(screen.getByText(/Volgende/i));
  }

  expect(aantalItems).toBeGreaterThan(0);
  expect(screen.getByText(/cellen met honing gevuld|cel met honing gevuld/i)).toBeInTheDocument();

  // Resultaten zijn in het bestaande categorie-voortgangsmodel terechtgekomen.
  const voortgang = leesVoortgang();
  expect(voortgang.logboek.length).toBeGreaterThanOrEqual(aantalItems + 2); // +2 uit geeftGeenCategorieenGeoefend

  // En de ronde staat in de kleine geschiedenis.
  const geschiedenis = leesGeschiedenis();
  expect(geschiedenis).toHaveLength(1);
  expect(geschiedenis[0].totaal).toBe(aantalItems);

  // Nergens "toets" of "Cito" op het resultaatscherm.
  expect(document.body.textContent).not.toMatch(/toets|cito/i);
});

test("'Nog een keer' start een nieuwe ronde vanaf het resultaatscherm", () => {
  geeftGeenCategorieenGeoefend();
  render(<ZelfDoen {...props} />);
  fireEvent.click(screen.getByText(/Beginnen/i));
  while (screen.queryByText(/Kijk goed/i)) {
    act(() => jest.advanceTimersByTime(3500));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "klein" } });
    fireEvent.click(screen.getByText(/Volgende/i));
  }
  fireEvent.click(screen.getByText("Nog een keer"));
  expect(screen.getByText(/Kijk goed/i)).toBeInTheDocument();
});

describe("Zelf doen met werkwoordzinnen gemengd door de woorden", () => {
  // Alleen de werkwoordcategorie is hier "geoefend" (via de registreerPoging
  // hieronder), dus kiesZelfDoenRonde kan alleen uit de 2 gemockte zinnen
  // putten — dat maakt dit scenario deterministisch te testen.
  // Welke van de 2 gemockte zinnen nu in beeld staat, en het juiste antwoord
  // daarbij — nodig omdat kiesZelfDoenRonde de volgorde schudt (D4), dus welke
  // zin eerst komt is niet voorspelbaar.
  function huidigeJuisteVorm() {
    if (screen.queryByText(/naar school/i)) return "loop";
    if (screen.queryByText(/hard\./i)) return "loopt";
    return null;
  }

  test("een zin-item toont meteen het gat (geen flits-fase), zonder feedback, en telt mee in het resultaat", () => {
    registreerPoging({ woord: "loop", categorie: "werkwoord-tegenwoordige-tijd", correct: true });
    render(<ZelfDoen {...props} />);
    fireEvent.click(screen.getByText(/Beginnen/i));

    // Meteen het gat, geen "Kijk goed…"-flitsfase.
    expect(screen.getByText(/Welk woord hoort in het gat/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kijk goed/i)).not.toBeInTheDocument();

    const eersteVorm = huidigeJuisteVorm();
    expect(eersteVorm).not.toBeNull();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: eersteVorm } });
    fireEvent.click(screen.getByText(/Volgende/i));
    // Geen feedback op het scherm na dit antwoord, ook niet na een goed antwoord.
    expect(screen.queryByText(/Goed zo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stam/i)).not.toBeInTheDocument();

    // Tweede (en laatste) zin, dan het resultaatscherm.
    expect(screen.getByText(/Welk woord hoort in het gat/i)).toBeInTheDocument();
    const tweedeVorm = huidigeJuisteVorm();
    expect(tweedeVorm).not.toBe(eersteVorm);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: tweedeVorm } });
    fireEvent.click(screen.getByText(/Volgende/i));

    expect(screen.getByText(/cel met honing gevuld|cellen met honing gevuld/i)).toBeInTheDocument();
    const data = leesVoortgang();
    // De voorbereidende registreerPoging ("loop") + de 2 goed beantwoorde
    // items uit de ronde zelf (we typten steeds het juiste antwoord).
    const correcteWoorden = data.logboek
      .filter((r) => r.categorie === "werkwoord-tegenwoordige-tijd" && r.correct === true)
      .map((r) => r.woord);
    expect(correcteWoorden).toEqual(expect.arrayContaining(["loop", "loopt"]));
  });
});
