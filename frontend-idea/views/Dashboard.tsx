import React from 'react';
import { MOCK_DEVS } from '../constants';
import { Share2, Plus, Wallet, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { ViewState } from '../types';

interface DashboardProps {
    onNavigate: (view: ViewState) => void;
    user: typeof MOCK_DEVS[0]; // Using mocked user type
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  return (
    <div className="min-h-screen">
       {/* Profile Header */}
       <div className="bg-dark text-cream p-6 md:p-12 lg:p-20 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-12 opacity-10 font-display-mock text-[20rem] leading-none pointer-events-none select-none text-cream">
                {user.totalScore}
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between mb-12">
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <img 
                            src={user.avatarUrl} 
                            alt="Profile" 
                            className="w-32 h-32 md:w-40 md:h-40 border-4 border-cream object-cover bg-gray-700"
                        />
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl md:text-5xl font-black font-display-mock tracking-tight">{user.displayName}</h1>
                                {user.isVerified && <div className="bg-accent text-dark px-2 py-0.5 text-xs font-bold uppercase">Verified</div>}
                            </div>
                            <div className="font-mono text-cream/60 mb-4 flex items-center gap-2">
                                <Wallet size={16} />
                                {user.walletAddress}
                            </div>
                            <div className="flex gap-2">
                                {user.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-cream/10 border border-cream/20 text-xs font-bold uppercase">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <Button variant="accent" className="flex-1 md:flex-none">
                            <Share2 size={18} /> Share Profile
                        </Button>
                        <Button variant="outline" className="!text-cream !border-cream hover:!bg-cream hover:!text-dark flex-1 md:flex-none">
                            Settings
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-t border-cream/20 pt-8">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Total Score</div>
                        <div className="text-4xl md:text-5xl font-black font-display-mock text-accent">{user.totalScore}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Rank</div>
                        <div className="text-4xl md:text-5xl font-black font-display-mock">#{user.rank}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Launches</div>
                        <div className="text-4xl md:text-5xl font-black font-display-mock">{user.launches.length}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Reputation</div>
                        <div className="text-4xl md:text-5xl font-black font-display-mock">A+</div>
                    </div>
                </div>
            </div>
       </div>

       {/* Content Section */}
       <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-20">
            <div className="flex items-end justify-between mb-8 border-b-2 border-dark pb-4">
                <h2 className="text-3xl md:text-4xl font-black font-display-mock">Token History</h2>
                <Button variant="outline" className="text-xs py-2 px-4 h-auto">
                    <Plus size={14} /> Claim Launch
                </Button>
            </div>

            <div className="grid gap-6">
                {user.launches.map((launch) => (
                    <div key={launch.id} className="border-2 border-dark p-6 hover:translate-x-1 hover:-translate-y-1 transition-transform bg-white shadow-[4px_4px_0px_0px_#3B3B3B]">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-bold">{launch.name}</h3>
                                    <span className="font-mono text-sm opacity-60">${launch.ticker}</span>
                                    {launch.status === 'active' ? (
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase border border-green-600 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 size={12} /> Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase border border-red-500 px-2 py-0.5 rounded-full">
                                            <AlertTriangle size={12} /> Inactive
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-6 text-sm text-dark/70">
                                    <span>Launched: {launch.launchDate}</span>
                                    <span>Vol: {launch.volume}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-dark/10 pt-4 md:pt-0 md:pl-8">
                                <div className="text-center">
                                    <div className="text-xs uppercase font-bold text-dark/40">Launch Score</div>
                                    <div className="text-3xl font-black font-display-mock text-dark">{launch.score}</div>
                                </div>
                                <div className="hidden md:block w-12 h-12 rounded-full border-2 border-dark flex items-center justify-center bg-cream">
                                    <Shield size={24} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {user.launches.length === 0 && (
                    <div className="border-2 border-dashed border-dark/30 p-12 text-center rounded-lg">
                        <p className="text-lg font-medium opacity-50">No token launches connected yet.</p>
                        <button className="mt-4 text-accent font-bold underline">Connect a wallet to scan</button>
                    </div>
                )}
            </div>
       </div>
    </div>
  );
};
