export default function CatalogoLoading() {
  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 py-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-28 bg-border rounded" />
        <div className="h-9 w-24 bg-border rounded-lg" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-9 w-28 bg-border rounded-lg" />
        <div className="h-9 w-24 bg-border rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="h-4 w-36 bg-border rounded mb-2" />
              <div className="h-3 w-24 bg-border rounded" />
            </div>
            <div className="h-5 w-20 bg-border rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
