export default function ProfileLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-8">
      <div className="terminal-card p-8 max-w-lg w-full">
        <div className="font-mono text-white-60 text-xs space-y-2">
          <p className="text-white">&gt; LOADING SUBJECT DOSSIER...</p>
          <p>&gt; SCANNING WALLET HISTORY...</p>
          <p>&gt; RETRIEVING THREAT ASSESSMENT...</p>
          <p className="animate-cursor-blink">_</p>
        </div>
      </div>
    </div>
  );
}
