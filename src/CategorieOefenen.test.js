import { render, screen, fireEvent, act } from "@testing-library/react";
import CategorieOefenen from "./CategorieOefenen";
import { leesVoortgang, resetVoortgang, registreerPoging } from "./spelling/voortgang";
import { categorieLabel, categorieVoorbeeldWoorden } from "./data/woorden";

// Deze categorie wacht in de echte data nog op review (gecontroleerd:false in
// groep6_nieuw.json), dus mocken we 'm hier met al-"goedgekeurde" fixture-
// zinnen om de routing en integratie te testen los van die reviewstatus.
// Moet op het topniveau van de module staan: jest hoist jest.mock() alleen
// hierboven de imports als hij niet binnen een describe/test-callback staat.
jest.mock("./data/werkwoorden", () => ({
  WERKWOORD_CATEGORIE: "werkwoord-tegenwoordige-tijd",
  zinnenVoorCategorie: () => [
    { categorie: "werkwoord-tegenwoordige-tijd", zin: "Ik ___ naar school.", juisteVorm: "loop", strategie: "ik-vorm: stam." },
    { categorie: "werkwoord-tegenwoordige-tijd", zin: "Jij ___ hard.", juisteVorm: "loopt", strategie: "stam + t." },
  ],
  splitsZin: (zin) => {
    const i = zin.indexOf("___");
    return [zin.slice(0, i), zin.slice(i + 3)];
  },
}));

// Zelfde aanpak als Flitswoorden.test.js: requestAnimationFrame direct laten
// aflopen zodat de flits niet een paar seconden duurt in de test.
let frames = [];
beforeEach(() => {
  resetVoortgang();
  frames = [];
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const props = { font: "sans-serif", dyslexie: false, setDyslexie: () => {}, onExit: () => {} };

function laatFlitsAflopen() {
  act(() => {
    const open = frames;
    frames = [];
    open.forEach((cb) => cb(performance.now() + 60_000));
  });
}
function geflitstWoord() {
  return screen.getByText(/Kijk goed/).nextElementSibling.textContent.trim();
}
function typ(tekst) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: tekst } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
}

