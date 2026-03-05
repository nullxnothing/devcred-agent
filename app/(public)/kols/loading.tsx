export default function KolsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-8">
      <div className="terminal-card p-8 max-w-lg w-full">
        <div className="font-mono text-white-60 text-xs space-y-2">
          <p className="text-white">&gt; LOADING KOL DATABASE...</p>
          <p>&gt; CROSS-REFERENCING INTELLIGENCE...</p>
          <p className="animate-cursor-blink">_</p>
        </div>
      </div>
    </div>
  );
}
