export default function EditarOrcamentoLoading() {
  return (
    <div className="min-h-screen bg-bg-base animate-pulse">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="w-5 h-5 bg-border rounded" />
        <div className="flex-1 space-y-1">
          <div className="h-5 w-40 bg-border rounded" />
        </div>
        <div className="h-9 w-24 bg-border rounded-xl" />
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="h-16 bg-border/40 rounded-xl" />
        {[1, 2].map((i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="h-12 bg-border/20 px-4" />
            <div className="divide-y divide-border">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-36 bg-border rounded" />
                    <div className="h-3 w-24 bg-border rounded" />
                  </div>
                  <div className="h-7 w-20 bg-border rounded" />
                  <div className="h-7 w-24 bg-border rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="h-20 bg-brand-primary/10 rounded-xl" />
      </div>
    </div>
  );
}
