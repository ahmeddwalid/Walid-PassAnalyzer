import { ExportService, AnalysisData, PDFOptions } from './interfaces';
import { ErrorType, AppError } from '../types';

export class ExportServiceImpl implements ExportService {
  private static instance: ExportServiceImpl;

  private constructor() {}

  public static getInstance(): ExportServiceImpl {
    if (!ExportServiceImpl.instance) {
      ExportServiceImpl.instance = new ExportServiceImpl();
    }
    return ExportServiceImpl.instance;
  }

  /**
   * Lazy load jsPDF library
   */
  private async loadJsPDF(): Promise<any> {
    const { default: jsPDF } = await import('jspdf');
    return jsPDF;
  }

  /**
   * Export analysis data to PDF format
   */
  async exportToPDF(data: AnalysisData, options: PDFOptions = {}): Promise<Blob> {
    try {
      // Lazy load jsPDF to reduce initial bundle size
      const jsPDF = await this.loadJsPDF();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;

      // Set default options
      const pdfOptions = {
        title: 'Password Analysis Report',
        includeTimestamp: true,
        includeRecommendations: true,
        ...options
      };

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfOptions.title, margin, yPosition);
      yPosition += 15;

      // Timestamp
      if (pdfOptions.includeTimestamp) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${data.timestamp.toLocaleString()}`, margin, yPosition);
        yPosition += 10;
      }

      // Add separator line
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      // Password Analysis Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Password Analysis', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      // Basic metrics
      const metrics = [
        `Password Length: ${data.passwordLength} characters`,
        `Strength Score: ${data.strengthScore}/4 (${this.getStrengthLabel(data.strengthScore)})`,
      ];

      metrics.forEach(metric => {
        doc.text(metric, margin, yPosition);
        yPosition += 8;
      });

      yPosition += 5;

      // Crack Time Estimates
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Estimated Crack Times', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const crackTimes = [
        `Online (no throttling): ${data.crackTimes.online_no_throttling_10_per_second}`,
        `Online (throttled): ${data.crackTimes.online_throttling_100_per_hour}`,
        `Offline (slow hashing): ${data.crackTimes.offline_slow_hashing_1e4_per_second}`,
        `Offline (fast hashing): ${data.crackTimes.offline_fast_hashing_1e10_per_second}`
      ];

      crackTimes.forEach(time => {
        doc.text(time, margin, yPosition);
        yPosition += 7;
      });

      yPosition += 10;

      // Feedback Section
      if (data.feedback.warning || data.feedback.suggestions.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Security Feedback', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        if (data.feedback.warning) {
          doc.setFont('helvetica', 'bold');
          doc.text('Warning:', margin, yPosition);
          doc.setFont('helvetica', 'normal');
          yPosition += 7;
          
          // Wrap warning text
          const warningLines = doc.splitTextToSize(data.feedback.warning, pageWidth - 2 * margin);
          warningLines.forEach((line: string) => {
            doc.text(line, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 5;
        }

        if (data.feedback.suggestions.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Suggestions:', margin, yPosition);
          yPosition += 7;
          doc.setFont('helvetica', 'normal');

          data.feedback.suggestions.forEach((suggestion: string) => {
            const suggestionLines = doc.splitTextToSize(`• ${suggestion}`, pageWidth - 2 * margin - 10);
            suggestionLines.forEach((line: string) => {
              doc.text(line, margin + 5, yPosition);
              yPosition += 6;
            });
            yPosition += 2;
          });
        }
      }

      // Custom notes
      if (data.customNotes) {
        yPosition += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Additional Notes', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(data.customNotes, pageWidth - 2 * margin);
        notesLines.forEach((line: string) => {
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
      }

      // Security disclaimer
      yPosition += 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const disclaimer = 'Security Notice: This report does not contain the actual password for security reasons. All analysis was performed client-side without transmitting data to external servers.';
      const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
      disclaimerLines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });

      return doc.output('blob');
    } catch (error) {
      throw new AppError({
        type: ErrorType.EXPORT_FAILED,
        message: 'Failed to generate PDF report',
        details: error,
        recoverable: true
      });
    }
  }

  /**
   * Export analysis data to text format
   */
  exportToText(data: AnalysisData): string {
    try {
      const lines: string[] = [];
      
      lines.push('PASSWORD ANALYSIS REPORT');
      lines.push('='.repeat(50));
      lines.push('');
      lines.push(`Generated: ${data.timestamp.toLocaleString()}`);
      lines.push('');
      
      // Basic Analysis
      lines.push('BASIC ANALYSIS');
      lines.push('-'.repeat(20));
      lines.push(`Password Length: ${data.passwordLength} characters`);
      lines.push(`Strength Score: ${data.strengthScore}/4 (${this.getStrengthLabel(data.strengthScore)})`);
      lines.push('');
      
      // Crack Time Estimates
      lines.push('ESTIMATED CRACK TIMES');
      lines.push('-'.repeat(25));
      lines.push(`Online (no throttling): ${data.crackTimes.online_no_throttling_10_per_second}`);
      lines.push(`Online (throttled): ${data.crackTimes.online_throttling_100_per_hour}`);
      lines.push(`Offline (slow hashing): ${data.crackTimes.offline_slow_hashing_1e4_per_second}`);
      lines.push(`Offline (fast hashing): ${data.crackTimes.offline_fast_hashing_1e10_per_second}`);
      lines.push('');
      
      // Feedback
      if (data.feedback.warning || data.feedback.suggestions.length > 0) {
        lines.push('SECURITY FEEDBACK');
        lines.push('-'.repeat(20));
        
        if (data.feedback.warning) {
          lines.push(`Warning: ${data.feedback.warning}`);
          lines.push('');
        }
        
        if (data.feedback.suggestions.length > 0) {
          lines.push('Suggestions:');
          data.feedback.suggestions.forEach((suggestion: string) => {
            lines.push(`  • ${suggestion}`);
          });
          lines.push('');
        }
      }
      
      // Custom notes
      if (data.customNotes) {
        lines.push('ADDITIONAL NOTES');
        lines.push('-'.repeat(20));
        lines.push(data.customNotes);
        lines.push('');
      }
      
      // Security disclaimer
      lines.push('SECURITY NOTICE');
      lines.push('-'.repeat(15));
      lines.push('This report does not contain the actual password for security reasons.');
      lines.push('All analysis was performed client-side without transmitting data to external servers.');
      
      return lines.join('\n');
    } catch (error) {
      throw new AppError({
        type: ErrorType.EXPORT_FAILED,
        message: 'Failed to generate text report',
        details: error,
        recoverable: true
      });
    }
  }

  /**
   * Download a blob as a file
   */
  downloadFile(blob: Blob, filename: string): void {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new AppError({
        type: ErrorType.EXPORT_FAILED,
        message: 'Failed to download file',
        details: error,
        recoverable: false
      });
    }
  }

  /**
   * Get human-readable strength label
   */
  private getStrengthLabel(score: number): string {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[score] || 'Unknown';
  }
}

// Export singleton instance
export const exportService = ExportServiceImpl.getInstance();