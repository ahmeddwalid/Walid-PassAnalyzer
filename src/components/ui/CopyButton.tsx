import { useEffect, useRef, useState } from 'react';
import { copyToClipboard, ClipboardError } from '../../services/clipboard';
import { Icon } from '../Icon';

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  disabled?: boolean;
}

type CopyState = 'idle' | 'copied' | 'error';

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  className = '',
  disabled = false,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const [message, setMessage] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    try {
      await copyToClipboard(value);
      setState('copied');
      setMessage('Copied to the clipboard. Clipboard history is controlled by your device.');
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof ClipboardError
          ? error.message
          : 'The browser blocked clipboard access. Select the value and copy it manually.',
      );
    }
    timer.current = window.setTimeout(() => setState('idle'), 2600);
  };

  return (
    <span className={`copy-control ${className}`.trim()}>
      <button
        type="button"
        className="button button--secondary button--compact"
        onClick={handleCopy}
        disabled={disabled || !value}
        aria-label={label}
      >
        <Icon name={state === 'copied' ? 'check' : 'copy'} size={15} />
        <span>{state === 'copied' ? copiedLabel : label}</span>
      </button>
      <span className="visually-hidden" role="status" aria-live="polite">
        {message}
      </span>
    </span>
  );
}
