import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MeerKeuze, SorteerOefening } from "./App";

// ── GEEN WAARDEOORDEEL BIJ EEN FOUT ANTWOORD ─────────────────────────────────
// Op basis van het testeffect: de correctie moet altijd zichtbaar zijn, maar
// zonder rood kruis of ander ontmoedigend signaal. Deze tests dwingen dat af
// zodat het niet ongemerkt terugsluipt bij een volgende wijziging.

jest.useFakeTimers();

test("MeerKeuze: een fout gekozen antwoord krijgt geen rood of kruis, het juiste antwoord blijft zichtbaar", () => {
  const vraag = { v: "Welk woord is goed gespeld?", o: ["kat", "katt", "kkat"], a: "kat" };
  const onAnswer = jest.fn();
  const { container } = render(<MeerKeuze vraag={vraag} onAnswer={onAnswer} font="sans-serif" dyslexie={false} />);

  fireEvent.click(screen.getByText("katt"));

  // Geen kruis, geen woord "fout" nergens op het scherm.
  expect(screen.queryByText("✗")).not.toBeInTheDocument();
  expect(screen.queryByText(/fout/i)).not.toBeInTheDocument();
  // Het juiste antwoord ("kat") is wél altijd zichtbaar gemarkeerd — nooit overslaan.
  const knopKat = [...container.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("kat ") || b.textContent.trim() === "kat");
  expect(knopKat.textContent).toContain("✓");

  act(() => jest.advanceTimersByTime(800));
  expect(onAnswer).toHaveBeenCalledWith(false);
});

test("SorteerOefening: een verkeerd geplaatst woord krijgt geen rood of kruis, maar laat wel zien waar het wél hoort", () => {
  const vraag = {
    v: "ei of ij?", kolommen: ["ei", "ij"],
    woorden: [{ w: "trein", k: "ei" }, { w: "rijden", k: "ij" }],
  };
  const onAnswer = jest.fn();
  render(<SorteerOefening vraag={vraag} onAnswer={onAnswer} font="sans-serif" dyslexie={false} />);

  // Beide woorden bewust in de verkeerde kolom plaatsen.
  const kolomEi = screen.getByText("ei").parentElement;
  const kolomIj = screen.getByText("ij").parentElement;
  fireEvent.click(within(kolomIj).getByText("+ trein"));   // trein hoort bij "ei"
  fireEvent.click(within(kolomEi).getByText("+ rijden"));  // rijden hoort bij "ij"

  fireEvent.click(screen.getByText("Controleer"));

  // Geen rood, geen kruis — wel een neutrale aanwijzing naar de juiste kolom.
  expect(screen.queryByText("✗")).not.toBeInTheDocument();
  expect(screen.queryByText(/fout/i)).not.toBeInTheDocument();
  expect(screen.getByText(/hoort bij ei/)).toBeInTheDocument();
  expect(screen.getByText(/hoort bij ij/)).toBeInTheDocument();

  act(() => jest.advanceTimersByTime(1200));
  expect(onAnswer).toHaveBeenCalledWith(false);
});
