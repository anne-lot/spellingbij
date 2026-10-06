import {
  leesVoortgang, registreerPoging, resetVoortgang, sterkte, isRijp, volgendNiveau,
  intervalMs, categorieStatus, eersteVerschil, STERKTE_VENSTER, MAX_NIVEAU,
} from "./voortgang";
import {
  kiesVolgendWoord, kiesSessie, categorieGewicht, categorieGewichten,
  GEWICHT_NIEUW, GEWICHT_RIJP, GEWICHT_NIET_RIJP,
} from "./woordkeuze";
import { ALLE_WOORDEN, CATEGORIEEN, woordenVoorGroep } from "../data/woorden";

const UUR = 60 * 60 * 1000;

// Een voortgangsobject opbouwen zonder localStorage, door pogingen door te geven.
function metPogingen(pogingen, start = 1_000_000) {
  let data = { versie: 1, categorieen: {}, logboek: [] };
  pogingen.forEach(([categorie, correct, offsetUur = 0], i) => {
    data = registreerPoging(
      { woord: `w${i}`, categorie, correct, nu: start + offsetUur * UUR },
      data
    );
  });
  return data;
}

beforeEach(() => resetVoortgang());

describe("woorddata", () => {
  test("elk woord heeft een bekende categorie", () => {
    expect(ALLE_WOORDEN.length).toBeGreaterThan(400);
    const onbekend = ALLE_WOORDEN.filter((w) => !CATEGORIEEN[w.categorie]);
    expect(onbekend).toEqual([]);
  });

  test("woordenVoorGroep dedupliceert overlappende bronlijsten", () => {
    const woorden = woordenVoorGroep(3).map((w) => w.woord);
    expect(new Set(woorden).size).toBe(woorden.length);
  });

  test("de tien oorspronkelijke categorieën komen in de woorddata voor", () => {
    // Niet "alle" categorieën: apostrof/c-als-s-k/leenwoorden-ge/ie-als-i e.d.
    // zijn later toegevoegd en kunnen leeg zijn totdat nieuwe inhoud is
    // nagekeken (zie src/data/groep6_nieuw.json) — dat is bedoeld gedrag.
    const OORSPRONKELIJKE_CATEGORIEEN = [
      "open-lettergreep", "gesloten-lettergreep", "ei-ij", "au-ou", "verdubbeling",
      "verscherping", "stomme-e", "ch-g", "samenstelling", "onregelmatig",
    ];
    const gebruikt = new Set(ALLE_WOORDEN.map((w) => w.categorie));
    for (const c of OORSPRONKELIJKE_CATEGORIEEN) expect(gebruikt.has(c)).toBe(true);
  });

  test("elke categoriesleutel uit categorieen.json is geldig (ook als hij nog geen woorden heeft)", () => {
    const gebruikt = new Set(ALLE_WOORDEN.map((w) => w.categorie));
    const onbekend = [...gebruikt].filter((c) => !CATEGORIEEN[c]);
    expect(onbekend).toEqual([]);
  });
});

describe("sterkte en interval", () => {
  test("sterkte is null zonder pogingen en anders het aandeel goed", () => {
    expect(sterkte(undefined)).toBeNull();
    expect(sterkte({ recent: [] })).toBeNull();
    expect(sterkte({ recent: [true, true, false, true] })).toBeCloseTo(0.75);
  });

  test("sterkte kijkt alleen naar de laatste STERKTE_VENSTER pogingen", () => {
    const fout = Array(10).fill(false);
    const data = metPogingen([...fout.map(() => ["ei-ij", false]), ["ei-ij", true], ["ei-ij", true]]);
    const stat = data.categorieen["ei-ij"];
    expect(stat.recent).toHaveLength(STERKTE_VENSTER);
    expect(sterkte(stat)).toBeCloseTo(2 / 5);
  });

  test("goed gaat een bak omhoog, fout reset naar 0 (aanname A3)", () => {
    expect(volgendNiveau(0, true)).toBe(1);
    expect(volgendNiveau(3, true)).toBe(4);
    expect(volgendNiveau(MAX_NIVEAU, true)).toBe(MAX_NIVEAU);
    expect(volgendNiveau(4, false)).toBe(0);
  });

  test("hogere bak betekent een langer interval; bak 0 is direct rijp (A5)", () => {
    expect(intervalMs(0)).toBe(0);
    for (let n = 1; n <= MAX_NIVEAU; n++) expect(intervalMs(n)).toBeGreaterThan(intervalMs(n - 1));
  });

  test("na een fout is de categorie direct weer rijp", () => {
    const data = metPogingen([["ei-ij", false]]);
    expect(isRijp(data.categorieen["ei-ij"], 1_000_000)).toBe(true);
  });

  test("na goed is de categorie pas rijp als het interval verstreken is", () => {
    const data = metPogingen([["ei-ij", true]]);
    const stat = data.categorieen["ei-ij"];
    expect(isRijp(stat, 1_000_000 + 1 * UUR)).toBe(false);
    expect(isRijp(stat, 1_000_000 + 5 * UUR)).toBe(true);
  });

  test("een onbeoefende categorie is niet rijp maar ook niet zwak (A7)", () => {
    expect(isRijp(undefined)).toBe(false);
    const regel = categorieStatus(leesVoortgang()).find((r) => r.sleutel === "ei-ij");
    expect(regel.stand).toBe("nieuw");
    expect(regel.sterkte).toBeNull();
  });
});