test("keuzescherm toont de voorbeeldwoorden groot en de categorienaam klein, zonder voortgangsindicator", () => {
  const { container } = render(<CategorieOefenen {...props} />);
  expect(screen.getByText("Kies een categorie")).toBeInTheDocument();

  // De categorienaam staat er nog (klein, als caption)...
  const naam = screen.getByText(categorieLabel("ei-ij"));
  expect(naam).toBeInTheDocument();
  // ...maar de knop toont de voorbeeldwoorden zelf vóór die naam, en groter.
  const knop = naam.closest("button");
  const [trein, rijden] = categorieVoorbeeldWoorden("ei-ij");
  expect(knop.textContent).toContain(trein.woord);
  expect(knop.textContent).toContain(rijden.woord);
  const naamStijl = window.getComputedStyle(naam);
  const woordStijl = window.getComputedStyle(container.querySelector(`button span[style*="font-weight: 700"]`));
  expect(parseInt(woordStijl.fontSize, 10)).toBeGreaterThan(parseInt(naamStijl.fontSize, 10));

  // Het stukje dat de regel laat zien (bv. "ei") is apart, vetgedrukt gemarkeerd.
  expect(knop.innerHTML).toContain(">ei<");

  // Geen sterren, geen "gaat al goed"-achtige tekst meer op het keuzescherm.
  expect(screen.queryByText(/nog niet geoefend/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/gaat al/i)).not.toBeInTheDocument();
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

test("een categorie kiezen start een sessie van woorden uit precies die categorie", () => {
  render(<CategorieOefenen {...props} />);
  fireEvent.click(screen.getByText(categorieLabel("ei-ij")));

  expect(screen.getByText(/Oefenen · ei\/ij/)).toBeInTheDocument();
  const doelwoord = geflitstWoord();

  laatFlitsAflopen();
  typ(doelwoord);
  expect(screen.getByText(/Goed zo/i)).toBeInTheDocument();

  const data = leesVoortgang();
  expect(data.logboek[0]).toMatchObject({ woord: doelwoord, categorie: "ei-ij", correct: true });
});

test("een fout woord uit de vorige sessie staat vooraan bij de volgende keuze van diezelfde categorie", () => {
  // Zet alvast een foute poging voor een woord uit au-ou.
  registreerPoging({ woord: "goud", categorie: "au-ou", correct: false, getypt: "gout" });

  render(<CategorieOefenen {...props} />);
  fireEvent.click(screen.getByText(categorieLabel("au-ou")));
  expect(geflitstWoord()).toBe("goud");
});

test("sessie van 10 woorden bevat alleen woorden uit de gekozen categorie, geen dubbelen", () => {
  render(<CategorieOefenen {...props} />);
  fireEvent.click(screen.getByText(categorieLabel("samenstelling")));

  const gezien = [];
  for (let i = 0; i < 10; i++) {
    gezien.push(geflitstWoord());
    laatFlitsAflopen();
    typ("zzzzzz");
    const volgende = screen.queryByText(/Volgende woord/i);
    if (volgende) fireEvent.click(volgende);
  }
  expect(new Set(gezien).size).toBe(gezien.length);
  const categorieen = new Set(leesVoortgang().logboek.map((r) => r.categorie));
  expect(categorieen).toEqual(new Set(["samenstelling"]));
});

test("klaarscherm toont een vriendelijke samenvatting en knoppen om door te gaan", () => {
  render(<CategorieOefenen {...props} />);
  fireEvent.click(screen.getByText(categorieLabel("verscherping")));

  for (let i = 0; i < 10; i++) {
    const opnieuw = screen.queryByText(/Welk woord zag je/i);
    if (!opnieuw) laatFlitsAflopen();
    typ("zzzzzz");
    const volgende = screen.queryByText(/Volgende woord/i);
    if (volgende) fireEvent.click(volgende);
  }

  expect(screen.getByText(/Sessie klaar/i)).toBeInTheDocument();
  expect(screen.getByText(/Nog een keer \(b\/p en d\/t aan het eind\)/i)).toBeInTheDocument();
  expect(screen.getByText("Andere categorie")).toBeInTheDocument();
  // Geen categorie-herhaling van de "ze horen bij"-zin: die categorie was al bekend.
  expect(screen.queryByText(/horen bij/i)).not.toBeInTheDocument();
});

describe("werkwoordcategorie (itemvorm 'zin met een gat')", () => {
  // Deze categorie wacht in de echte data nog op review (gecontroleerd:false),
  // dus mocken we 'm hier met al-"goedgekeurde" fixture-zinnen om de routing
  // en integratie te testen los van de inhoudelijke reviewstatus. (De
  // jest.mock hiervoor staat bovenaan het bestand — jest hoist 'm alleen als
  // hij op het topniveau van de module staat, niet binnen een describe.)
  test("kiezen van de werkwoordcategorie gaat naar de zin-met-gat-flow, niet naar flits-en-typ", () => {
    render(<CategorieOefenen {...props} />);
    fireEvent.click(screen.getByText(/Werkwoorden \(tegenwoordige tijd\)/i));

    // Zin-met-gat-flow: een zichtbaar gat en géén los geflitst woord.
    expect(screen.getByText(/Welk woord hoort in het gat/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kijk goed/i)).not.toBeInTheDocument();
  });
});

test("nieuwe groep 6-categorieën krijgen een 'groep 6'-label (er is geen apart groepskeuzescherm)", () => {
  render(<CategorieOefenen {...props} />);
  expect(screen.getAllByText("groep 6").length).toBeGreaterThan(0);
  // Een oorspronkelijke categorie (zonder groep-koppeling) krijgt geen badge.
  const eiIj = screen.getByText("ei/ij").closest("button");
  expect(eiIj.textContent).not.toMatch(/groep/i);
});
