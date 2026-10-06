import { render, screen, fireEvent, act } from "@testing-library/react";
import WerkwoordOefening from "./WerkwoordOefening";
import { leesVoortgang, resetVoortgang } from "./spelling/voortgang";

beforeEach(() => resetVoortgang());

const ZINNEN = [
  {
    categorie: "werkwoord-tegenwoordige-tijd", zin: "Ik ___ naar school.",
    infinitief: "lopen", onderwerp: "ik", juisteVorm: "loop",
    strategie: "ik-vorm: gewoon de stam, zonder extra letter.",
  },
  {
    categorie: "werkwoord-tegenwoordige-tijd", zin: "Jij ___ hard.",
    infinitief: "lopen", onderwerp: "jij", juisteVorm: "loopt",
    strategie: "jij/hij/zij/het: stam + t.",
  },
];

const props = {
  font: "sans-serif", dyslexie: false, setDyslexie: () => {},
  titel: "Oefenen · Werkwoorden", zinnen: ZINNEN,
  onAndere: () => {}, onExit: () => {},
};

test("toont de zin met een zichtbaar gat, niet het hele antwoord", () => {
  render(<WerkwoordOefening {...props} />);
  expect(screen.getByText(/Ik/)).toBeInTheDocument();
  expect(screen.getByText(/naar school/)).toBeInTheDocument();
  expect(screen.queryByText("loop")).not.toBeInTheDocument(); // nog niet verklapt
});

test("een goed antwoord toont de strategie, zonder waardeoordeel, en gaat automatisch door", () => {
  jest.useFakeTimers();
  render(<WerkwoordOefening {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "loop" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));

  expect(screen.getByText("Goed zo!")).toBeInTheDocument();
  expect(screen.getByText(/ik-vorm: gewoon de stam/i)).toBeInTheDocument();
  expect(screen.queryByText(/fout/i)).not.toBeInTheDocument();

  act(() => jest.advanceTimersByTime(1300));
  expect(screen.getByText(/Jij/)).toBeInTheDocument(); // volgend item
  jest.useRealTimers();
});

test("een fout antwoord toont neutraal de juiste vorm + strategie, geen rood/kruis", () => {
  render(<WerkwoordOefening {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "looop" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));

  expect(screen.getByText("Zo schrijf je dat:")).toBeInTheDocument();
  expect(screen.getByText("loop")).toBeInTheDocument();
  expect(screen.getByText(/ik-vorm: gewoon de stam/i)).toBeInTheDocument();
  expect(screen.queryByText(/fout!/i)).not.toBeInTheDocument();
  expect(screen.queryByText("✗")).not.toBeInTheDocument();
});

test("werkt de categorie-voortgang bij met de juiste vorm als sleutel", () => {
  render(<WerkwoordOefening {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "fout" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));

  const data = leesVoortgang();
  expect(data.logboek[0]).toMatchObject({ woord: "loop", categorie: "werkwoord-tegenwoordige-tijd", correct: false });
});

test("toont een vriendelijke samenvatting aan het einde, met de foute vormen neutraal benoemd", () => {
  jest.useFakeTimers();
  render(<WerkwoordOefening {...props} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "fout" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
  fireEvent.click(screen.getByText(/Volgende zin/i));

  fireEvent.change(screen.getByRole("textbox"), { target: { value: "loopt" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
  act(() => jest.advanceTimersByTime(1300)); // laatste antwoord was goed: auto-door naar "klaar"

  expect(screen.getByText("Sessie klaar!")).toBeInTheDocument();
  expect(screen.getByText(/van de 2 in één keer goed/)).toBeInTheDocument();
  expect(screen.getByText(/nog een keertje oefenen/i)).toBeInTheDocument();
  expect(screen.getByText("loop")).toBeInTheDocument(); // de gemiste vorm, neutraal getoond
  jest.useRealTimers();
});

test("een lege lijst zinnen crasht niet, maar toont een nette uitweg", () => {
  render(<WerkwoordOefening {...props} zinnen={[]} />);
  expect(screen.getByText(/nog geen zinnen/i)).toBeInTheDocument();
});
