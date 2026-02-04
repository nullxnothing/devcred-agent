import { TrendingUp, Users, Coins, BarChart3 } from 'lucide-react';
import { TOKEN_CONFIG } from '@/lib/token-config';

const STATS = [
  {
    label: 'Market Cap',
    value: 'TBD',
    icon: TrendingUp,
    note: 'At launch',
  },
  {
    label: 'Total Supply',
    value: TOKEN_CONFIG.totalSupply,
    icon: Coins,
    note: 'Fixed supply',
  },
  {
    label: 'Holders',
    value: 'TBD',
    icon: Users,
    note: 'At launch',
  },
  {
    label: '24h Volume',
    value: 'TBD',
    icon: BarChart3,
    note: 'At launch',
  },
];

export function TokenStats() {
  return (
    <section className="py-12 md:py-16 px-6 md:px-12 bg-cream border-b-2 border-border">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="stat-card-glow bg-card border-2 border-border p-5 hover:border-accent/50 hover:shadow-[4px_4px_0px_0px_var(--border)] transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <stat.icon size={18} className="text-accent icon-float" />
                <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                  {stat.label}
                </span>
              </div>
              <div className="font-stat text-2xl md:text-3xl font-black text-dark mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-text-muted">{stat.note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
