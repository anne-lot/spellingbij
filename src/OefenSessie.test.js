import { render, screen, fireEvent, act } from "@testing-library/react";
import OefenSessie from "./OefenSessie";
import { resetVoortgang } from "./spelling/voortgang";

let frames = [];
beforeEach(() => {
  resetVoortgang();
  frames = [];
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function laatFlitsAflopen() {
  act(() => {
    const open = frames;
    frames = [];
    open.forEach((cb) => cb(performance.now() + 60_000));
  });
}

const props = {
  font: "sans-serif", dyslexie: false, setDyslexie: () => {},
  titel: "Oefenen · Apostrof",
  woorden: [{ woord: "auto's", categorie: "apostrof", hint: "Na a, o, u of y zet je een apostrof vóór de s." }],
  onExit: () => {},
};

test("een hint bij het woord wordt getoond na een fout antwoord", () => {
  render(<OefenSessie {...props} />);
  laatFlitsAflopen();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "autos" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
  expect(screen.getByText(/Na a, o, u of y zet je een apostrof/i)).toBeInTheDocument();
});

test("een hint bij het woord wordt ook getoond na een goed antwoord", () => {
  render(<OefenSessie {...props} />);
  laatFlitsAflopen();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "auto's" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
  expect(screen.getByText(/Na a, o, u of y zet je een apostrof/i)).toBeInTheDocument();
});

test("geen hint-regel als het woord geen hint heeft", () => {
  render(<OefenSessie {...props} woorden={[{ woord: "maan", categorie: "open-lettergreep" }]} />);
  laatFlitsAflopen();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "man" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
  expect(screen.queryByText("💡")).not.toBeInTheDocument();
});

test("het invoerveld toont geen instructietekst, alleen het lege vak", () => {
  render(<OefenSessie {...props} />);
  laatFlitsAflopen();
  expect(screen.queryByText(/Welk woord zag je/i)).not.toBeInTheDocument();
  expect(screen.getByRole("textbox")).toBeInTheDocument();
});

test("op Enter drukken na een fout antwoord gaat door naar het volgende woord, zonder muis", () => {
  render(<OefenSessie {...props} woorden={[
    { woord: "auto's", categorie: "apostrof" },
    { woord: "foto's", categorie: "apostrof" },
  ]} />);
  laatFlitsAflopen();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "autos" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));

  expect(screen.getByText(/Jij typte/i)).toBeInTheDocument(); // op het feedbackscherm
  fireEvent.keyDown(window, { key: "Enter" });
  laatFlitsAflopen();
  expect(screen.getByRole("textbox")).toBeInTheDocument(); // alweer bij het volgende woord
});

test("Enter heeft geen effect op het feedbackscherm na een goed antwoord (alleen bij fout zit er een listener)", () => {
  render(<OefenSessie {...props} woorden={[
    { woord: "auto's", categorie: "apostrof" },
    { woord: "foto's", categorie: "apostrof" },
  ]} />);
  laatFlitsAflopen();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "auto's" } });
  fireEvent.click(screen.getByText(/Klaar \(Enter\)/i));
  expect(screen.getByText("Goed zo!")).toBeInTheDocument();

  // Direct na Enter staan we nog steeds op dit feedbackscherm: er hangt hier
  // geen keydown-listener aan (die zit alleen op de fout-tak), dus niets
  // springt vooruit buiten de eigen automatische timer om.
  fireEvent.keyDown(window, { key: "Enter" });
  expect(screen.getByText("Goed zo!")).toBeInTheDocument();
});
