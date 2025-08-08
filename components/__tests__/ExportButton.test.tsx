import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '../ExportButton';
import { AnalysisData } from '../../services/interfaces';
import { ErrorType, AppError } from '../../types';

// Mock the ExportService
vi.mock('../../services/ExportService', () => ({
  exportService: {
    exportToPDF: vi.fn(),
    exportToText: vi.fn(),
    downloadFile: vi.fn()
  }
}));

describe('ExportButton', () => {
  let mockAnalysisData: AnalysisData;

  beforeEach(() => {
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
      }
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Export', () => {
    it('should render PDF export button with correct text', () => {
      render(<ExportButton data={mockAnalysisData} format="pdf" />);
      
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
      expect(screen.getByTitle('Export analysis report as PDF')).toBeInTheDocument();
    });

    it('should handle successful PDF export', async () => {
      const { exportService } = await import('../../services/ExportService');
      const mockBlob = new Blob(['mock pdf'], { type: 'application/pdf' });
      vi.mocked(exportService.exportToPDF).mockResolvedValue(mockBlob);
      vi.mocked(exportService.downloadFile).mockImplementation(() => {});

      render(<ExportButton data={mockAnalysisData} format="pdf" />);
      
      const button = screen.getByText('Export PDF');
      fireEvent.click(button);

      expect(screen.getByText('Exporting PDF...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      });

      expect(exportService.exportToPDF).toHaveBeenCalledWith(
        mockAnalysisData,
        expect.objectContaining({
          title: 'Password Analysis Report',
          includeTimestamp: true,
          includeRecommendations: true
        })
      );
      expect(exportService.downloadFile).toHaveBeenCalledWith(
        mockBlob,
        expect.stringMatching(/password-analysis-\d{4}-\d{2}-\d{2}\.pdf/)
      );
    });

    it('should handle PDF export errors', async () => {
      const { exportService } = await import('../../services/ExportService');
      const error = new AppError({
        type: ErrorType.EXPORT_FAILED,
        message: 'PDF generation failed',
        recoverable: true
      });
      vi.mocked(exportService.exportToPDF).mockRejectedValue(error);

      render(<ExportButton data={mockAnalysisData} format="pdf" />);
      
      const button = screen.getByText('Export PDF');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('PDF generation failed Try exporting as text format instead.')).toBeInTheDocument();
      });
    });
  });

  describe('Text Export', () => {
    it('should render text export button with correct text', () => {
      render(<ExportButton data={mockAnalysisData} format="text" />);
      
      expect(screen.getByText('Export TEXT')).toBeInTheDocument();
      expect(screen.getByTitle('Export analysis report as TEXT')).toBeInTheDocument();
    });

    it('should handle successful text export', async () => {
      const { exportService } = await import('../../services/ExportService');
      const mockTextContent = 'Mock text report content';
      vi.mocked(exportService.exportToText).mockReturnValue(mockTextContent);
      vi.mocked(exportService.downloadFile).mockImplementation(() => {});

      render(<ExportButton data={mockAnalysisData} format="text" />);
      
      const button = screen.getByText('Export TEXT');
      fireEvent.click(button);

      // Text export is synchronous, so it might complete immediately
      // Check for either loading or success state
      try {
        expect(screen.getByText('Exporting TEXT...')).toBeInTheDocument();
      } catch {
        // If loading state is not found, check for success state
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      }

      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      });

      expect(exportService.exportToText).toHaveBeenCalledWith(mockAnalysisData);
      expect(exportService.downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/password-analysis-\d{4}-\d{2}-\d{2}\.txt/)
      );
    });

    it('should handle text export errors', async () => {
      const { exportService } = await import('../../services/ExportService');
      const error = new AppError({
        type: ErrorType.EXPORT_FAILED,
        message: 'Text generation failed',
        recoverable: true
      });
      vi.mocked(exportService.exportToText).mockImplementation(() => {
        throw error;
      });

      render(<ExportButton data={mockAnalysisData} format="text" />);
      
      const button = screen.getByText('Export TEXT');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Text generation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Props', () => {
    it('should use custom filename when provided', async () => {
      const { exportService } = await import('../../services/ExportService');
      vi.mocked(exportService.exportToText).mockReturnValue('mock content');
      vi.mocked(exportService.downloadFile).mockImplementation(() => {});

      render(
        <ExportButton 
          data={mockAnalysisData} 
          format="text" 
          filename="custom-report.txt"
        />
      );
      
      const button = screen.getByText('Export TEXT');
      fireEvent.click(button);

      await waitFor(() => {
        expect(exportService.downloadFile).toHaveBeenCalledWith(
          expect.any(Blob),
          'custom-report.txt'
        );
      });
    });

    it('should render custom children when provided', () => {
      render(
        <ExportButton data={mockAnalysisData} format="pdf">
          Custom Export Text
        </ExportButton>
      );
      
      expect(screen.getByText('Custom Export Text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <ExportButton 
          data={mockAnalysisData} 
          format="pdf" 
          className="custom-class"
        />
      );
      
      const button = screen.getByText('Export PDF');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during export', async () => {
      const { exportService } = await import('../../services/ExportService');
      // Create a promise that we can control
      let resolveExport: (value: Blob) => void;
      const exportPromise = new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      });
      vi.mocked(exportService.exportToPDF).mockReturnValue(exportPromise);

      render(<ExportButton data={mockAnalysisData} format="pdf" />);
      
      const button = screen.getByText('Export PDF');
      fireEvent.click(button);

      expect(screen.getByText('Exporting PDF...')).toBeInTheDocument();
      expect(button).toBeDisabled();

      // Resolve the promise
      resolveExport!(new Blob());
      
      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      });
    });

    it('should clear success state after timeout', async () => {
      const { exportService } = await import('../../services/ExportService');
      vi.mocked(exportService.exportToText).mockReturnValue('mock content');
      vi.mocked(exportService.downloadFile).mockImplementation(() => {});

      render(<ExportButton data={mockAnalysisData} format="text" />);
      
      const button = screen.getByText('Export TEXT');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      });

      // Wait for success state to clear (3 seconds + buffer)
      await waitFor(() => {
        expect(screen.getByText('Export TEXT')).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('should clear error state after timeout', async () => {
      const { exportService } = await import('../../services/ExportService');
      vi.mocked(exportService.exportToText).mockImplementation(() => {
        throw new Error('Export failed');
      });

      render(<ExportButton data={mockAnalysisData} format="text" />);
      
      const button = screen.getByText('Export TEXT');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
      });

      // Wait for error state to clear (5 seconds + buffer)
      await waitFor(() => {
        expect(screen.getByText('Export TEXT')).toBeInTheDocument();
      }, { timeout: 7000 });
    }, 8000);
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ExportButton data={mockAnalysisData} format="pdf" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Export analysis report as PDF');
    });

    it('should be keyboard accessible', () => {
      render(<ExportButton data={mockAnalysisData} format="pdf" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });
  });
});