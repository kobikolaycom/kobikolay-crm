export default function AgentsLoading() {
  return (
    <div className="space-y-6 animate-pulse p-6 lg:p-8">
      {/* Page Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 rounded-xl w-48" />
        <div className="h-4 bg-slate-200 rounded-lg w-72" />
      </div>

      {/* Filter and search bar skeleton */}
      <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-10 bg-slate-100 rounded-xl w-full col-span-1" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Table Head */}
        <div className="bg-slate-50 border-b px-6 py-4 grid grid-cols-5 gap-4">
          <div className="h-4 bg-slate-200 rounded w-24" />
          <div className="h-4 bg-slate-200 rounded w-20" />
          <div className="h-4 bg-slate-200 rounded w-28" />
          <div className="h-4 bg-slate-200 rounded w-16" />
          <div className="h-4 bg-slate-200 rounded w-20 ml-auto" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-6 py-4 grid grid-cols-5 gap-4 items-center">
              <div className="space-y-1.5 col-span-1">
                <div className="h-4 bg-slate-200 rounded w-36" />
                <div className="h-3 bg-slate-100 rounded w-20" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-5 bg-slate-100 rounded-full w-20" />
              <div className="h-5 bg-slate-200 rounded-full w-16" />
              <div className="h-8 bg-slate-100 rounded-lg w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
