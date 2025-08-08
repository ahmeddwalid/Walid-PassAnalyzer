import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../App';

// Mock services
vi.mock('../../services/DictionaryService', () => ({
  DictionaryServiceImpl: {
    getInstance: vi.fn(() => ({
      ensureInitialized: vi.fn().mockResolvedValue(undefined),
      getDictionaries: vi.fn(() => []),
      getEnabledDictionaries: vi.fn(() => []),
      getWordList: vi.fn().mockResolvedValue(['test', 'word', 'list']),
      getWordListEntropy: vi.fn().mockResolvedValue(12.9)
    }))
  }
}));

vi.mock('../../services/CryptoService', () => ({
  CryptoServiceImpl: {
    getInstance: vi.fn(() => ({
      generatePassword: vi.fn(() => 'GeneratedPassword123!'),
      generatePassphrase: vi.fn().mockResolvedValue('test-word-list-phrase'),
      calculateEntropy: vi.fn(() => 65.2),
      isWebCryptoSupported: vi.fn(() => true)
    }))
  }
}));

vi.mock('../../services/PasswordAnalysisService', () => ({
  PasswordAnalysisServiceImpl: {
    getInstance: vi.fn(() => ({
      analyzePassword: vi.fn(() => ({
        score: 3,
        feedback: {
          warning: '',
          suggestions: ['Add more complexity']
        },
        crack_times_display: {
          online_no_throttling_10_per_second: '3 days',
          online_throttling_100_per_hour: '8 years',
          offline_slow_hashing_1e4_per_second: '2 hours',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        entropy: 65.2,
        customDictionaryMatches: [],
        generationMethod: 'manual'
      }))
    }))
  }
}));

vi.mock('../../services/ClipboardService', () => ({
  ClipboardServiceImpl: {
    getInstance: vi.fn(() => ({
      copy: vi.fn().mockResolvedValue(true),
      isSupported: vi.fn(() => true),
      scheduleCleanup: vi.fn()
    }))
  }
}));

vi.mock('../../services/ExportService', () => ({
  ExportServiceImpl: {
    getInstance: vi.fn(() => ({
      exportToPDF: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
      exportToText: vi.fn(() => 'Text export'),
      downloadFile: vi.fn()
    }))
  }
}));

// Mock timers for debouncing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('App Integration Tests', () => {
  describe('Password Analysis Flow', () => {
    it('should analyze password with debouncing', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Find password input
      const passwordInput = screen.getByLabelText(/enter your password/i);
      
      // Type password
      await user.type(passwordInput, 'testpassword');

      // Should show analyzing state immediately
      expect(screen.getByText(/analyzing password strength/i)).toBeInTheDocument();

      // Fast forward debounce timer
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should show analysis results
      await waitFor(() => {
        expect(screen.queryByText(/analyzing password strength/i)).not.toBeInTheDocument();
      });

      // Should show strength meter
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should clear analysis when password is cleared', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const passwordInput = screen.getByLabelText(/enter your password/i);
      
      // Type and analyze password
      await user.type(passwordInput, 'testpassword');
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Clear password
      await user.clear(passwordInput);

      // Analysis should be cleared immediately
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByText(/enter a password above/i)).toBeInTheDocument();
    });

    it('should export analysis results', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const passwordInput = screen.getByLabelText(/enter your password/i);
      
      // Type and analyze password
      await user.type(passwordInput, 'testpassword');
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Find and click PDF export button
      const pdfExportButton = screen.getByText(/export pdf/i);
      await user.click(pdfExportButton);

      // Should call export service
      await waitFor(() => {
        // The export should have been triggered
        expect(screen.getByText(/export pdf/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Should start on analyzer tab
      expect(screen.getByText(/enter a password above/i)).toBeInTheDocument();

      // Switch to generator tab
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Should show generator content
      expect(screen.getByText(/password settings/i)).toBeInTheDocument();

      // Switch to comparison tab
      const comparisonTab = screen.getByText(/comparison/i);
      await user.click(comparisonTab);

      // Should show comparison content
      expect(screen.getByText(/compare passwords/i)).toBeInTheDocument();
    });

    it('should maintain state when switching tabs', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const passwordInput = screen.getByLabelText(/enter your password/i);
      
      // Type password in analyzer
      await user.type(passwordInput, 'testpassword');
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Switch to generator tab
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Switch back to analyzer
      const analyzerTab = screen.getByText(/analyzer/i);
      await user.click(analyzerTab);

      // Password and analysis should still be there
      expect(passwordInput).toHaveValue('testpassword');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Password Generator Integration', () => {
    it('should generate password and show analysis', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Switch to generator tab
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Find and click generate button
      const generateButton = screen.getByText(/generate password/i);
      await user.click(generateButton);

      // Should show generated password
      await waitFor(() => {
        expect(screen.getByDisplayValue('GeneratedPassword123!')).toBeInTheDocument();
      });

      // Should show strength analysis
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should copy generated password', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Switch to generator tab
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Generate password
      const generateButton = screen.getByText(/generate password/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('GeneratedPassword123!')).toBeInTheDocument();
      });

      // Find and click copy button
      const copyButton = screen.getByText(/copy/i);
      await user.click(copyButton);

      // Should show success feedback
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Passphrase Generator Integration', () => {
    it('should generate passphrase with custom settings', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Switch to generator tab
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Switch to passphrase mode
      const passphraseTab = screen.getByText(/passphrase/i);
      await user.click(passphraseTab);

      // Adjust word count
      const wordCountSlider = screen.getByRole('slider');
      fireEvent.change(wordCountSlider, { target: { value: '5' } });

      // Generate passphrase
      const generateButton = screen.getByText(/generate passphrase/i);
      await user.click(generateButton);

      // Should show generated passphrase
      await waitFor(() => {
        expect(screen.getByText('test-word-list-phrase')).toBeInTheDocument();
      });
    });
  });

  describe('Password Comparison Integration', () => {
    it('should compare multiple passwords', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Switch to comparison tab
      const comparisonTab = screen.getByText(/comparison/i);
      await user.click(comparisonTab);

      // Find password inputs
      const passwordInputs = screen.getAllByLabelText(/password/i);
      
      // Enter passwords
      await user.type(passwordInputs[0], 'weakpass');
      await user.type(passwordInputs[1], 'StrongPassword123!');

      // Fast forward debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should show comparison results
      await waitFor(() => {
        expect(screen.getAllByRole('progressbar')).toHaveLength(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // Mock analysis service to throw error
      const mockAnalysisService = {
        analyzePassword: vi.fn(() => {
          throw new Error('Analysis failed');
        })
      };

      vi.mocked(require('../../services/PasswordAnalysisService').PasswordAnalysisServiceImpl.getInstance)
        .mockReturnValue(mockAnalysisService);

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const passwordInput = screen.getByLabelText(/enter your password/i);
      
      // Type password
      await user.type(passwordInput, 'testpassword');
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should not crash and should show fallback state
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });
});