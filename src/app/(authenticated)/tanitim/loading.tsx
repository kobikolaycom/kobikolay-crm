export default function TanitimLoading() {
  return (
    <div className="space-y-6 animate-pulse p-6 lg:p-8">
      {/* Page Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 rounded-xl w-56" />
        <div className="h-4 bg-slate-200 rounded-lg w-[320px] md:w-[480px]" />
      </div>

      {/* Button Row skeleton */}
      <div className="flex justify-end gap-2">
        <div className="w-32 h-10 bg-slate-100 rounded-xl" />
      </div>

      {/* Main Campaign feed skeleton */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Feed Header */}
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-5 bg-slate-200 rounded w-40" />
            <div className="h-3 bg-slate-100 rounded w-24" />
          </div>
        </div>

        {/* Campaign rows */}
        <div className="divide-y divide-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-6 py-5 flex items-center justify-between">
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-slate-200 rounded w-48" />
                  <div className="w-20 h-5 bg-slate-100 rounded-full" />
                </div>
                <div className="h-3.5 bg-slate-100 rounded w-96 max-w-full" />
                <div className="flex gap-4 pt-1">
                  <div className="w-24 h-4 bg-slate-100 rounded" />
                  <div className="w-36 h-4 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="w-24 h-3 bg-slate-100 rounded" />
                <div className="w-10 h-6 bg-slate-200 rounded" />
                <div className="w-24 h-1.5 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
