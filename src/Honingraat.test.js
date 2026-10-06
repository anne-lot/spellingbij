import { render, act } from "@testing-library/react";
import Honingraat from "./Honingraat";

function hexCellen(container) {
  return container.querySelectorAll("svg");
}

describe("Honingraat", () => {
  test("tekent precies 'aantal' zeshoeken", () => {
    const { container } = render(<Honingraat aantal={20} antwoorden={Array(20).fill(null)} fase="maken" />);
    expect(hexCellen(container)).toHaveLength(20);
  });

  test("fase 'maken': een beantwoorde cel ziet anders uit dan een lege, ongeacht goed of fout", () => {
    const antwoorden = [true, false, null, null];
    const { container } = render(<Honingraat aantal={4} antwoorden={antwoorden} huidigIndex={2} fase="maken" />);
    const polygons = container.querySelectorAll("polygon");
    const fills = [...polygons].map((p) => p.getAttribute("fill"));
    // De twee beantwoorde cellen (index 0 en 1) hebben dezelfde neutrale vulling...
    expect(fills[0]).toBe(fills[1]);
    // ...en die is anders dan de nog-niet-beantwoorde cellen.
    expect(fills[0]).not.toBe(fills[2]);
    expect(fills[2]).toBe(fills[3]);
    // Geen enkele polyline (vinkje) tijdens het maken — dat zou goed/fout verraden.
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });

  test("fase 'maken': de huidige cel is apart gemarkeerd (dikkere rand)", () => {
    const { container } = render(<Honingraat aantal={3} antwoorden={[null, null, null]} huidigIndex={1} fase="maken" />);
    const polygons = [...container.querySelectorAll("polygon")];
    const breedtes = polygons.map((p) => Number(p.getAttribute("stroke-width")));
    expect(breedtes[1]).toBeGreaterThan(breedtes[0]);
    expect(breedtes[1]).toBeGreaterThan(breedtes[2]);
  });

  test("fase 'klaar': onthult de uitkomst geleidelijk, niet alles in één keer", () => {
    jest.useFakeTimers();
    const antwoorden = [true, false, true];
    const { container } = render(<Honingraat aantal={3} antwoorden={antwoorden} fase="klaar" />);

    // Direct na mount is nog niets onthuld: alle cellen staan neutraal.
    let fills = [...container.querySelectorAll("polygon")].map((p) => p.getAttribute("fill"));
    expect(new Set(fills).size).toBe(1);

    act(() => { jest.advanceTimersByTime(95); });
    fills = [...container.querySelectorAll("polygon")].map((p) => p.getAttribute("fill"));
    // Precies de eerste cel is nu onthuld (en die was goed, dus honinggeel).
    expect(fills[0]).toBe("#F5C400");

    act(() => { jest.advanceTimersByTime(500); });
    fills = [...container.querySelectorAll("polygon")].map((p) => p.getAttribute("fill"));
    expect(fills[0]).toBe("#F5C400");
    expect(fills[1]).not.toBe("#F5C400"); // fout antwoord: geen honinggeel
    expect(fills[2]).toBe("#F5C400");

    jest.useRealTimers();
  });

  test("fase 'klaar': een goed antwoord krijgt ook een vinkje, niet alleen een kleur", () => {
    jest.useFakeTimers();
    const { container } = render(<Honingraat aantal={2} antwoorden={[true, false]} fase="klaar" />);
    act(() => { jest.advanceTimersByTime(500); });
    expect(container.querySelectorAll("polyline")).toHaveLength(1); // alleen bij de goede
    jest.useRealTimers();
  });

  test("heeft een toegankelijke naam die het aantal goed samenvat", () => {
    const { container } = render(<Honingraat aantal={4} antwoorden={[true, true, false, false]} fase="klaar" />);
    const raat = container.querySelector('[role="img"]');
    expect(raat.getAttribute("aria-label")).toMatch(/2 van de 4 goed/);
  });
});
