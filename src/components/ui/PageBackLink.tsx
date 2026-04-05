import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function PageBackLink({
  children = '← Quay lại',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <button
      type='button'
      className={`mavid-back-link ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