describe("foutdiagnose", () => {
  test("een fout wordt gekoppeld aan de categorie van het doelwoord", () => {
    registreerPoging({ woord: "trein", categorie: "ei-ij", correct: false, getypt: "trijn" });
    const data = leesVoortgang();
    expect(data.categorieen["ei-ij"]).toMatchObject({ pogingen: 1, fout: 1, niveau: 0 });
    expect(data.logboek[0]).toMatchObject({ woord: "trein", categorie: "ei-ij", correct: false, getypt: "trijn" });
  });

  test("een onbekende categorie valt terug op onregelmatig", () => {
    const data = registreerPoging(
      { woord: "zomaar", categorie: "bestaat-niet", correct: true },
      { versie: 1, categorieen: {}, logboek: [] }
    );
    expect(Object.keys(data.categorieen)).toEqual(["onregelmatig"]);
  });

  test("eersteVerschil wijst de plek van de afwijking aan", () => {
    expect(eersteVerschil("trein", "trein")).toBe(-1);
    expect(eersteVerschil("trein", "trijn")).toBe(2);
    expect(eersteVerschil("maan", "man")).toBe(2);
    expect(eersteVerschil("man", "maan")).toBe(2);
    expect(eersteVerschil("kat", "Kat ")).toBe(-1);
  });

  test("de voortgang overleeft een herstart (localStorage)", () => {
    registreerPoging({ woord: "goud", categorie: "au-ou", correct: true });
    expect(leesVoortgang().categorieen["au-ou"].pogingen).toBe(1);
  });
});

describe("weging van categorieën", () => {
  const nu = 1_000_000;

  test("rijp en zwak weegt het zwaarst, niet-rijp en sterk het lichtst", () => {
    const zwak = metPogingen([["ei-ij", false]], nu);
    const sterkNietRijp = metPogingen([["au-ou", true]], nu);
    const rijpZwak = categorieGewicht(zwak, "ei-ij", nu);
    const nietRijpSterk = categorieGewicht(sterkNietRijp, "au-ou", nu);

    expect(rijpZwak).toBeCloseTo(GEWICHT_RIJP * 2);
    expect(nietRijpSterk).toBeCloseTo(GEWICHT_NIET_RIJP);
    expect(rijpZwak).toBeGreaterThan(GEWICHT_NIEUW);
    expect(GEWICHT_NIEUW).toBeGreaterThan(nietRijpSterk);
  });

  test("een onbeoefende categorie weegt zwaarder dan een rijpe sterke (B1)", () => {
    const leeg = { versie: 1, categorieen: {}, logboek: [] };
    const sterkEnRijp = metPogingen([["au-ou", true]], nu);
    const rijpLater = nu + 100 * UUR;
    expect(categorieGewicht(leeg, "ei-ij", nu)).toBeGreaterThan(
      categorieGewicht(sterkEnRijp, "au-ou", rijpLater)
    );
  });

  test("categorieGewichten geeft alleen categorieën uit de lijst, hoog eerst", () => {
    const lijst = [
      { woord: "trein", categorie: "ei-ij" },
      { woord: "goud", categorie: "au-ou" },
    ];
    const data = metPogingen([["ei-ij", false]], nu);
    const rijen = categorieGewichten(data, lijst, nu);
    expect(rijen.map((r) => r.categorie)).toEqual(["ei-ij", "au-ou"]);
  });
});

