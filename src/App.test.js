import { render, screen } from '@testing-library/react';
import App from './App';

test('toont de startpagina met de diagnosetoets- en flitswoorden-knop', () => {
  render(<App />);
  expect(screen.getByText(/Start diagnosetoets/i)).toBeInTheDocument();
  expect(screen.getByText('Flitswoorden')).toBeInTheDocument();
});
