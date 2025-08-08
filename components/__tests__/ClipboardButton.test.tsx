import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClipboardButton } from '../ClipboardButton';
import { ClipboardServiceImpl } from '../../services/ClipboardService';

// Mock the ClipboardService
vi.mock('../../services/ClipboardService');

const mockClipboardService = {
  copy: vi.fn(),
  isSupported: vi.fn(),
  scheduleCleanup: vi.fn(),
  hasClipboardPermission: vi.fn(),
  getClipboardErrorMessage: vi.fn(),
  cleanup: vi.fn()
};

describe('ClipboardButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ClipboardServiceImpl.getInstance as any).mockReturnValue(mockClipboardService);
    mockClipboardService.copy.mockResolvedValue(true);
    mockClipboardService.isSupported.mockReturnValue(true);
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<ClipboardButton content="test content" />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<ClipboardButton content="test content" label="Copy Password" />);
      
      expect(screen.getByText('Copy Password')).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<ClipboardButton content="test" size="sm" />);
      expect(screen.getByRole('button')).toHaveClass('px-2', 'py-1', 'text-xs');

      rerender(<ClipboardButton content="test" size="md" />);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'text-sm');

      rerender(<ClipboardButton content="test" size="lg" />);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-3', 'text-base');
    });

    it('should render with different variants', () => {
      const { rerender } = render(<ClipboardButton content="test" variant="primary" />);
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600', 'border-blue-600');

      rerender(<ClipboardButton content="test" variant="secondary" />);
      expect(screen.getByRole('button')).toHaveClass('bg-gray-700', 'border-gray-600');

      rerender(<ClipboardButton content="test" variant="ghost" />);
      expect(screen.getByRole('button')).toHaveClass('bg-transparent', 'border-gray-600');
    });

    it('should be disabled when content is empty', () => {
      render(<ClipboardButton content="" />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<ClipboardButton content="test" disabled={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(<ClipboardButton content="test" className="custom-class" />);
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('copy functionality', () => {
    it('should call clipboard service when clicked', async () => {
      render(<ClipboardButton content="test content" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockClipboardService.copy).toHaveBeenCalledWith('test content', {
        autoClean: true,
        cleanupDelay: 30000,
        showFeedback: true
      });
    });

    it('should show success state after successful copy', async () => {
      mockClipboardService.copy.mockResolvedValue(true);
      
      render(<ClipboardButton content="test content" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      expect(screen.getByRole('button')).toHaveClass('bg-green-600');
    });

    it('should show error state after failed copy', async () => {
      mockClipboardService.copy.mockResolvedValue(false);
      
      render(<ClipboardButton content="test content" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      });

      expect(screen.getByRole('button')).toHaveClass('bg-red-600');
    });

    it('should show copying state during operation', async () => {
      let resolvePromise: (value: boolean) => void;
      const copyPromise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      mockClipboardService.copy.mockReturnValue(copyPromise);
      
      render(<ClipboardButton content="test content" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(screen.getByText('Copying...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('opacity-75', 'cursor-wait');
      
      resolvePromise!(true);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should handle clipboard service exceptions', async () => {
      mockClipboardService.copy.mockRejectedValue(new Error('Clipboard error'));
      
      render(<ClipboardButton content="test content" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not call clipboard service when disabled', () => {
      render(<ClipboardButton content="test content" disabled={true} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockClipboardService.copy).not.toHaveBeenCalled();
    });

    it('should not call clipboard service when content is empty', () => {
      render(<ClipboardButton content="" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockClipboardService.copy).not.toHaveBeenCalled();
    });
  });

  describe('clipboard options', () => {
    it('should pass custom options to clipboard service', async () => {
      render(
        <ClipboardButton 
          content="test content"
          autoClean={false}
          cleanupDelay={5000}
          showFeedback={false}
        />
      );
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockClipboardService.copy).toHaveBeenCalledWith('test content', {
        autoClean: false,
        cleanupDelay: 5000,
        showFeedback: false
      });
    });
  });

  describe('accessibility', () => {
    it('should have appropriate title attribute for idle state', () => {
      render(<ClipboardButton content="short" />);
      
      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Copy "short" to clipboard'
      );
    });

    it('should have appropriate title attribute for long content', () => {
      const longContent = 'this is a very long content that should be truncated in the title';
      render(<ClipboardButton content={longContent} />);
      
      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Copy content to clipboard'
      );
    });



    it('should have focus styles', () => {
      render(<ClipboardButton content="test" />);
      
      expect(screen.getByRole('button')).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500'
      );
    });

    it('should be keyboard accessible', () => {
      render(<ClipboardButton content="test content" />);
      
      const button = screen.getByRole('button');
      
      // Test that the button can receive focus
      button.focus();
      expect(button).toHaveFocus();
      
      // Test that clicking works (keyboard accessibility is handled by the browser for buttons)
      fireEvent.click(button);
      
      expect(mockClipboardService.copy).toHaveBeenCalledWith('test content', {
        autoClean: true,
        cleanupDelay: 30000,
        showFeedback: true
      });
    });
  });

  describe('icons', () => {
    it('should show clipboard icon in idle state', () => {
      render(<ClipboardButton content="test" />);
      
      // Check that the clipboard icon is present (by checking for SVG)
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
    });

    it('should show animated clipboard icon in copying state', async () => {
      let resolvePromise: (value: boolean) => void;
      const copyPromise = new Promise<boolean>((resolve) => {
        resolvePromise = resolve;
      });
      mockClipboardService.copy.mockReturnValue(copyPromise);
      
      render(<ClipboardButton content="test" />);
      
      fireEvent.click(screen.getByRole('button'));
      
      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toHaveClass('animate-pulse');
      
      resolvePromise!(true);
    });


  });
});