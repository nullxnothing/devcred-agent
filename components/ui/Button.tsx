import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  shadow?: boolean;
}

const sizeStyles = {
  xs: 'h-7 px-2.5 text-[10px]',
  sm: 'h-8 sm:h-9 px-3 text-xs',
  md: 'h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm',
  lg: 'h-11 sm:h-12 px-5 sm:px-6 text-sm sm:text-base',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  shadow = true,
  className = '',
  ...props
}) => {
  const baseStyles = "font-bold transition-all duration-150 border-2 tracking-wide uppercase flex items-center justify-center gap-1.5 sm:gap-2 btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] touch-manipulation";

  const variants = {
    primary: "bg-dark text-cream border-dark hover:bg-accent hover:border-accent active:bg-accent-dark",
    secondary: "bg-transparent text-dark border-dark hover:bg-dark hover:text-cream active:bg-dark/90",
    accent: "bg-accent text-cream border-accent hover:bg-accent-light hover:border-accent-light active:bg-accent-dark",
    outline: "bg-transparent text-dark border-dark/30 hover:bg-dark hover:text-cream hover:border-dark active:bg-dark/90",
  };

  const shadowStyle = shadow ? "shadow-[2px_2px_0px_0px_var(--border)] sm:shadow-[3px_3px_0px_0px_var(--border)] hover:shadow-[1px_1px_0px_0px_var(--border)] active:shadow-none" : "";
  const widthStyle = fullWidth ? "w-full" : "w-auto";

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${shadowStyle} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
