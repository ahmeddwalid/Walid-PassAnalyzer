import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import App from '../../App';

// Mock all services for E2E testing
const mockServices = {
  dictionaryService: {
    ensureInitialized: vi.fn().mockResolvedValue(undefined),
    getDictionaries: vi.fn(() => [
      {
        id: 'eff',
        name: 'EFF Large Wordlist',
        words: ['correct', 'horse', 'battery', 'staple', 'test', 'word'],
        enabled: true,
        source: 'builtin'
      }
    ]),
    getEnabledDictionaries: vi.fn(() => []),
    getWordList: vi.fn().mockResolvedValue(['correct', 'horse', 'battery', 'staple']),
    getWordListEntropy: vi.fn().mockResolvedValue(12.9),
    loadDictionary: vi.fn(),
    addDictionary: vi.fn(),
    removeDictionary: vi.fn(),
    toggleDictionary: vi.fn()
  },
  cryptoService: {
    generatePassword: vi.fn(() => 'Kx9#mP2$vL8@'),
    generatePassphrase: vi.fn().mockResolvedValue('correct-horse-battery-staple'),
    calculateEntropy: vi.fn(() => 65.2),
    isWebCryptoSupported: vi.fn(() => true),
    generateSecureRandom: vi.fn(() => new Uint8Array([1, 2, 3, 4]))
  },
  passwordAnalysisService: {
    analyzePassword: vi.fn((password) => ({
      score: password.length > 12 ? 4 : password.length > 8 ? 3 : 2,
      feedback: {
        warning: password.includes('password') ? 'Common password detected' : '',
        suggestions: password.length < 8 ? ['Make it longer'] : ['Good password']
      },
      crack_times_display: {
        online_no_throttling_10_per_second: '3 days',
        online_throttling_100_per_hour: '8 years',
        offline_slow_hashing_1e4_per_second: '2 hours',
        offline_fast_hashing_1e10_per_second: '1 second'
      },
      entropy: password.length * 4,
      customDictionaryMatches: [],
      generationMethod: 'manual'
    }))
  },
  clipboardService: {
    copy: vi.fn().mockResolvedValue(true),
    isSupported: vi.fn(() => true),
    scheduleCleanup: vi.fn()
  },
  exportService: {
    exportToPDF: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    exportToText: vi.fn(() => 'PASSWORD ANALYSIS REPORT\n======================\nTest report content'),
    downloadFile: vi.fn()
  }
};

// Mock all service modules
vi.mock('../../services/DictionaryService', () => ({
  DictionaryServiceImpl: {
    getInstance: vi.fn(() => mockServices.dictionaryService)
  }
}));

vi.mock('../../services/CryptoService', () => ({
  CryptoServiceImpl: {
    getInstance: vi.fn(() => mockServices.cryptoService)
  }
}));

vi.mock('../../services/PasswordAnalysisService', () => ({
  PasswordAnalysisServiceImpl: {
    getInstance: vi.fn(() => mockServices.passwordAnalysisService)
  }
}));

vi.mock('../../services/ClipboardService', () => ({
  ClipboardServiceImpl: {
    getInstance: vi.fn(() => mockServices.clipboardService)
  }
}));

vi.mock('../../services/ExportService', () => ({
  ExportServiceImpl: {
    getInstance: vi.fn(() => mockServices.exportService)
  }
}));

