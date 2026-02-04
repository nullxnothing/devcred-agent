export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header skeleton */}
      <div className="bg-card border-b-2 border-border p-6 md:p-12 lg:p-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between mb-12">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              {/* Avatar skeleton */}
              <div className="w-32 h-32 bg-border/30 animate-pulse border-4 border-border shrink-0" />
              <div>
                {/* Name skeleton */}
                <div className="h-12 w-64 bg-border/30 animate-pulse mb-4 rounded" />
                {/* Handle skeleton */}
                <div className="h-6 w-48 bg-border/30 animate-pulse mb-4 rounded" />
                {/* Badge skeleton */}
                <div className="h-8 w-32 bg-border/30 animate-pulse rounded" />
              </div>
            </div>
            {/* Actions skeleton */}
            <div className="flex gap-3">
              <div className="h-10 w-24 bg-border/30 animate-pulse rounded" />
              <div className="h-10 w-24 bg-border/30 animate-pulse rounded" />
            </div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 border-t border-border pt-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface border border-border p-4 md:p-6">
                <div className="h-4 w-20 bg-border/30 animate-pulse mb-3 rounded" />
                <div className="h-10 w-16 bg-border/30 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tokens section skeleton */}
      <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-20">
        <div className="h-10 w-48 bg-border/30 animate-pulse mb-8 rounded" />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="border-2 border-border bg-card p-6 animate-pulse"
            >
              <div className="flex items-start gap-4">
                {/* Token icon skeleton */}
                <div className="w-12 h-12 bg-border/30 rounded shrink-0" />
                <div className="flex-1">
                  {/* Token name skeleton */}
                  <div className="h-6 w-40 bg-border/30 mb-2 rounded" />
                  {/* Token address skeleton */}
                  <div className="h-4 w-64 bg-border/30 rounded" />
                </div>
                {/* Score skeleton */}
                <div className="h-8 w-16 bg-border/30 rounded" />
              </div>
              {/* Stats row skeleton */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-border">
                <div className="h-4 w-24 bg-border/30 rounded" />
                <div className="h-4 w-24 bg-border/30 rounded" />
                <div className="h-4 w-24 bg-border/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
