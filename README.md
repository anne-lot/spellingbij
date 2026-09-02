# Spellingbij

Spelling oefenen voor groep 3 tot en met 8. Gebouwd met Create React App.

## Oefenvormen

- **Flitswoorden** — een woord flitst kort voorbij (instelbare tijd met aftelcirkel),
  verdwijnt, en het kind typt het uit het geheugen over. Rustige feedback, korte
  sessies, voortgang lokaal opgeslagen (localStorage).
- Losse spellingcategorieën (diagnosetoets + gericht oefenen) — code aanwezig,
  nog niet aangezet in het menu.

## Woorden aanpassen

Alle flitswoorden staan in [`src/data/flitswoorden.json`](src/data/flitswoorden.json):

- `standaardFlitstijd` — fallback-flitstijd in seconden
- `sessieLengte` — aantal woorden per sessie
- `flitstijdPerGroep` — flitstijd per groep (3 t/m 8)
- `flitswoorden.<naam>` — een lijstje met een `groep` en `woorden`. Lijstjes met
  dezelfde groep worden samengevoegd tot één oefenlijst. Nieuw lijstje of nieuwe
  woorden toevoegen kan hier zonder de code aan te raken.

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
