import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../Header';

describe('Header navigation', () => {
  it('opens the mobile menu, marks the current route, and closes on Escape', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(<Header route="analyze" theme="light" onToggleTheme={onToggleTheme} />);

    expect(screen.getByRole('link', { name: 'Analyze' })).toHaveAttribute('aria-current', 'page');

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(screen.queryByRole('navigation', { name: 'Mobile primary' })).toBeNull();

    await user.click(menuButton);
    expect(screen.getByRole('navigation', { name: 'Mobile primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(document.activeElement).toBe(screen.getByRole('link', { name: '01 Analyze' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Mobile primary' })).toBeNull();
    expect(document.activeElement).toBe(menuButton);
  });

  it('toggles the theme through the labelled control', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    render(<Header route="analyze" theme="light" onToggleTheme={onToggleTheme} />);
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
