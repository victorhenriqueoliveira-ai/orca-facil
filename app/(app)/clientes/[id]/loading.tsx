export default function CustomerDetailLoading() {
  return (
    <div className="min-h-screen bg-bg-base animate-pulse">
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="w-5 h-5 bg-border rounded" />
        <div className="h-5 w-36 bg-border rounded flex-1" />
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-border/30 rounded-xl" />
          ))}
        </div>
        <div className="h-px bg-border" />
        <div className="h-5 w-24 bg-border rounded" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-border/30 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
