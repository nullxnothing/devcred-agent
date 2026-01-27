'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Menu, X, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));

    return (
      <Link
        href={href}
        onClick={() => setIsMenuOpen(false)}
        className={`text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors ${
          isActive ? 'text-accent decoration-2 underline-offset-4' : 'text-dark'
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleSignIn = () => {
    signIn('twitter');
  };

  const handleSignOut = () => {
    signOut();
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-cream border-b-2 border-dark">
      <div className="flex items-center justify-between px-6 py-5 md:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group cursor-pointer select-none"
        >
          <div className="relative w-10 h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110 duration-200">
            <Image
              src="/logo.png"
              alt="DevKarma Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-3xl md:text-4xl font-black font-display-mock tracking-tighter hover:text-accent transition-colors">
            DEVKARMA
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12">
          <NavItem href="/leaderboard" label="Leaderboard" />
          <NavItem href="/docs" label="Docs" />
          <NavItem href="/" label="Search" />
          <div className="w-px h-6 bg-dark/20"></div>

          {status === 'loading' ? (
            <div className="text-sm font-bold uppercase tracking-wider text-dark/50">
              Loading...
            </div>
          ) : session?.user ? (
            <div className="flex items-center gap-4">
              <Link
                href={`/profile/${session.user.twitterHandle}`}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors"
              >
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full border border-dark"
                  />
                )}
                @{session.user.twitterHandle}
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-dark/60 hover:text-dark transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="text-sm font-bold uppercase tracking-wider bg-dark text-cream px-5 py-2 hover:bg-accent hover:text-dark transition-colors border-2 border-transparent hover:border-dark"
            >
              Sign In
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
          <NavItem href="/leaderboard" label="Leaderboard" />
          <NavItem href="/docs" label="Docs" />
          <NavItem href="/" label="Search" />

          {session?.user ? (
            <>
              <Link
                href={`/profile/${session.user.twitterHandle}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:text-accent transition-colors"
              >
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full border border-dark"
                  />
                )}
                My Profile
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="text-sm font-bold uppercase tracking-wider text-left hover:text-accent transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                handleSignIn();
                setIsMenuOpen(false);
              }}
              className="text-sm font-bold uppercase tracking-wider text-left hover:text-accent transition-colors"
            >
              Sign In with Twitter
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
