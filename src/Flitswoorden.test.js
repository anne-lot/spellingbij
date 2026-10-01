import { render, screen, fireEvent, act } from "@testing-library/react";
import Flitswoorden from "./Flitswoorden";
import { leesVoortgang, resetVoortgang } from "./spelling/voortgang";
import { CATEGORIEEN } from "./data/woorden";

// De flitsfase telt af met requestAnimationFrame. We vangen de frames op zodat de
// test het woord eerst kan lezen en daarna het aftellen in één tik laat aflopen;
// zo hoeft de test niet een paar seconden te wachten.
let frames = [];

beforeEach(() => {
  resetVoortgang();
  frames = [];
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const props = { font: "sans-serif", dyslexie: false, setDyslexie: () => {}, onExit: () => {} };

// Het woord dat nu geflitst wordt (staat direct onder "Kijk goed…").
function geflitstWoord() {
  return screen.getByText(/Kijk goed/).nextElementSibling.textContent.trim();
}

function laatFlitsAflopen() {
  act(() => {
    const open = frames;
    frames = [];
    open.forEach((cb) => cb(performance.now() + 60_000));
  });
}

function typ(tekst) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: tekst } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
}

test("een foute poging wordt gekoppeld aan de categorie van het doelwoord", () => {
  render(<Flitswoorden {...props} />);
  fireEvent.click(screen.getByText("Groep 4"));

  const doelwoord = geflitstWoord();
  laatFlitsAflopen();
  typ("zzzzzz");

  // Feedbackscherm laat het verschil zien en benoemt de spellingcategorie.
  expect(screen.getByText(/Kijk goed naar het verschil/i)).toBeInTheDocument();
  expect(screen.getByText(doelwoord)).toBeInTheDocument();
  expect(screen.getByText(/Dit woord hoort bij/i)).toBeInTheDocument();

  // En de poging is per categorie geregistreerd.
  const data = leesVoortgang();
  expect(data.logboek).toHaveLength(1);
  expect(data.logboek[0]).toMatchObject({ woord: doelwoord, correct: false, getypt: "zzzzzz" });

  const categorie = data.logboek[0].categorie;
  expect(CATEGORIEEN[categorie]).toBeDefined();
  const stat = data.categorieen[categorie];
  expect(stat).toMatchObject({ pogingen: 1, fout: 1, niveau: 0 });
  // Bak 0 betekent: direct weer aan de beurt (aanname A5).
  expect(stat.volgendeHerhaling).toBe(stat.laatsteOefening);
});

test("een goede poging zet de categorie een Leitner-bak hoger", () => {
  render(<Flitswoorden {...props} />);
  fireEvent.click(screen.getByText("Groep 3"));

  const doelwoord = geflitstWoord();
  laatFlitsAflopen();
  typ(doelwoord);

  expect(screen.getByText(/Goed zo/i)).toBeInTheDocument();

  const data = leesVoortgang();
  expect(data.logboek).toHaveLength(1);
  expect(data.logboek[0]).toMatchObject({ woord: doelwoord, correct: true });

  const stat = data.categorieen[data.logboek[0].categorie];
  expect(stat).toMatchObject({ pogingen: 1, fout: 0, niveau: 1 });
  expect(stat.volgendeHerhaling).toBeGreaterThan(stat.laatsteOefening);
});

test("hoofdletters en spaties maken een goed antwoord niet fout", () => {
  render(<Flitswoorden {...props} />);
  fireEvent.click(screen.getByText("Groep 3"));

  const doelwoord = geflitstWoord();
  laatFlitsAflopen();
  typ(`  ${doelwoord.toUpperCase()} `);

  expect(screen.getByText(/Goed zo/i)).toBeInTheDocument();
  expect(leesVoortgang().logboek[0].correct).toBe(true);
});

test("een sessie bevat geen dubbele woorden en verdeelt over categorieën", () => {
  render(<Flitswoorden {...props} />);
  fireEvent.click(screen.getByText("Groep 5"));

  const gezien = [];
  for (let i = 0; i < 8; i++) {
    gezien.push(geflitstWoord());
    laatFlitsAflopen();
    typ("zzzzzz");
    fireEvent.click(screen.getByText(/Volgende woord/i));
  }

  expect(new Set(gezien).size).toBe(gezien.length);
  const categorieen = new Set(leesVoortgang().logboek.map((r) => r.categorie));
  expect(categorieen.size).toBeGreaterThanOrEqual(3);
});
