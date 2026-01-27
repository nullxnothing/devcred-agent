import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './views/Home';
import { Leaderboard } from './views/Leaderboard';
import { Dashboard } from './views/Dashboard';
import { ViewState } from './types';
import { MOCK_DEVS } from './constants';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate OAuth delay
    setTimeout(() => {
        setIsLoggedIn(true);
        setCurrentView('DASHBOARD');
        setIsLoading(false);
    }, 1500);
  };

  const handleNavigate = (view: ViewState) => {
    if (view === 'DASHBOARD' && !isLoggedIn) {
        // Redirect to login logic or show modal (simplified here)
        handleLogin(); 
        return;
    }
    
    // Clear search if leaving leaderboard context
    if (view !== 'LEADERBOARD') {
        setSearchQuery('');
    }

    // Scroll to top
    window.scrollTo(0, 0);
    setCurrentView(view);
  };

  const renderView = () => {
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-cream">
                <Loader2 className="animate-spin text-dark mb-4" size={48} />
                <div className="text-xl font-bold font-display-mock animate-pulse">VERIFYING CREDENTIALS...</div>
            </div>
        );
    }

    switch (currentView) {
      case 'HOME':
        return (
            <Home 
                onNavigate={handleNavigate} 
                onLogin={handleLogin} 
                setSearchQuery={(q) => {
                    setSearchQuery(q);
                    // Usually navigating to leaderboard with search acts as the result page
                }}
            />
        );
      case 'LEADERBOARD':
        return <Leaderboard onNavigate={handleNavigate} searchQuery={searchQuery} />;
      case 'DASHBOARD':
        return <Dashboard onNavigate={handleNavigate} user={MOCK_DEVS[0]} />; // Simulating "My Profile" as the first mock user
      case 'PROFILE':
        // For demo, we just reuse Dashboard but imagine it's read-only
        return <Dashboard onNavigate={handleNavigate} user={MOCK_DEVS[1]} />;
      default:
        return <Home onNavigate={handleNavigate} onLogin={handleLogin} setSearchQuery={setSearchQuery} />;
    }
  };

  return (
    <div className="min-h-screen bg-cream text-dark font-sans selection:bg-accent selection:text-white">
      {!isLoading && (
        <Navbar 
            currentView={currentView} 
            onNavigate={handleNavigate} 
            isLoggedIn={isLoggedIn} 
        />
      )}
      <main>
        {renderView()}
      </main>
      
      {!isLoading && (
        <footer className="border-t-2 border-dark py-12 px-6 md:px-12 bg-cream text-center md:text-left">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <div className="text-2xl font-black font-display-mock mb-2">DEVKARMA</div>
                    <div className="text-sm opacity-60">© 2024 DevKarma. Building trust on-chain.</div>
                </div>
                <div className="flex gap-6 text-sm font-bold uppercase tracking-wider">
                    <a href="#" className="hover:text-accent">Twitter</a>
                    <a href="#" className="hover:text-accent">Discord</a>
                    <a href="#" className="hover:text-accent">Docs</a>
                </div>
            </div>
        </footer>
      )}
    </div>
  );
};

export default App;
