export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-pulse p-6 lg:p-8">
      {/* Page Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 rounded-xl w-64" />
        <div className="h-4 bg-slate-200 rounded-lg w-96 md:w-[480px]" />
      </div>

      {/* Settings Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border shadow-sm flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-36" />
              <div className="space-y-1.5">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-16 pt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
