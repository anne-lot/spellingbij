import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { registreerPoging, resetVoortgang } from './spelling/voortgang';

beforeEach(() => resetVoortgang());

test('toont het startscherm met Flitswoorden en een teaser voor de rest', () => {
  render(<App />);
  expect(screen.getByText(/Start Flitswoorden/i)).toBeInTheDocument();
  expect(screen.getByText(/Spellingcategorieën oefenen/i)).toBeInTheDocument();
});

test('de spellingkaart is leeg zolang er niet geoefend is', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Jouw spellingkaart/i));
  expect(screen.getByText(/Nog een leeg kaartje/i)).toBeInTheDocument();
});

test('de spellingkaart toont per categorie een stand na een geoefende fout', () => {
  registreerPoging({ woord: 'trein', categorie: 'ei-ij', correct: false, getypt: 'trijn' });
  render(<App />);
  fireEvent.click(screen.getByText(/Jouw spellingkaart/i));

  // De geoefende categorie staat erop, met een positief geformuleerde stand …
  expect(screen.getByText(/ei\/ij/)).toBeInTheDocument();
  expect(screen.getByText(/hier kun je nog op oefenen/i)).toBeInTheDocument();
  // … en na een fout is het interval kort, dus staat de categorie direct klaar.
  expect(screen.getByText(/^aan de beurt$/i)).toBeInTheDocument();
  // Nergens negatieve taal of een kruisje.
  expect(screen.queryByText(/fout/i)).not.toBeInTheDocument();
  expect(screen.queryByText('✗')).not.toBeInTheDocument();

  // Categorieën waarin nog niet geoefend is, komen ook in beeld — als "nieuw".
  expect(screen.getAllByText(/nog niet geoefend/i).length).toBeGreaterThan(5);
});

test('vanuit de spellingkaart kom je terug op het startscherm', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Jouw spellingkaart/i));
  fireEvent.click(screen.getByText(/Terug naar menu/i));
  expect(screen.getByText(/Start Flitswoorden/i)).toBeInTheDocument();
});
