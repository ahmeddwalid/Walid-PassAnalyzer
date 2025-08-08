import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PassphraseGenerator } from '../PassphraseGenerator';
import { AppProvider } from '../../contexts/AppContext';

// Mock the services
vi.mock('../../services/CryptoService', () => ({
  CryptoServiceImpl: {
    getInstance: () => ({
      generatePassphrase: vi.fn().mockReturnValue('correct-horse-battery-staple'),
      calculateEntropy: vi.fn().mockReturnValue(51.6)
    })
  }
}));

vi.mock('../../services/DictionaryService', () => ({
  DictionaryServiceImpl: {
    getInstance: () => ({
      getDictionaries: vi.fn().mockReturnValue([
        { id: 'eff', name: 'EFF Large', source: 'builtin', enabled: true },
        { id: 'original', name: 'Original Diceware', source: 'builtin', enabled: true }
      ])
    })
  }
}));

// Mock zxcvbn
vi.mock('zxcvbn', () => ({
  default: vi.fn().mockReturnValue({
    score: 4,
    feedback: {
      warning: '',
      suggestions: []
    },
    crack_times_seconds: {
      online_throttling_100_per_hour: 1e10,
      online_no_throttling_10_per_second: 1e8,
      offline_slow_hashing_1e4_per_second: 1e6,
      offline_fast_hashing_1e10_per_second: 1e4
    },
    crack_times_display: {
      online_throttling_100_per_hour: 'centuries',
      online_no_throttling_10_per_second: 'years',
      offline_slow_hashing_1e4_per_second: 'days',
      offline_fast_hashing_1e10_per_second: 'hours'
    }
  })
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

describe('PassphraseGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render passphrase generator interface', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    expect(screen.getByText('Passphrase Generator')).toBeInTheDocument();
    expect(screen.getByText('Generate memorable passphrases using the diceware methodology')).toBeInTheDocument();
    expect(screen.getByText('🎲 Generate Passphrase')).toBeInTheDocument();
  });

  it('should show initial empty state', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    expect(screen.getByText('Configure your settings and click "Generate Passphrase" to create a memorable passphrase.')).toBeInTheDocument();
  });

  it('should allow word count adjustment', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const wordCountSlider = screen.getByDisplayValue('4');
    fireEvent.change(wordCountSlider, { target: { value: '6' } });
    
    expect(screen.getByText('Number of Words: 6')).toBeInTheDocument();
  });

  it('should allow word list selection', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const wordListSelect = screen.getByDisplayValue('EFF Large');
    fireEvent.change(wordListSelect, { target: { value: 'original' } });
    
    expect(wordListSelect).toHaveValue('original');
  });

  it('should allow separator selection', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const spaceButton = screen.getByText('Space ( )');
    fireEvent.click(spaceButton);
    
    expect(spaceButton).toHaveClass('bg-sky-600');
  });

  it('should allow custom separator input', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const customSeparatorInput = screen.getByPlaceholderText('Custom separator...');
    fireEvent.change(customSeparatorInput, { target: { value: '|' } });
    
    expect(customSeparatorInput).toHaveValue('|');
  });

  it('should allow capitalization option selection', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const allWordsRadio = screen.getByLabelText('All words');
    fireEvent.click(allWordsRadio);
    
    expect(allWordsRadio).toBeChecked();
  });

  it('should allow toggling include numbers', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const includeNumbersCheckbox = screen.getByLabelText('Add numbers at the end (10-99)');
    fireEvent.click(includeNumbersCheckbox);
    
    expect(includeNumbersCheckbox).toBeChecked();
  });

  it('should generate passphrase when button is clicked', async () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('correct-horse-battery-staple')).toBeInTheDocument();
    });
  });

  it('should show loading state during generation', async () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    fireEvent.click(generateButton);
    
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    });
  });

  it('should display passphrase stats after generation', async () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument(); // Word count
      expect(screen.getByText('28')).toBeInTheDocument(); // Length
      expect(screen.getByText('51.6 bits')).toBeInTheDocument(); // Entropy
    });
  });

  it('should show strength analysis after generation', async () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Strength Analysis')).toBeInTheDocument();
    });
  });

  it('should copy passphrase to clipboard', async () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    // Generate passphrase first
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('correct-horse-battery-staple')).toBeInTheDocument();
    });
    
    // Click copy button
    const copyButton = screen.getByText('📋 Copy');
    fireEvent.click(copyButton);
    
    // Should show success feedback
    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
    });
  });

  it('should regenerate passphrase when new button is clicked', async () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    // Generate first passphrase
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('correct-horse-battery-staple')).toBeInTheDocument();
    });
    
    // Click regenerate button
    const newButton = screen.getByText('🔄 New');
    fireEvent.click(newButton);
    
    // Should show loading state again
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    });
  });

  it('should validate word count constraints', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    // Test that the slider is constrained by HTML attributes
    const wordCountSlider = screen.getByDisplayValue('4');
    expect(wordCountSlider).toHaveAttribute('min', '3');
    expect(wordCountSlider).toHaveAttribute('max', '12');
    
    // Test that we can set valid values
    fireEvent.change(wordCountSlider, { target: { value: '6' } });
    expect(screen.getByText('Number of Words: 6')).toBeInTheDocument();
  });

  it('should validate separator length', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    // Set separator too long
    const customSeparatorInput = screen.getByPlaceholderText('Custom separator...');
    fireEvent.change(customSeparatorInput, { target: { value: 'toolong' } });
    
    expect(screen.getByText('Separator should be 3 characters or less')).toBeInTheDocument();
    
    // Generate button should be disabled
    const generateButton = screen.getByText('🎲 Generate Passphrase');
    expect(generateButton).toBeDisabled();
  });

  it('should show word list descriptions', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    expect(screen.getByText('EFF Large Wordlist (7776 words, ~12.9 bits/word)')).toBeInTheDocument();
  });

  it('should show security recommendation', () => {
    render(
      <AppProvider>
        <PassphraseGenerator />
      </AppProvider>
    );
    
    expect(screen.getByText('Recommended: 4-6 words for good security and memorability')).toBeInTheDocument();
  });
});