describe("kiesVolgendWoord", () => {
  const lijst = [
    { woord: "trein", categorie: "ei-ij" },
    { woord: "klein", categorie: "ei-ij" },
    { woord: "wijn", categorie: "ei-ij" },
    { woord: "goud", categorie: "au-ou" },
    { woord: "koud", categorie: "au-ou" },
    { woord: "hout", categorie: "au-ou" },
  ];
  const nu = 1_000_000;

  test("geeft null bij een lege lijst", () => {
    expect(kiesVolgendWoord(leesVoortgang(), [])).toBeNull();
  });

  test("kiest de zwakke, rijpe categorie duidelijk vaker", () => {
    // ei-ij: drie keer fout -> rijp en zwak. au-ou: drie keer goed -> sterk, niet rijp.
    const data = metPogingen([
      ["ei-ij", false], ["ei-ij", false], ["ei-ij", false],
      ["au-ou", true], ["au-ou", true], ["au-ou", true],
    ], nu);

    let eiIj = 0;
    for (let i = 0; i < 600; i++) {
      const w = kiesVolgendWoord(data, lijst, { nu });
      if (w.categorie === "ei-ij") eiIj++;
    }
    // verwachting ~91% (5,0 vs 0,5); ruime marge tegen toevallige uitschieters
    expect(eiIj).toBeGreaterThan(420);
  });

  test("onbeoefende categorieën komen ook aan bod als er een zwakke categorie is", () => {
    const data = metPogingen([["ei-ij", false], ["ei-ij", false]], nu);
    let auOu = 0;
    for (let i = 0; i < 600; i++) {
      if (kiesVolgendWoord(data, lijst, { nu }).categorie === "au-ou") auOu++;
    }
    // au-ou is nog onbeoefend: gewicht 3,0 tegen 5,0 -> ruim een derde
    expect(auOu).toBeGreaterThan(150);
    expect(auOu).toBeLessThan(400);
  });

  test("vermijdt woorden die al in de sessie zitten", () => {
    const data = leesVoortgang();
    const vermijd = ["trein", "klein", "wijn", "goud", "koud"];
    for (let i = 0; i < 50; i++) {
      expect(kiesVolgendWoord(data, lijst, { nu, vermijd }).woord).toBe("hout");
    }
  });

  test("valt terug op de hele lijst als alles vermeden is", () => {
    const vermijd = lijst.map((w) => w.woord);
    const w = kiesVolgendWoord(leesVoortgang(), lijst, { nu, vermijd });
    expect(lijst.map((x) => x.woord)).toContain(w.woord);
  });

  test("een vervangbare randomfunctie maakt de keuze deterministisch", () => {
    const vast = () => 0.01;
    const a = kiesVolgendWoord(leesVoortgang(), lijst, { nu, random: vast });
    const b = kiesVolgendWoord(leesVoortgang(), lijst, { nu, random: vast });
    expect(a.woord).toBe(b.woord);
  });

  test("woorden die het langst niet voorbij kwamen krijgen voorrang (B4)", () => {
    // Alleen ei-ij in de lijst; "trein" is net geoefend, dus die hoort achteraan.
    const alleenEi = lijst.filter((w) => w.categorie === "ei-ij");
    let data = { versie: 1, categorieen: {}, logboek: [] };
    data = registreerPoging({ woord: "trein", categorie: "ei-ij", correct: true, nu }, data);
    const gekozen = new Set();
    for (let i = 0; i < 100; i++) gekozen.add(kiesVolgendWoord(data, alleenEi, { nu }).woord);
    expect(gekozen.has("trein")).toBe(false);
  });
});

describe("kiesSessie", () => {
  const nu = 1_000_000;

  test("levert het gevraagde aantal unieke woorden", () => {
    const lijst = woordenVoorGroep(4);
    const sessie = kiesSessie(leesVoortgang(), lijst, 12, { nu });
    expect(sessie).toHaveLength(12);
    expect(new Set(sessie.map((w) => w.woord)).size).toBe(12);
  });

  test("wordt niet langer dan de woordenlijst zelf", () => {
    const lijst = [{ woord: "trein", categorie: "ei-ij" }, { woord: "goud", categorie: "au-ou" }];
    expect(kiesSessie(leesVoortgang(), lijst, 12, { nu })).toHaveLength(2);
  });

  test("geen enkele categorie vult meer dan het maximale aandeel (B3)", () => {
    // Eén sterk afwijkende categorie: zonder rem zou die de hele sessie vullen.
    const data = metPogingen(Array(5).fill(["ei-ij", false]), nu);
    const sessie = kiesSessie(data, woordenVoorGroep(4), 12, { nu });
    const tellers = {};
    for (const w of sessie) tellers[w.categorie] = (tellers[w.categorie] ?? 0) + 1;
    expect(Math.max(...Object.values(tellers))).toBeLessThanOrEqual(Math.ceil(12 * 0.4));
    expect(Object.keys(tellers).length).toBeGreaterThanOrEqual(3);
  });

  test("geeft een lege sessie bij een lege lijst", () => {
    expect(kiesSessie(leesVoortgang(), [], 12)).toEqual([]);
  });
});

describe("categorieStatus", () => {
  test("geeft één regel per categorie met een positieve 'nieuw'-stand", () => {
    const rijen = categorieStatus(leesVoortgang());
    expect(rijen).toHaveLength(Object.keys(CATEGORIEEN).length);
    expect(rijen.every((r) => r.stand === "nieuw")).toBe(true);
  });

  test("standen volgen de sterkte", () => {
    const data = metPogingen([
      ["ei-ij", true], ["ei-ij", true], ["ei-ij", true], ["ei-ij", true], ["ei-ij", true],
      ["au-ou", false], ["au-ou", false], ["au-ou", false], ["au-ou", true], ["au-ou", false],
      ["ch-g", true], ["ch-g", true], ["ch-g", false], ["ch-g", true], ["ch-g", false],
    ]);
    const bij = (s) => categorieStatus(data).find((r) => r.sleutel === s);
    expect(bij("ei-ij").stand).toBe("sterk");
    expect(bij("au-ou").stand).toBe("oefenen");
    expect(bij("ch-g").stand).toBe("gemiddeld");
    expect(bij("ei-ij").goed).toBe(5);
    expect(bij("au-ou").fout).toBe(4);
  });
});