// Mock URL.createObjectURL for file downloads
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('End-to-End User Workflows', () => {
  describe('Complete Password Analysis Workflow', () => {
    it('should complete full password analysis workflow', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Step 1: User enters a password
      const passwordInput = screen.getByLabelText(/enter your password/i);
      await user.type(passwordInput, 'MySecurePassword123!');

      // Step 2: System shows analyzing state
      expect(screen.getByText(/analyzing password strength/i)).toBeInTheDocument();

      // Step 3: Wait for debounced analysis
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Step 4: Analysis results appear
      await waitFor(() => {
        expect(screen.queryByText(/analyzing password strength/i)).not.toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Step 5: User views detailed feedback
      expect(screen.getByText(/good password/i)).toBeInTheDocument();

      // Step 6: User exports PDF report
      const pdfExportButton = screen.getByText(/export pdf/i);
      await user.click(pdfExportButton);

      await waitFor(() => {
        expect(mockServices.exportService.exportToPDF).toHaveBeenCalled();
        expect(mockServices.exportService.downloadFile).toHaveBeenCalled();
      });

      // Step 7: User exports text report
      const textExportButton = screen.getByText(/export text/i);
      await user.click(textExportButton);

      await waitFor(() => {
        expect(mockServices.exportService.exportToText).toHaveBeenCalled();
        expect(mockServices.exportService.downloadFile).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle weak password analysis workflow', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Enter weak password
      const passwordInput = screen.getByLabelText(/enter your password/i);
      await user.type(passwordInput, 'password123');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Should show warning for common password
      expect(screen.getByText(/common password detected/i)).toBeInTheDocument();
      expect(screen.getByText(/make it longer/i)).toBeInTheDocument();
    });
  });

  describe('Password Generation Workflow', () => {
    it('should complete password generation and analysis workflow', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Step 1: Navigate to generator
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Step 2: Customize password settings
      const lengthSlider = screen.getByLabelText(/password length/i);
      fireEvent.change(lengthSlider, { target: { value: '16' } });

      const includeSymbols = screen.getByLabelText(/include symbols/i);
      await user.click(includeSymbols);

      // Step 3: Generate password
      const generateButton = screen.getByText(/generate password/i);
      await user.click(generateButton);

      // Step 4: Verify password is generated and analyzed
      await waitFor(() => {
        expect(screen.getByDisplayValue('Kx9#mP2$vL8@')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Step 5: Copy password to clipboard
      const copyButton = screen.getByText(/copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(mockServices.clipboardService.copy).toHaveBeenCalledWith('Kx9#mP2$vL8@', expect.any(Object));
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });

      // Step 6: Regenerate password
      const regenerateButton = screen.getByText(/regenerate/i);
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(mockServices.cryptoService.generatePassword).toHaveBeenCalledTimes(2);
      });
    });

    it('should complete passphrase generation workflow', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to generator
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      // Switch to passphrase mode
      const passphraseTab = screen.getByText(/passphrase/i);
      await user.click(passphraseTab);

      // Customize passphrase settings
      const wordCountSlider = screen.getByRole('slider');
      fireEvent.change(wordCountSlider, { target: { value: '5' } });

      const includeNumbers = screen.getByLabelText(/add numbers/i);
      await user.click(includeNumbers);

      // Generate passphrase
      const generateButton = screen.getByText(/generate passphrase/i);
      await user.click(generateButton);

      // Verify passphrase generation
      await waitFor(() => {
        expect(mockServices.cryptoService.generatePassphrase).toHaveBeenCalledWith({
          wordCount: 5,
          wordList: 'eff',
          separator: '-',
          capitalize: 'none',
          includeNumbers: true
        });
        expect(screen.getByText('correct-horse-battery-staple')).toBeInTheDocument();
      });
    });
  });

  describe('Password Comparison Workflow', () => {
    it('should complete password comparison workflow', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Navigate to comparison
      const comparisonTab = screen.getByText(/comparison/i);
      await user.click(comparisonTab);

      // Enter multiple passwords for comparison
      const passwordInputs = screen.getAllByLabelText(/password/i);
      
      await user.type(passwordInputs[0], 'weakpass');
      await user.type(passwordInputs[1], 'StrongPassword123!');
      await user.type(passwordInputs[2], 'VeryStrongPassphrase2024!');

      // Wait for debounced analysis
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Verify all passwords are analyzed
      await waitFor(() => {
        expect(mockServices.passwordAnalysisService.analyzePassword).toHaveBeenCalledTimes(3);
        expect(screen.getAllByRole('progressbar')).toHaveLength(3);
      });

      // Should show comparison results
      expect(screen.getByText(/strongest password/i)).toBeInTheDocument();

      // Add another password
      const addPasswordButton = screen.getByText(/add password/i);
      await user.click(addPasswordButton);

      const newPasswordInputs = screen.getAllByLabelText(/password/i);
      expect(newPasswordInputs).toHaveLength(4);

      await user.type(newPasswordInputs[3], 'AnotherPassword456#');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockServices.passwordAnalysisService.analyzePassword).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('Dictionary Management Workflow', () => {
    it('should complete custom dictionary workflow', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Navigate to dictionaries
      const dictionariesTab = screen.getByText(/dictionaries/i);
      await user.click(dictionariesTab);

      // Mock file for upload
      const mockFile = new File(['word1\nword2\nword3'], 'custom.txt', { type: 'text/plain' });
      
      // Mock successful dictionary loading
      mockServices.dictionaryService.loadDictionary.mockResolvedValue({
        id: 'custom-123',
        name: 'Custom Dictionary',
        words: ['word1', 'word2', 'word3'],
        enabled: true,
        source: 'user'
      });

      // Upload dictionary file
      const fileInput = screen.getByLabelText(/upload dictionary/i);
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(mockServices.dictionaryService.loadDictionary).toHaveBeenCalledWith(mockFile);
        expect(mockServices.dictionaryService.addDictionary).toHaveBeenCalled();
      });

      // Toggle dictionary
      const toggleButton = screen.getByLabelText(/enable custom dictionary/i);
      await user.click(toggleButton);

      expect(mockServices.dictionaryService.toggleDictionary).toHaveBeenCalled();

      // Remove dictionary
      const removeButton = screen.getByText(/remove/i);
      await user.click(removeButton);

      expect(mockServices.dictionaryService.removeDictionary).toHaveBeenCalled();
    });
  });

  describe('Cross-Tab Data Flow', () => {
    it('should maintain data consistency across tabs', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      // Start with password analysis
      const passwordInput = screen.getByLabelText(/enter your password/i);
      await user.type(passwordInput, 'TestPassword123');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Switch to generator and generate password
      const generatorTab = screen.getByText(/generator/i);
      await user.click(generatorTab);

      const generateButton = screen.getByText(/generate password/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Kx9#mP2$vL8@')).toBeInTheDocument();
      });

      // Switch back to analyzer
      const analyzerTab = screen.getByText(/analyzer/i);
      await user.click(analyzerTab);

      // Original password should still be there
      expect(passwordInput).toHaveValue('TestPassword123');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Switch to comparison and verify generated password can be used
      const comparisonTab = screen.getByText(/comparison/i);
      await user.click(comparisonTab);

      const comparisonInputs = screen.getAllByLabelText(/password/i);
      await user.type(comparisonInputs[0], 'Kx9#mP2$vL8@'); // Use generated password

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle and recover from service errors', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      // Mock service failure
      mockServices.passwordAnalysisService.analyzePassword.mockImplementationOnce(() => {
        throw new Error('Service temporarily unavailable');
      });

      render(<App />);

      const passwordInput = screen.getByLabelText(/enter your password/i);
      await user.type(passwordInput, 'TestPassword');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should not crash, should show fallback state
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      // Service should recover on next attempt
      mockServices.passwordAnalysisService.analyzePassword.mockImplementation((password) => ({
        score: 3,
        feedback: { warning: '', suggestions: ['Good recovery'] },
        crack_times_display: {
          online_no_throttling_10_per_second: '3 days',
          online_throttling_100_per_hour: '8 years',
          offline_slow_hashing_1e4_per_second: '2 hours',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        entropy: 45,
        customDictionaryMatches: [],
        generationMethod: 'manual'
      }));

      // Try again
      await user.clear(passwordInput);
      await user.type(passwordInput, 'RecoveryPassword');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText(/good recovery/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle rapid password changes efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      const passwordInput = screen.getByLabelText(/enter your password/i);

      // Rapid typing simulation
      await user.type(passwordInput, 'a');
      await user.type(passwordInput, 'b');
      await user.type(passwordInput, 'c');
      await user.type(passwordInput, 'd');
      await user.type(passwordInput, 'e');

      // Should show analyzing state
      expect(screen.getByText(/analyzing password strength/i)).toBeInTheDocument();

      // Only the final debounced call should trigger analysis
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should have been called only once due to debouncing
        expect(mockServices.passwordAnalysisService.analyzePassword).toHaveBeenCalledTimes(1);
        expect(mockServices.passwordAnalysisService.analyzePassword).toHaveBeenCalledWith('abcde', []);
      });
    });

    it('should handle multiple tab switches efficiently', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Rapid tab switching
      const generatorTab = screen.getByText(/generator/i);
      const analyzerTab = screen.getByText(/analyzer/i);
      const comparisonTab = screen.getByText(/comparison/i);

      await user.click(generatorTab);
      await user.click(analyzerTab);
      await user.click(comparisonTab);
      await user.click(generatorTab);
      await user.click(analyzerTab);

      // Should end up on analyzer tab
      expect(screen.getByText(/enter a password above/i)).toBeInTheDocument();
    });
  });
});