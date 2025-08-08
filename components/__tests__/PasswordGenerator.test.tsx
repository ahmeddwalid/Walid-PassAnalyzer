import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PasswordGenerator } from '../PasswordGenerator';
import { AppProvider } from '../../contexts/AppContext';

// Mock zxcvbn
vi.mock('zxcvbn', () => ({
  default: vi.fn(() => ({
    score: 3,
    feedback: {
      warning: '',
      suggestions: []
    },
    crack_times_display: {
      online_no_throttling_10_per_second: '1 hour',
      online_throttling_100_per_hour: '1 day',
      offline_slow_hashing_1e4_per_second: '1 week',
      offline_fast_hashing_1e10_per_second: '1 minute'
    },
    calc_time: 1
  }))
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      {component}
    </AppProvider>
  );
};

describe('PasswordGenerator', () => {
  it('renders password generator interface', () => {
    renderWithProvider(<PasswordGenerator />);
    
    expect(screen.getByText('Password Generator')).toBeInTheDocument();
    expect(screen.getByText('Generate cryptographically secure passwords and passphrases')).toBeInTheDocument();
    expect(screen.getByText('Generator Settings')).toBeInTheDocument();
  });

  it('displays default configuration options', () => {
    renderWithProvider(<PasswordGenerator />);
    
    // Check default checkboxes
    expect(screen.getByLabelText(/Uppercase Letters/)).toBeChecked();
    expect(screen.getByLabelText(/Lowercase Letters/)).toBeChecked();
    expect(screen.getByLabelText(/Numbers/)).toBeChecked();
    expect(screen.getByLabelText(/Symbols/)).toBeChecked();
    
    // Check advanced options are unchecked by default
    expect(screen.getByLabelText(/Exclude Similar Characters/)).not.toBeChecked();
    expect(screen.getByLabelText(/Exclude Ambiguous Characters/)).not.toBeChecked();
  });

  it('generates password when button is clicked', async () => {
    renderWithProvider(<PasswordGenerator />);
    
    const generateButton = screen.getByText('⚡ Generate Password');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Generated Password')).toBeInTheDocument();
    });
    
    // Should show strength analysis
    await waitFor(() => {
      expect(screen.getByText('Strength Analysis')).toBeInTheDocument();
    });
  });

  it('shows validation error when no character types selected', () => {
    renderWithProvider(<PasswordGenerator />);
    
    // Uncheck all character types
    fireEvent.click(screen.getByLabelText(/Uppercase Letters/));
    fireEvent.click(screen.getByLabelText(/Lowercase Letters/));
    fireEvent.click(screen.getByLabelText(/Numbers/));
    fireEvent.click(screen.getByLabelText(/Symbols/));
    
    expect(screen.getByText('Configuration Issues:')).toBeInTheDocument();
    expect(screen.getByText('At least one character type must be selected')).toBeInTheDocument();
    
    // Generate button should be disabled
    const generateButton = screen.getByText('⚡ Generate Password');
    expect(generateButton).toBeDisabled();
  });

  it('updates password length when slider is moved', () => {
    renderWithProvider(<PasswordGenerator />);
    
    const lengthSlider = screen.getByRole('slider');
    fireEvent.change(lengthSlider, { target: { value: '20' } });
    
    expect(screen.getByText('Password Length: 20')).toBeInTheDocument();
  });

  it('allows custom characters input', () => {
    renderWithProvider(<PasswordGenerator />);
    
    const customInput = screen.getByPlaceholderText('Add custom characters...');
    fireEvent.change(customInput, { target: { value: 'αβγ' } });
    
    expect(customInput).toHaveValue('αβγ');
  });

  it('allows exclude characters input', () => {
    renderWithProvider(<PasswordGenerator />);
    
    const excludeInput = screen.getByPlaceholderText('Characters to exclude...');
    fireEvent.change(excludeInput, { target: { value: 'xyz' } });
    
    expect(excludeInput).toHaveValue('xyz');
  });

  it('shows initial empty state message', () => {
    renderWithProvider(<PasswordGenerator />);
    
    expect(screen.getByText('Configure your settings and click "Generate Password" to create a secure password.')).toBeInTheDocument();
  });
});