export default function ProfileLoading() {
  return (
    <div className="min-h-screen">
      <div className="bg-dark text-cream p-6 md:p-12 lg:p-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between mb-12">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="w-32 h-32 bg-cream/10 animate-pulse border-4 border-cream shrink-0" />
              <div>
                <div className="h-12 w-64 bg-cream/10 animate-pulse mb-4" />
                <div className="h-6 w-48 bg-cream/10 animate-pulse mb-4" />
                <div className="h-8 w-32 bg-cream/10 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 border-t border-cream/20 pt-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-cream/5 border border-cream/10 p-4 md:p-6">
                <div className="h-4 w-20 bg-cream/10 animate-pulse mb-2" />
                <div className="h-12 w-24 bg-cream/10 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-20">
        <div className="h-10 w-48 bg-dark/10 animate-pulse mb-8" />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-2 border-dark/10 bg-cream p-6 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
