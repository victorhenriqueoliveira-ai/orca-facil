export default function ClientesLoading() {
  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-24 bg-border rounded" />
        <div className="h-9 w-24 bg-border rounded-lg" />
      </div>
      <div className="h-10 w-full bg-border rounded-lg mb-4" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4">
            <div className="h-4 w-40 bg-border rounded mb-2" />
            <div className="h-3 w-32 bg-border rounded mb-1" />
            <div className="h-3 w-48 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
