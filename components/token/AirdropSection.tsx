import { Trophy, Clock, Coins, Users, Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AIRDROP_CRITERIA } from '@/lib/token-config';
import { Button } from '@/components/ui/Button';

const ICONS: Record<string, React.ElementType> = {
  Trophy,
  Clock,
  Coins,
  Users,
};

export function AirdropSection() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-12 bg-inverted-bg border-b-2 border-inverted-bg/50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-accent flex items-center justify-center border-2 border-accent">
            <Gift size={24} className="text-cream" />
          </div>
          <h2 className="text-3xl md:text-4xl font-mono font-extrabold uppercase text-white">
            Airdrop
          </h2>
        </div>
        <p className="text-inverted-muted mb-10 text-lg max-w-2xl">
          Rewarding the builders and early believers who make Blacklist possible.
        </p>

        {/* Eligibility Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {AIRDROP_CRITERIA.map((criteria) => {
            const Icon = ICONS[criteria.icon] || Trophy;
            return (
              <div
                key={criteria.id}
                className="airdrop-card-animate bg-[#252830] border-2 border-inverted-text/10 p-6 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-accent/20 flex items-center justify-center">
                    <Icon size={20} className="text-accent icon-float" />
                  </div>
                  <h3 className="font-bold text-lg text-inverted-text">
                    {criteria.title}
                  </h3>
                </div>
                <p className="text-inverted-muted text-sm">{criteria.description}</p>
              </div>
            );
          })}
        </div>

        {/* Snapshot Info */}
        <div className="bg-accent/20 border-2 border-accent p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-accent mb-1">
                Snapshot Date
              </div>
              <div className="font-stat text-2xl font-black text-inverted-text">
                To Be Announced
              </div>
            </div>
            <div className="md:ml-auto">
              <Link href="/login">
                <Button variant="primary">
                  Claim Profile to Qualify <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-inverted-muted text-xs">
          Airdrop eligibility and amounts are subject to change. Final criteria will be
          announced before the snapshot. Sybil detection will be applied.
        </p>
      </div>
    </section>
  );
}
