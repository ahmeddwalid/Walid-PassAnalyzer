import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonInput } from '../ComparisonInput';
import { beforeEach } from 'node:test';

describe('ComparisonInput', () => {
  const defaultProps = {
    index: 0,
    password: '',
    onPasswordChange: vi.fn(),
    isIdentical: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct label', () => {
    render(<ComparisonInput {...defaultProps} />);
    expect(screen.getByText('Password 1')).toBeInTheDocument();
  });

  it('should render with correct index in label', () => {
    render(<ComparisonInput {...defaultProps} index={2} />);
    expect(screen.getByText('Password 3')).toBeInTheDocument();
  });

  it('should call onPasswordChange when input value changes', () => {
    const onPasswordChange = vi.fn();
    render(<ComparisonInput {...defaultProps} onPasswordChange={onPasswordChange} />);
    
    const input = screen.getByLabelText('Password 1 input field');
    fireEvent.change(input, { target: { value: 'test123' } });
    
    expect(onPasswordChange).toHaveBeenCalledWith(0, 'test123');
  });

  it('should display password value', () => {
    render(<ComparisonInput {...defaultProps} password="mypassword" />);
    
    const input = screen.getByLabelText('Password 1 input field') as HTMLInputElement;
    expect(input.value).toBe('mypassword');
  });

  it('should show/hide password when toggle button is clicked', () => {
    render(<ComparisonInput {...defaultProps} password="secret" />);
    
    const input = screen.getByLabelText('Password 1 input field') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    
    // Initially password type
    expect(input.type).toBe('password');
    
    // Click to show
    fireEvent.click(toggleButton);
    expect(input.type).toBe('text');
    
    // Click to hide
    fireEvent.click(toggleButton);
    expect(input.type).toBe('password');
  });

  it('should show clear button when password is not empty', () => {
    render(<ComparisonInput {...defaultProps} password="test" />);
    
    const clearButton = screen.getByRole('button', { name: /clear password/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('should not show clear button when password is empty', () => {
    render(<ComparisonInput {...defaultProps} password="" />);
    
    const clearButton = screen.queryByRole('button', { name: /clear password/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should clear password when clear button is clicked', () => {
    const onPasswordChange = vi.fn();
    render(<ComparisonInput {...defaultProps} password="test" onPasswordChange={onPasswordChange} />);
    
    const clearButton = screen.getByRole('button', { name: /clear password/i });
    fireEvent.click(clearButton);
    
    expect(onPasswordChange).toHaveBeenCalledWith(0, '');
  });

  it('should show remove button when onRemove is provided', () => {
    const onRemove = vi.fn();
    render(<ComparisonInput {...defaultProps} onRemove={onRemove} />);
    
    const removeButton = screen.getByRole('button', { name: /remove password/i });
    expect(removeButton).toBeInTheDocument();
  });

  it('should not show remove button when onRemove is not provided', () => {
    render(<ComparisonInput {...defaultProps} />);
    
    const removeButton = screen.queryByRole('button', { name: /remove password/i });
    expect(removeButton).not.toBeInTheDocument();
  });

  it('should call onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<ComparisonInput {...defaultProps} onRemove={onRemove} />);
    
    const removeButton = screen.getByRole('button', { name: /remove password/i });
    fireEvent.click(removeButton);
    
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('should display character count', () => {
    render(<ComparisonInput {...defaultProps} password="test123" />);
    
    expect(screen.getByText('Length: 7')).toBeInTheDocument();
  });

  it('should show duplicate warning when isIdentical is true', () => {
    render(<ComparisonInput {...defaultProps} password="test" isIdentical={true} />);
    
    expect(screen.getByText('⚠️ Duplicate')).toBeInTheDocument();
  });

  it('should not show duplicate warning when isIdentical is false', () => {
    render(<ComparisonInput {...defaultProps} password="test" isIdentical={false} />);
    
    expect(screen.queryByText('⚠️ Duplicate')).not.toBeInTheDocument();
  });

  it('should apply warning styles when isIdentical is true', () => {
    render(<ComparisonInput {...defaultProps} password="test" isIdentical={true} />);
    
    const input = screen.getByLabelText('Password 1 input field');
    expect(input).toHaveClass('border-yellow-500', 'bg-yellow-900/20');
  });

  it('should have correct accessibility attributes', () => {
    render(<ComparisonInput {...defaultProps} />);
    
    const input = screen.getByLabelText('Password 1 input field');
    expect(input).toHaveAttribute('aria-label', 'Password 1 input field');
    expect(input).toHaveAttribute('autoComplete', 'new-password');
    expect(input).toHaveAttribute('autoCorrect', 'off');
    expect(input).toHaveAttribute('autoCapitalize', 'off');
    expect(input).toHaveAttribute('spellCheck', 'false');
  });
});