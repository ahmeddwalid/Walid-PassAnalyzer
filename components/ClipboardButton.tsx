import React, { useState, useCallback } from 'react';
import { ClipboardIcon, ClipboardCheckIcon, ExclamationTriangleIcon } from './IconComponents';
import { ClipboardServiceImpl } from '../services/ClipboardService';
import { ClipboardOptions } from '../services/interfaces';

interface ClipboardButtonProps {
  content: string;
  label?: string;
  autoClean?: boolean;
  cleanupDelay?: number;
  showFeedback?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

type CopyState = 'idle' | 'copying' | 'success' | 'error';

export const ClipboardButton: React.FC<ClipboardButtonProps> = ({
  content,
  label = 'Copy',
  autoClean = true,
  cleanupDelay = 30000,
  showFeedback = true,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'secondary'
}) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const clipboardService = ClipboardServiceImpl.getInstance();

  const handleCopy = useCallback(async () => {
    if (disabled || !content) return;

    setCopyState('copying');

    const options: ClipboardOptions = {
      autoClean,
      cleanupDelay,
      showFeedback
    };

    try {
      const success = await clipboardService.copy(content, options);
      
      if (success) {
        setCopyState('success');
        // Reset to idle after showing success feedback
        setTimeout(() => setCopyState('idle'), 2000);
      } else {
        setCopyState('error');
        setTimeout(() => setCopyState('idle'), 3000);
      }
    } catch (error) {
      console.error('Clipboard operation failed:', error);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 3000);
    }
  }, [content, disabled, autoClean, cleanupDelay, showFeedback, clipboardService]);

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600',
    ghost: 'bg-transparent hover:bg-gray-700/50 text-gray-300 border-gray-600'
  };

  // State-specific classes
  const getStateClasses = () => {
    switch (copyState) {
      case 'copying':
        return 'opacity-75 cursor-wait';
      case 'success':
        return 'bg-green-600 border-green-600 text-white';
      case 'error':
        return 'bg-red-600 border-red-600 text-white';
      default:
        return '';
    }
  };

  // Get appropriate icon
  const getIcon = () => {
    const iconClass = iconSizeClasses[size];
    
    switch (copyState) {
      case 'copying':
        return <ClipboardIcon className={`${iconClass} animate-pulse`} />;
      case 'success':
        return <ClipboardCheckIcon className={iconClass} />;
      case 'error':
        return <ExclamationTriangleIcon className={iconClass} />;
      default:
        return <ClipboardIcon className={iconClass} />;
    }
  };

  // Get button text
  const getButtonText = () => {
    switch (copyState) {
      case 'copying':
        return 'Copying...';
      case 'success':
        return 'Copied!';
      case 'error':
        return 'Failed';
      default:
        return label;
    }
  };

  const isDisabled = disabled || !content || copyState === 'copying';

  return (
    <button
      onClick={handleCopy}
      disabled={isDisabled}
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg border transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${getStateClasses()}
        ${className}
      `}
      title={
        copyState === 'error' 
          ? 'Failed to copy to clipboard. Try again or check browser permissions.'
          : copyState === 'success'
          ? autoClean 
            ? `Copied! Clipboard will be cleared in ${Math.round(cleanupDelay / 1000)}s`
            : 'Copied to clipboard!'
          : `Copy ${content.length > 20 ? 'content' : `"${content}"`} to clipboard`
      }
    >
      {getIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
};