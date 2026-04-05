import type { ButtonHTMLAttributes } from 'react';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'neutral';
export type AppButtonSize = 'md' | 'sm';

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
}

/**
 * Nút dùng chung — class `.mavid-btn*` trong `index.css`.
 */
export function AppButton({ variant = 'secondary', size = 'md', className = '', type = 'button', ...rest }: AppButtonProps) {
  return <button type={type} className={`min-w-20 mavid-btn mavid-btn--${size} mavid-btn--${variant} ${className}`.trim()} {...rest} />;
}
