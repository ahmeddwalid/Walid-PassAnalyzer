import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DictionaryProvider } from '../../../contexts/DictionaryContext';
import ComparisonPage from '../ComparisonPage';

function renderComparison() {
  return render(
    <DictionaryProvider>
      <ComparisonPage />
    </DictionaryProvider>,
  );
}

describe('ComparisonPage', () => {
  it('ranks candidates without rendering their plaintext', async () => {
    const user = userEvent.setup();
    renderComparison();
    const inputs = document.querySelectorAll<HTMLInputElement>('.comparison-input input');
    expect(inputs).toHaveLength(2);

    await user.type(inputs[0] as HTMLInputElement, 'Summer2024');
    await user.type(inputs[1] as HTMLInputElement, 'correct horse battery staple');

    await waitFor(
      () => {
        expect(document.querySelectorAll('.comparison-row')).toHaveLength(2);
      },
      { timeout: 7000 },
    );

    const results = document.querySelector('.comparison-results')?.textContent ?? '';
    expect(results).toContain('Candidate A');
    expect(results).toContain('Candidate B');
    expect(results).not.toContain('Summer2024');
    expect(results).not.toContain('correct horse battery staple');
    expect(results).toContain('Relative guessability');
  });

  it('clears all candidates and restores two empty inputs', async () => {
    const user = userEvent.setup();
    renderComparison();
    const inputs = document.querySelectorAll<HTMLInputElement>('.comparison-input input');
    await user.type(inputs[0] as HTMLInputElement, 'test-value');
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    const cleared = document.querySelectorAll<HTMLInputElement>('.comparison-input input');
    expect(cleared).toHaveLength(2);
    expect(cleared[0]).toHaveValue('');
    expect(cleared[1]).toHaveValue('');
    expect(screen.getByText('All candidates cleared.')).toBeInTheDocument();
  });
});
