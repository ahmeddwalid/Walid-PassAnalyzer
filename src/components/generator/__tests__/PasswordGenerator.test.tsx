import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordGenerator } from '../PasswordGenerator';

describe('PasswordGenerator', () => {
  it('generates a valid recommended password on mount and copies it on request', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<PasswordGenerator />);

    const output = await waitFor(() => {
      const element = document.querySelector('.secret-value code');
      expect(element?.textContent?.length).toBeGreaterThan(0);
      return element as HTMLElement;
    });
    const value = output.textContent ?? '';
    expect(Array.from(value)).toHaveLength(20);
    expect(value).toMatch(/[a-z]/);
    expect(value).toMatch(/[A-Z]/);
    expect(value).toMatch(/[0-9]/);
    expect(value).toMatch(/[^a-zA-Z0-9]/);

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    const afterClick = document.querySelector('.secret-value code')?.textContent ?? '';
    expect(afterClick).toBe(value);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(afterClick);
    });
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('applies the maximum-compatibility preset without symbols or look-alikes', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator />);
    await waitFor(() => {
      expect(document.querySelector('.secret-value code')?.textContent?.length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: /maximum compatibility/i }));

    await waitFor(() => {
      const value = document.querySelector('.secret-value code')?.textContent ?? '';
      expect(Array.from(value)).toHaveLength(16);
      expect(value).toMatch(/^[a-zA-Z0-9]+$/);
      expect(value).not.toMatch(/[Il1Lo0O]/);
    });
  });

  it('disables generation for an invalid length', async () => {
    const user = userEvent.setup();
    render(<PasswordGenerator />);
    const length = screen.getByLabelText('Length');
    await user.clear(length);
    await user.type(length, '3');
    expect(screen.getByRole('button', { name: /generate password/i })).toBeDisabled();
    expect(screen.getByText(/length must be at least 4/i)).toBeInTheDocument();
  });
});
