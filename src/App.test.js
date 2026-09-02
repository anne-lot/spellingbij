import { render, screen } from '@testing-library/react';
import App from './App';

test('toont het startscherm met Flitswoorden en een teaser voor de rest', () => {
  render(<App />);
  expect(screen.getByText(/Start Flitswoorden/i)).toBeInTheDocument();
  expect(screen.getByText(/Spellingcategorieën oefenen/i)).toBeInTheDocument();
});
