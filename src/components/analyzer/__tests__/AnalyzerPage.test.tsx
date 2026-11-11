import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DictionaryProvider } from '../../../contexts/DictionaryContext';
import AnalyzerPage from '../AnalyzerPage';

function renderAnalyzer() {
  return render(
    <DictionaryProvider>
      <AnalyzerPage />
    </DictionaryProvider>,
  );
}

describe('AnalyzerPage', () => {
  it('preserves and assesses whitespace-only input instead of clearing it', async () => {
    const user = userEvent.setup();
    renderAnalyzer();
    const input = screen.getByLabelText('Password to analyze');

    await user.type(input, '   ');
    expect(input).toHaveValue('   ');

    await waitFor(
      () => {
        expect(screen.getByText(/whitespace-only input/i)).toBeInTheDocument();
      },
      { timeout: 6000 },
    );
    expect(input).toHaveValue('   ');
  });

  it('supports clear, reveal, and a documented example', async () => {
    const user = userEvent.setup();
    renderAnalyzer();
    const input = screen.getByLabelText('Password to analyze');

    await user.type(input, 'Summer2024');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Clear password field' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /four common words/i }));
    expect((input as HTMLInputElement).value.length).toBeGreaterThan(10);
    await waitFor(() => {
      expect(screen.getByText('Estimated guesses')).toBeInTheDocument();
    });
  });
});
