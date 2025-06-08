
import React from 'react';
import { EyeIcon, EyeSlashIcon, XCircleIcon } from './IconComponents';

interface PasswordInputProps {
  password: string;
  onPasswordChange: (newPassword: string) => void;
  onClear: () => void;
  characterCount: number; // Added to potentially influence styling or accessibility if needed here, though displayed in App.tsx
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ password, onPasswordChange, onClear, characterCount }) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative w-full">
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="Type a password to analyze..."
        className="w-full px-4 py-3.5 pr-20 text-lg bg-gray-700/60 border-2 border-gray-600 rounded-lg focus:ring-3 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all duration-200 text-gray-50 placeholder-gray-400 shadow-sm"
        aria-label="Password input field"
        autoFocus
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        {password && (
          <button
            type="button"
            onClick={onClear}
            className="p-2 mr-1 text-gray-400 hover:text-gray-200 transition-colors duration-200"
            aria-label="Clear password input"
            title="Clear password input"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleShowPassword}
          className="p-3 text-gray-400 hover:text-sky-400 transition-colors duration-200 rounded-md"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};
