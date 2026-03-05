import { getProfileTokens } from '@/lib/data-fetching';
import { BadgeGrid } from './BadgeGrid';

interface BadgesStreamingProps {
  userId: string;
  wallets: Array<{ address: string }>;
}

export async function BadgesStreaming({ userId, wallets }: BadgesStreamingProps) {
  const { badges } = await getProfileTokens(userId, wallets);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <BadgeGrid
        tokens={badges}
        title="Achievements"
        maxDisplay={4}
      />
    </div>
  );
}

export function BadgesSkeleton() {
  return (
    <div className="mb-6">
      <div className="h-4 w-24 bg-white/10 animate-pulse mb-3 rounded" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-20 h-8 bg-white/10 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
