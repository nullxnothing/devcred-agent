import React from 'react';
import { ViewState } from '../types';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, isLoggedIn }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const NavItem = ({ view, label }: { view: ViewState; label: string }) => (
    <button
      onClick={() => {
        onNavigate(view);
        setIsMenuOpen(false);
      }}
      className={`text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors ${
        currentView === view ? 'text-accent decoration-2 underline-offset-4' : 'text-dark'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className="sticky top-0 z-50 w-full bg-cream border-b-2 border-dark">
      <div className="flex items-center justify-between px-6 py-5 md:px-12">
        {/* Logo */}
        <div 
            onClick={() => onNavigate('HOME')}
            className="text-3xl md:text-4xl font-black font-display-mock tracking-tighter cursor-pointer select-none hover:text-accent transition-colors"
        >
          DEVKARMA
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12">
          <NavItem view="LEADERBOARD" label="Leaderboard" />
          <NavItem view="HOME" label="Search" />
          <div className="w-px h-6 bg-dark/20"></div>
          {isLoggedIn ? (
            <NavItem view="DASHBOARD" label="My Profile" />
          ) : (
            <button
                onClick={() => onNavigate('HOME')} 
                className="text-sm font-bold uppercase tracking-wider bg-dark text-cream px-5 py-2 hover:bg-accent hover:text-dark transition-colors border-2 border-transparent hover:border-dark"
            >
                For Devs
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-dark"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden border-t-2 border-dark bg-cream absolute w-full left-0 flex flex-col p-6 gap-6 shadow-xl">
          <NavItem view="LEADERBOARD" label="Leaderboard" />
          <NavItem view="HOME" label="Search" />
          <NavItem view="DASHBOARD" label={isLoggedIn ? "My Profile" : "Login as Dev"} />
        </div>
      )}
    </nav>
  );
};
