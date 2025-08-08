import React, { useState } from 'react';
import { exportService } from '../services/ExportService';
import { AnalysisData, PDFOptions } from '../services/interfaces';
import { ErrorType, AppError } from '../types';

interface ExportButtonProps {
  data: AnalysisData;
  format: 'pdf' | 'text';
  filename?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  format,
  filename,
  className = '',
  children
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'pdf' ? 'pdf' : 'txt';
      const defaultFilename = `password-analysis-${timestamp}.${extension}`;
      const finalFilename = filename || defaultFilename;

      if (format === 'pdf') {
        const pdfOptions: PDFOptions = {
          title: 'Password Analysis Report',
          includeTimestamp: true,
          includeRecommendations: true
        };
        
        const blob = await exportService.exportToPDF(data, pdfOptions);
        exportService.downloadFile(blob, finalFilename);
      } else {
        const textContent = exportService.exportToText(data);
        const blob = new Blob([textContent], { type: 'text/plain' });
        exportService.downloadFile(blob, finalFilename);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      let errorMessage = 'Export failed. Please try again.';
      
      if (err instanceof AppError) {
        errorMessage = err.message;
        
        // If PDF export fails, suggest text format as alternative
        if (err.type === ErrorType.EXPORT_FAILED && format === 'pdf') {
          errorMessage += ' Try exporting as text format instead.';
        }
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const baseClasses = `
    inline-flex items-center justify-center px-4 py-2 text-sm font-medium
    rounded-md transition-colors duration-200 focus:outline-none focus:ring-2
    focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = success
    ? 'bg-green-600 text-white hover:bg-green-700'
    : error
    ? 'bg-red-600 text-white hover:bg-red-700'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  const buttonText = isExporting
    ? `Exporting ${format.toUpperCase()}...`
    : success
    ? 'Exported!'
    : error
    ? 'Export Failed'
    : children || `Export ${format.toUpperCase()}`;

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`${baseClasses} ${variantClasses} ${className}`}
        title={`Export analysis report as ${format.toUpperCase()}`}
      >
        {isExporting && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {success && !isExporting && (
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {error && !isExporting && (
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        {!isExporting && !success && !error && (
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
        {buttonText}
      </button>
      
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm max-w-xs z-10">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExportButton;