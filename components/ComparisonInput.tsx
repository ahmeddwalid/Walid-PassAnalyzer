import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, XCircleIcon, TrashIcon } from './IconComponents';

interface ComparisonInputProps {
  index: number;
  password: string;
  onPasswordChange: (index: number, password: string) => void;
  onRemove?: (index: number) => void;
  isIdentical: boolean;
}

export const ComparisonInput: React.FC<ComparisonInputProps> = ({
  index,
  password,
  onPasswordChange,
  onRemove,
  isIdentical
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClear = () => {
    onPasswordChange(index, '');
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(index);
    }
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label 
          htmlFor={`password-${index}`}
          className="text-sm font-medium text-gray-300"
        >
          Password {index + 1}
        </label>
        {onRemove && (
          <button
            onClick={handleRemove}
            className="p-1 text-gray-500 hover:text-red-400 transition-colors duration-200"
            aria-label={`Remove password ${index + 1}`}
            title={`Remove password ${index + 1}`}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        <input
          id={`password-${index}`}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(index, e.target.value)}
          placeholder={`Enter password ${index + 1}...`}
          className={`
            w-full px-3 py-2.5 pr-16 text-sm bg-gray-700/60 border-2 rounded-md 
            focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none 
            transition-all duration-200 text-gray-50 placeholder-gray-400
            ${isIdentical 
              ? 'border-yellow-500 bg-yellow-900/20' 
              : 'border-gray-600 hover:border-gray-500'
            }
          `}
          aria-label={`Password ${index + 1} input field`}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        
        {/* Action Buttons */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          {password && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 mr-1 text-gray-400 hover:text-gray-200 transition-colors duration-200"
              aria-label={`Clear password ${index + 1}`}
              title={`Clear password ${index + 1}`}
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleShowPassword}
            className="p-2 text-gray-400 hover:text-sky-400 transition-colors duration-200 rounded-md"
            aria-label={showPassword ? `Hide password ${index + 1}` : `Show password ${index + 1}`}
            title={showPassword ? `Hide password ${index + 1}` : `Show password ${index + 1}`}
          >
            {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Character Count */}
      <div className="flex justify-between items-center text-xs">
        <span className={`${password.length > 0 ? 'text-gray-400' : 'text-gray-500'}`}>
          Length: {password.length}
        </span>
        {isIdentical && (
          <span className="text-yellow-400 font-medium">
            ⚠️ Duplicate
          </span>
        )}
      </div>
    </div>
  );
};