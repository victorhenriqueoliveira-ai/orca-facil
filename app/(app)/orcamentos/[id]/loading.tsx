export default function QuoteDetailLoading() {
  return (
    <div className="min-h-screen bg-bg-base animate-pulse">
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="w-5 h-5 bg-border rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-48 bg-border rounded" />
          <div className="h-3 w-28 bg-border rounded" />
        </div>
        <div className="h-6 w-16 bg-border rounded-full" />
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="h-16 bg-border/40 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-border/40 rounded-xl" />
          <div className="h-12 bg-border/40 rounded-xl" />
        </div>
        <div className="h-12 bg-border/40 rounded-xl" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <div className="h-11 bg-border/30 px-4" />
              <div className="divide-y divide-border">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-32 bg-border rounded" />
                      <div className="h-3 w-24 bg-border rounded" />
                    </div>
                    <div className="h-4 w-16 bg-border rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
