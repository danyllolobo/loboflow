import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/80',
      outline: 'bg-transparent border border-border text-foreground hover:bg-secondary',
      ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/70',
      danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30',
    };

    const sizeStyles = {
      sm: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
      md: 'h-9 px-3.5 text-xs font-medium rounded-lg gap-2',
      lg: 'h-10 px-4 text-sm font-medium rounded-xl gap-2',
      icon: 'h-8 w-8 p-0 rounded-lg justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
