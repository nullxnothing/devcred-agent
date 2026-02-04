import { Database, Zap, Server, Clock } from 'lucide-react';
import { INFRASTRUCTURE_COSTS } from '@/lib/token-config';

export function FundingSection() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-12 bg-card border-b-2 border-border">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-accent/10 flex items-center justify-center border-2 border-accent/30 accent-box-glow">
            <Database size={24} className="text-accent icon-float" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">
            Powering DevCred
          </h2>
        </div>
        <p className="text-text-muted mb-10 text-lg max-w-2xl">
          Every reputation score requires real-time blockchain queries. The $KARMA token
          funds the infrastructure that makes this possible.
        </p>

        {/* Helius API Card */}
        <div className="bg-cream border-2 border-border p-6 md:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Server size={24} className="text-accent" />
            <h3 className="font-bold text-xl text-dark">Helius API Infrastructure</h3>
            <span className="ml-auto text-xs font-bold uppercase px-2 py-1 bg-accent/10 text-accent border border-accent/30">
              50 RPS
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {INFRASTRUCTURE_COSTS.map((cost) => (
              <div
                key={cost.title}
                className="flex items-start gap-3 p-4 bg-card border border-border"
              >
                <Zap size={18} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-dark">{cost.title}</div>
                  <div className="text-sm text-text-muted">{cost.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database Cost Card */}
        <div className="bg-cream border-2 border-border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={24} className="text-accent" />
            <h3 className="font-bold text-xl text-dark">Continuous Operation</h3>
          </div>
          <p className="text-text-muted mb-4">
            DevCred runs 24/7 monitoring of new token launches, pre-computing reputation
            scores so traders get instant results. This requires:
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 bg-card border border-border text-center">
              <div className="font-stat text-2xl font-black text-accent mb-1">Railway</div>
              <div className="text-xs text-text-muted">PostgreSQL Database</div>
            </div>
            <div className="p-4 bg-card border border-border text-center">
              <div className="font-stat text-2xl font-black text-accent mb-1">Vercel</div>
              <div className="text-xs text-text-muted">Frontend Hosting</div>
            </div>
            <div className="p-4 bg-card border border-border text-center">
              <div className="font-stat text-2xl font-black text-accent mb-1">Agent</div>
              <div className="text-xs text-text-muted">24/7 Monitoring</div>
            </div>
          </div>
        </div>

        {/* Sustainability Note */}
        <div className="mt-6 p-5 bg-success-light border-2 border-success-border flex items-start gap-4">
          <div className="w-10 h-10 bg-success/20 flex items-center justify-center shrink-0">
            <span className="text-success text-xl">$</span>
          </div>
          <div>
            <h4 className="font-bold text-success mb-1">Community-Powered Sustainability</h4>
            <p className="text-success/80 text-sm">
              Token fees and holder support fund ongoing development and API costs.
              No VC funding, no ads—just community ownership of essential crypto infrastructure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
