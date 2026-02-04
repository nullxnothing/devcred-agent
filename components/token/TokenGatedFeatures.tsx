import { Zap, Infinity, Award, BarChart3, Lock } from 'lucide-react';
import { GATED_FEATURES } from '@/lib/token-config';

const ICONS: Record<string, React.ElementType> = {
  Zap,
  Infinity,
  Award,
  BarChart3,
};

export function TokenGatedFeatures() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-12 bg-cream border-b-2 border-border">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-accent/10 flex items-center justify-center border-2 border-accent/30">
            <Lock size={24} className="text-accent" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">
            Holder Benefits
          </h2>
        </div>
        <p className="text-text-muted mb-10 text-lg max-w-2xl">
          Unlock premium features by holding $KARMA tokens. More features launching soon.
        </p>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {GATED_FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon] || Zap;
            return (
              <div
                key={feature.id}
                className="feature-card-spotlight relative bg-card border-2 border-border p-6 hover:border-accent/50 hover:shadow-[4px_4px_0px_0px_var(--border)] transition-all group"
              >
                {/* Coming Soon Overlay */}
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-text-muted/10 text-text-muted text-[10px] font-bold uppercase border border-text-muted/20">
                    Coming Soon
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-accent/10 flex items-center justify-center border border-accent/30 group-hover:bg-accent/20 transition-colors">
                    <Icon size={20} className="text-accent icon-float" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-dark">{feature.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      {feature.tier === 'premium' ? 'Premium Tier' : 'Basic Tier'}
                    </span>
                  </div>
                </div>
                <p className="text-text-muted text-sm">{feature.description}</p>

                {/* Lock icon overlay */}
                <div className="absolute bottom-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Lock size={32} className="text-dark" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tier Info */}
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-card border-2 border-border">
            <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
              Basic Tier
            </div>
            <p className="text-sm text-dark">
              Hold any amount of $KARMA to unlock basic features like priority scanning
              and unlimited API access.
            </p>
          </div>
          <div className="p-4 bg-accent/5 border-2 border-accent/30">
            <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
              Premium Tier
            </div>
            <p className="text-sm text-dark">
              Top holders unlock exclusive features including custom badges and the
              analytics dashboard. Threshold TBA.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
