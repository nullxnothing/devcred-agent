import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const sizeStyles = {
  xs: 'h-7 px-2.5 text-[10px]',
  sm: 'h-8 sm:h-9 px-3 text-xs',
  md: 'h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm',
  lg: 'h-11 sm:h-12 px-5 sm:px-6 text-sm',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = "font-mono font-bold transition-all duration-150 border tracking-widest uppercase flex items-center justify-center gap-1.5 sm:gap-2 btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98] touch-manipulation";

  const variants = {
    primary: "bg-white text-black border-white hover:bg-white-90 hover:border-white-90 active:bg-white-60",
    secondary: "bg-transparent text-white border-white-20 hover:bg-white/5 hover:border-white-40 active:bg-white/10",
    outline: "bg-transparent text-white-60 border-white-20 hover:text-white hover:border-white hover:bg-white/5 active:bg-white/10",
    danger: "bg-transparent text-red border-red hover:bg-red/10 active:bg-red/20",
  };

  const widthStyle = fullWidth ? "w-full" : "w-auto";

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      [ {children} ]
    </button>
  );
};
