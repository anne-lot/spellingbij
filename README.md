# Spellingbij

Spelling oefenen voor groep 3 tot en met 8. Gebouwd met Create React App.

## Oefenvormen

- **Flitswoorden** — een woord flitst kort voorbij (instelbare tijd met aftelcirkel),
  verdwijnt, en het kind typt het uit het geheugen over. Rustige feedback, korte
  sessies, voortgang lokaal opgeslagen (localStorage).
- **Jouw spellingkaart** — een balkje per spellingcategorie: waar gaat het al goed
  en waar valt nog wat te halen. Positief geformuleerd, geen kruisjes.
- Losse spellingcategorieën (diagnosetoets + gericht oefenen) — code aanwezig,
  nog niet aangezet in het menu.

## Woorden aanpassen

Alle flitswoorden staan in [`src/data/flitswoorden.json`](src/data/flitswoorden.json):

- `standaardFlitstijd` — fallback-flitstijd in seconden
- `sessieLengte` — aantal woorden per sessie
- `flitstijdPerGroep` — flitstijd per groep (3 t/m 8)
- `flitswoorden.<naam>` — een lijstje met een `groep`, een optionele
  `standaardCategorie` en `woorden`. Lijstjes met dezelfde groep worden
  samengevoegd tot één oefenlijst. Nieuw lijstje of nieuwe woorden toevoegen kan
  hier zonder de code aan te raken.

Elk woord is een object met een spellingcategorie:

```json
{ "w": "maan", "categorie": "open-lettergreep" }
```

Een woord mag ook als losse string worden opgeschreven (`"lopen"`); dan erft het de
`standaardCategorie` van zijn lijstje. De categorieën zelf staan in
[`src/data/categorieen.json`](src/data/categorieen.json), met in `_toelichting`
de indelingsregels die bij het toekennen zijn gebruikt. Een categorie toevoegen
kan daar, zonder codewijziging.

## Herhaling per spellingcategorie

De woordkeuze is niet willekeurig. Elke poging wordt gekoppeld aan de
spellingcategorie van het doelwoord, en per categorie houdt de app een sterkte en
een herhaalinterval bij (Leitner-achtig: goed → langer interval, fout → direct
weer aan de beurt). Categorieën die "rijp" zijn wegen zwaarder in de woordkeuze,
en categorieën waarin nog niet geoefend is komen ook regelmatig langs.

- [`src/spelling/voortgang.js`](src/spelling/voortgang.js) — opslag, sterkte en
  intervalmodel. De aannames in het model staan bovenaan dat bestand
  (A1 t/m A7) op één plek, zodat ze te verfijnen of A/B te testen zijn.
- [`src/spelling/woordkeuze.js`](src/spelling/woordkeuze.js) — `kiesVolgendWoord()`
  en `kiesSessie()`, los importeerbaar voor elke oefenvorm. De wegingsaannames
  staan bovenaan dat bestand (B1 t/m B4).
- [`src/data/woorden.js`](src/data/woorden.js) — leest de woordenlijsten in en
  normaliseert ze naar `{ woord, categorie, groep, lijst }`.

Alles blijft lokaal in `localStorage`; geen account, geen backend.

## Ontwikkelen

```
npm install
npm start        # http://localhost:3000
npm test         # tests
npm run build    # productiebuild in build/
```

## Hosting

Netlify: repo koppelen, build-instellingen komen uit `netlify.toml`
(`npm run build` → `build/`). Elke push naar `main` wordt automatisch gedeployed.
