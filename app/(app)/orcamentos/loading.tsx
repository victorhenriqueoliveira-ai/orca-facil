export default function OrcamentosLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-32 bg-border rounded" />
        <div className="h-9 w-20 bg-border rounded-lg" />
      </div>
      <div className="flex gap-2 overflow-x-hidden pb-2 mb-4">
        {[80, 72, 72, 80, 72, 72].map((w, i) => (
          <div key={i} className="h-8 flex-shrink-0 bg-border rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <div className="h-4 w-32 bg-border rounded" />
              <div className="h-5 w-20 bg-border rounded-full" />
            </div>
            <div className="h-3 w-48 bg-border rounded mb-2" />
            <div className="h-5 w-24 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
