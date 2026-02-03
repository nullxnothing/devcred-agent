import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  fullWidth?: boolean;
  shadow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  shadow = true,
  className = '',
  ...props
}) => {
  const baseStyles = "px-6 py-3 font-bold transition-all duration-150 border-2 text-sm tracking-wide uppercase flex items-center justify-center gap-2 btn-press";

  const variants = {
    primary: "bg-dark text-cream border-dark hover:bg-accent hover:border-accent",
    secondary: "bg-transparent text-dark border-dark hover:bg-dark hover:text-cream",
    accent: "bg-accent text-cream border-accent hover:bg-accent-light hover:border-accent-light",
    outline: "bg-transparent text-dark border-dark/30 hover:bg-dark hover:text-cream hover:border-dark",
  };

  const shadowStyle = shadow ? "shadow-[4px_4px_0px_0px_#3B3B3B] hover:shadow-[2px_2px_0px_0px_#3B3B3B] active:shadow-none" : "";
  const widthStyle = fullWidth ? "w-full" : "w-auto";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${shadowStyle} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
