import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportServiceImpl } from '../ExportService';
import { AnalysisData, PDFOptions } from '../interfaces';
import { ErrorType, AppError } from '../../types';

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210)
      }
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    output: vi.fn(() => new Blob(['mock pdf'], { type: 'application/pdf' }))
  };

  return {
    default: vi.fn(() => mockDoc)
  };
});

describe('ExportService', () => {
  let exportService: ExportServiceImpl;
  let mockAnalysisData: AnalysisData;

  beforeEach(() => {
    exportService = new ExportServiceImpl();
    mockAnalysisData = {
      timestamp: new Date('2024-01-15T10:30:00Z'),
      passwordLength: 12,
      strengthScore: 3,
      crackTimes: {
        online_no_throttling_10_per_second: '3 days',
        online_throttling_100_per_hour: '8 years',
        offline_slow_hashing_1e4_per_second: '2 hours',
        offline_fast_hashing_1e10_per_second: '1 second'
      },
      feedback: {
        warning: 'This is a common password',
        suggestions: ['Add more words', 'Use uppercase letters']
      },
      customNotes: 'Test analysis notes'
    };

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    global.document.createElement = vi.fn(() => mockLink);
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToPDF', () => {
    it('should generate PDF with default options', async () => {
      const result = await exportService.exportToPDF(mockAnalysisData);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/pdf');
    });

    it('should generate PDF with custom options', async () => {
      const options: PDFOptions = {
        title: 'Custom Report Title',
        includeTimestamp: false,
        includeRecommendations: false
      };

      const result = await exportService.exportToPDF(mockAnalysisData, options);
      
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle PDF generation errors', async () => {
      // Mock jsPDF to throw an error
      const jsPDF = await import('jspdf');
      vi.mocked(jsPDF.default).mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      await expect(exportService.exportToPDF(mockAnalysisData))
        .rejects.toThrow(AppError);
    });

    it('should include all required sections in PDF', async () => {
      const jsPDF = await import('jspdf');
      const mockDoc = {
        internal: { pageSize: { getWidth: () => 210 } },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        setLineWidth: vi.fn(),
        line: vi.fn(),
        splitTextToSize: vi.fn((text: string) => [text]),
        output: vi.fn(() => new Blob(['mock pdf'], { type: 'application/pdf' }))
      };
      
      vi.mocked(jsPDF.default).mockReturnValue(mockDoc as any);

      await exportService.exportToPDF(mockAnalysisData);

      // Verify that text method was called with expected content
      expect(mockDoc.text).toHaveBeenCalledWith('Password Analysis Report', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Password Analysis', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Estimated Crack Times', expect.any(Number), expect.any(Number));
      expect(mockDoc.text).toHaveBeenCalledWith('Security Feedback', expect.any(Number), expect.any(Number));
    });
  });

  describe('exportToText', () => {
    it('should generate text report with all sections', () => {
      const result = exportService.exportToText(mockAnalysisData);
      
      expect(result).toContain('PASSWORD ANALYSIS REPORT');
      expect(result).toContain('Password Length: 12 characters');
      expect(result).toContain('Strength Score: 3/4 (Good)');
      expect(result).toContain('ESTIMATED CRACK TIMES');
      expect(result).toContain('Online (no throttling): 3 days');
      expect(result).toContain('SECURITY FEEDBACK');
      expect(result).toContain('Warning: This is a common password');
      expect(result).toContain('• Add more words');
      expect(result).toContain('• Use uppercase letters');
      expect(result).toContain('ADDITIONAL NOTES');
      expect(result).toContain('Test analysis notes');
      expect(result).toContain('SECURITY NOTICE');
    });

    it('should handle missing feedback gracefully', () => {
      const dataWithoutFeedback = {
        ...mockAnalysisData,
        feedback: { warning: '', suggestions: [] }
      };

      const result = exportService.exportToText(dataWithoutFeedback);
      
      expect(result).toContain('PASSWORD ANALYSIS REPORT');
      expect(result).not.toContain('SECURITY FEEDBACK');
    });

    it('should handle missing custom notes', () => {
      const dataWithoutNotes = {
        ...mockAnalysisData,
        customNotes: undefined
      };

      const result = exportService.exportToText(dataWithoutNotes);
      
      expect(result).toContain('PASSWORD ANALYSIS REPORT');
      expect(result).not.toContain('ADDITIONAL NOTES');
    });

    it('should throw AppError on text generation failure', () => {
      // Create invalid data that would cause an error
      const invalidData = null as any;

      expect(() => exportService.exportToText(invalidData))
        .toThrow(AppError);
    });
  });

  describe('downloadFile', () => {
    it('should create download link and trigger download', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test-file.txt';

      exportService.downloadFile(blob, filename);

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should handle download errors', () => {
      // Mock createElement to throw an error
      global.document.createElement = vi.fn(() => {
        throw new Error('DOM error');
      });

      const blob = new Blob(['test content'], { type: 'text/plain' });
      
      expect(() => exportService.downloadFile(blob, 'test.txt'))
        .toThrow(AppError);
    });
  });

  describe('getStrengthLabel', () => {
    it('should return correct strength labels', () => {
      const service = exportService as any; // Access private method
      
      expect(service.getStrengthLabel(0)).toBe('Very Weak');
      expect(service.getStrengthLabel(1)).toBe('Weak');
      expect(service.getStrengthLabel(2)).toBe('Fair');
      expect(service.getStrengthLabel(3)).toBe('Good');
      expect(service.getStrengthLabel(4)).toBe('Strong');
      expect(service.getStrengthLabel(5)).toBe('Unknown');
    });
  });

  describe('Error Handling', () => {
    it('should throw AppError with correct type for PDF failures', async () => {
      const jsPDF = await import('jspdf');
      vi.mocked(jsPDF.default).mockImplementation(() => {
        throw new Error('PDF error');
      });

      try {
        await exportService.exportToPDF(mockAnalysisData);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.EXPORT_FAILED);
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('should throw AppError with correct type for text failures', () => {
      try {
        exportService.exportToText(null as any);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.EXPORT_FAILED);
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('should throw AppError with correct type for download failures', () => {
      global.document.createElement = vi.fn(() => {
        throw new Error('DOM error');
      });

      try {
        exportService.downloadFile(new Blob(), 'test.txt');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.EXPORT_FAILED);
        expect((error as AppError).recoverable).toBe(false);
      }
    });
  });
});  d
escribe('lazy loading', () => {
    it('should lazy load jsPDF for PDF export', async () => {
      // Mock dynamic import
      const mockJsPDF = vi.fn(() => ({
        internal: {
          pageSize: {
            getWidth: vi.fn(() => 210)
          }
        },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        setLineWidth: vi.fn(),
        line: vi.fn(),
        splitTextToSize: vi.fn((text: string) => [text]),
        output: vi.fn(() => new Blob(['mock pdf'], { type: 'application/pdf' }))
      }));

      // Mock the dynamic import
      vi.doMock('jspdf', () => ({
        default: mockJsPDF
      }));

      const result = await exportService.exportToPDF(mockAnalysisData);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle jsPDF loading errors', async () => {
      // Mock dynamic import failure
      vi.doMock('jspdf', () => {
        throw new Error('Failed to load jsPDF');
      });

      await expect(exportService.exportToPDF(mockAnalysisData))
        .rejects.toThrow('Failed to generate PDF report');
    });

    it('should not load jsPDF for text export', () => {
      const result = exportService.exportToText(mockAnalysisData);
      expect(typeof result).toBe('string');
      expect(result).toContain('PASSWORD ANALYSIS REPORT');
    });
  });