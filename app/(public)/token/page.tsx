import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  TokenHero,
  TokenStats,
  FundingSection,
  AirdropSection,
  TokenGatedFeatures,
} from '@/components/token';

export const metadata: Metadata = {
  title: '$KARMA Token | DevCred',
  description:
    'The community token powering DevCred infrastructure. Fund API costs, unlock premium features, and support the Solana reputation ecosystem.',
  openGraph: {
    title: '$KARMA Token | DevCred',
    description:
      'The community token powering DevCred infrastructure. Fund API costs, unlock premium features, and support the Solana reputation ecosystem.',
  },
};

export default function TokenPage() {
  return (
    <div className="min-h-screen bg-cream relative">
      {/* Subtle grid texture background */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />

      <TokenHero />
      <TokenStats />
      <FundingSection />
      <AirdropSection />
      <TokenGatedFeatures />

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-inverted-bg text-inverted-text text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] grid-pattern" />

        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-5xl font-black font-display-mock mb-6 leading-tight">
            JOIN THE <span className="text-accent">REVOLUTION</span>
          </h2>
          <p className="text-lg text-inverted-muted mb-8">
            Claim your profile now to qualify for the airdrop and build your reputation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button variant="accent" className="text-lg px-8 py-3 h-auto">
                Claim Profile <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" className="text-lg px-8 py-3 h-auto border-inverted-text/30 text-inverted-text hover:bg-inverted-text hover:text-inverted-bg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
