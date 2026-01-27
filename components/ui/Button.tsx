import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "px-6 py-3 font-bold transition-all duration-200 border-2 border-dark text-sm tracking-wide uppercase flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-dark text-cream hover:bg-accent hover:border-accent hover:text-dark",
    secondary: "bg-transparent text-dark hover:bg-dark hover:text-cream",
    accent: "bg-accent text-dark border-accent hover:bg-dark hover:text-cream hover:border-dark",
    outline: "bg-transparent text-dark border-dark hover:bg-dark hover:text-cream",
  };

  const widthStyle = fullWidth ? "w-full" : "w-auto";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
