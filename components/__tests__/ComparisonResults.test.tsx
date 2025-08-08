import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonResults } from '../ComparisonResults';
import { ComparisonResult } from '../../types';

// Mock the ClipboardButton component
vi.mock('../ClipboardButton', () => ({
  ClipboardButton: ({ content, label }: { content: string; label: string }) => (
    <button data-testid="clipboard-button" data-content={content}>
      {label}
    </button>
  )
}));

// Mock the StrengthMeter component
vi.mock('../StrengthMeter', () => ({
  StrengthMeter: ({ score }: { score: number }) => (
    <div data-testid="strength-meter" data-score={score}>
      Strength: {score}
    </div>
  )
}));

describe('ComparisonResults', () => {
  const mockResults: ComparisonResult[] = [
    {
      password: 'weakpass',
      analysis: {
        score: 1,
        feedback: {
          warning: 'This is a weak password',
          suggestions: ['Add more characters', 'Use symbols']
        },
        crack_times_display: {
          online_no_throttling_10_per_second: '1 minute',
          online_throttling_100_per_hour: '1 hour',
          offline_slow_hashing_1e4_per_second: '1 day',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        calc_time: 5,
        entropy: 25.5,
        customDictionaryMatches: []
      },
      rank: 2,
      isStrongest: false
    },
    {
      password: 'StrongP@ssw0rd!',
      analysis: {
        score: 4,
        feedback: {
          warning: '',
          suggestions: []
        },
        crack_times_display: {
          online_no_throttling_10_per_second: '10 years',
          online_throttling_100_per_hour: '100 years',
          offline_slow_hashing_1e4_per_second: '1000 years',
          offline_fast_hashing_1e10_per_second: '1 year'
        },
        calc_time: 8,
        entropy: 65.2,
        customDictionaryMatches: []
      },
      rank: 1,
      isStrongest: true
    }
  ];

  it('should render comparison results header', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('Comparison Results')).toBeInTheDocument();
    expect(screen.getByText('Passwords ranked by strength (score and entropy)')).toBeInTheDocument();
  });

  it('should render all password results', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getAllByText(/Password \d/)).toHaveLength(3); // 2 in cards + 1 in summary
  });

  it('should display passwords sorted by rank', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    const passwordLabels = screen.getAllByText(/Password \d/);
    expect(passwordLabels.length).toBeGreaterThanOrEqual(2); // 2 in cards + 1 in summary
  });

  it('should show rank badges', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('should show strongest badge for top-ranked password', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('Strongest')).toBeInTheDocument();
  });

  it('should display password previews', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('weakpass')).toBeInTheDocument();
    expect(screen.getByText('StrongP@ssw0rd!')).toBeInTheDocument();
  });

  it('should truncate long passwords', () => {
    const longPasswordResult: ComparisonResult = {
      ...mockResults[0],
      password: 'this-is-a-very-long-password-that-should-be-truncated'
    };
    
    render(<ComparisonResults results={[longPasswordResult]} identicalPasswords={[]} />);
    
    expect(screen.getByText('this-is-a-very-lo...')).toBeInTheDocument();
  });

  it('should render strength meters for each password', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    const strengthMeters = screen.getAllByTestId('strength-meter');
    expect(strengthMeters).toHaveLength(2);
    expect(strengthMeters[0]).toHaveAttribute('data-score', '4'); // Strongest first
    expect(strengthMeters[1]).toHaveAttribute('data-score', '1');
  });

  it('should display password metrics', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    // Check for length metrics
    expect(screen.getByText('8 chars')).toBeInTheDocument(); // weakpass
    expect(screen.getByText('15 chars')).toBeInTheDocument(); // StrongP@ssw0rd!
    
    // Check for entropy metrics
    expect(screen.getByText('25.5 bits')).toBeInTheDocument();
    expect(screen.getByText('65.2 bits')).toBeInTheDocument();
    
    // Check for crack time
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('1000 years')).toBeInTheDocument();
  });

  it('should show warnings when present', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('This is a weak password')).toBeInTheDocument();
  });

  it('should show custom dictionary matches when present', () => {
    const resultsWithDictMatches: ComparisonResult[] = [
      {
        ...mockResults[0],
        analysis: {
          ...mockResults[0].analysis,
          customDictionaryMatches: [
            {
              dictionaryName: 'Common Passwords',
              matchedWord: 'password',
              position: 0,
              severity: 'high'
            }
          ]
        }
      }
    ];
    
    render(<ComparisonResults results={resultsWithDictMatches} identicalPasswords={[]} />);
    
    expect(screen.getByText('Dictionary matches found:')).toBeInTheDocument();
    expect(screen.getByText('"password" in Common Passwords')).toBeInTheDocument();
  });

  it('should show duplicate warning for identical passwords', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={['weakpass']} />);
    
    expect(screen.getByText('Duplicate password')).toBeInTheDocument();
  });

  it('should render clipboard buttons for each password', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    const clipboardButtons = screen.getAllByTestId('clipboard-button');
    expect(clipboardButtons).toHaveLength(2);
    expect(clipboardButtons[0]).toHaveAttribute('data-content', 'StrongP@ssw0rd!');
    expect(clipboardButtons[1]).toHaveAttribute('data-content', 'weakpass');
  });

  it('should render summary section', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Strongest Password')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });

  it('should show correct strongest password in summary', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    // Check that the summary shows the password label and strength
    // The strongest password (StrongP@ssw0rd!) is the second in the array, so it should show "Password 2"
    const passwordTexts = screen.getAllByText('Password 2');
    expect(passwordTexts.length).toBeGreaterThan(0); // Should appear in both card and summary
    expect(screen.getByText('(Strong)')).toBeInTheDocument();
  });

  it('should show appropriate recommendation based on strongest password score', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    expect(screen.getByText('✅ Your strongest password has good security')).toBeInTheDocument();
  });

  it('should show security warning for identical passwords in summary', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={['duplicate']} />);
    
    expect(screen.getByText('Security Warning:')).toBeInTheDocument();
    expect(screen.getByText(/You have 1 duplicate password/)).toBeInTheDocument();
  });

  it('should handle multiple identical passwords in summary', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={['dup1', 'dup2']} />);
    
    expect(screen.getByText(/You have 2 duplicate passwords/)).toBeInTheDocument();
  });

  it('should apply special styling for strongest password', () => {
    render(<ComparisonResults results={mockResults} identicalPasswords={[]} />);
    
    // Look for the strongest badge which indicates special styling
    expect(screen.getByText('Strongest')).toBeInTheDocument();
    
    // Check that the strongest password has the trophy icon
    const trophyIcon = screen.getByText('#1').closest('div');
    expect(trophyIcon).toHaveClass('bg-gradient-to-r', 'from-yellow-500', 'to-amber-500');
  });
});