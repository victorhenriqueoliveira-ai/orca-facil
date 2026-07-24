export default function CatalogItemLoading() {
  return (
    <div className="min-h-screen bg-bg-base animate-pulse">
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="w-5 h-5 bg-border rounded" />
        <div className="h-5 w-32 bg-border rounded flex-1" />
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="aspect-video bg-border/40 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-border/30 rounded-xl" />
          ))}
        </div>
        <div className="h-12 bg-border/40 rounded-xl" />
      </div>
    </div>
  );
}
