export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse p-6 lg:p-8">
      {/* Welcome banner skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 rounded-xl w-64 md:w-96" />
        <div className="h-4 bg-slate-200 rounded-lg w-96 md:w-[480px]" />
      </div>

      {/* Stats Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border shadow-sm flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-200 rounded w-20" />
              <div className="h-8 bg-slate-200 rounded-lg w-16" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Main Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Conversations skeleton */}
        <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <div className="h-5 bg-slate-200 rounded-lg w-32" />
            <div className="h-8 bg-slate-200 rounded-lg w-20" />
          </div>
          <div className="flex-1 divide-y divide-slate-100 p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-32" />
                    <div className="h-3 bg-slate-200 rounded w-48" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Tasks skeleton */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <div className="h-5 bg-slate-200 rounded-lg w-24" />
            <div className="flex gap-1">
              <div className="w-14 h-6 bg-slate-100 rounded-full" />
              <div className="w-14 h-6 bg-slate-100 rounded-full" />
            </div>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="w-16 h-5 bg-slate-200 rounded-full" />
                </div>
                <div className="h-3 bg-slate-200 rounded w-40" />
                <div className="h-3 bg-slate-200 rounded w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
