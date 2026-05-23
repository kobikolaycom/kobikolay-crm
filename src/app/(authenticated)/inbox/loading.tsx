export default function InboxLoading() {
  return (
    <div className="flex h-screen bg-white animate-pulse overflow-hidden">
      {/* Left sidebar: Conversation List skeleton */}
      <div className="w-[360px] md:w-[380px] border-r flex flex-col h-full bg-slate-50/50">
        {/* Search header skeleton */}
        <div className="p-4 border-b space-y-3 bg-white">
          <div className="h-6 bg-slate-200 rounded-lg w-24" />
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
        </div>
        
        {/* Chat items list skeleton */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 items-center rounded-xl bg-white/50 border border-transparent">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-28" />
                  <div className="h-3 bg-slate-100 rounded w-8" />
                </div>
                <div className="h-3 bg-slate-200 rounded w-44" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: Active Chat viewport skeleton */}
      <div className="flex-1 flex flex-col h-full bg-slate-50">
        {/* Header skeleton */}
        <div className="h-[73px] border-b bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-3 bg-slate-100 rounded w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100" />
            <div className="w-8 h-8 rounded-full bg-slate-100" />
          </div>
        </div>

        {/* Message logs area skeleton */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Customer message (left) */}
          <div className="flex gap-3 max-w-[70%]">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="bg-white border rounded-2xl rounded-tl-none p-4 space-y-2 shadow-sm w-64">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
            </div>
          </div>

          {/* Agent response (right) */}
          <div className="flex gap-3 max-w-[70%] ml-auto justify-end">
            <div className="bg-blue-100 border border-blue-200 rounded-2xl rounded-tr-none p-4 space-y-2 shadow-sm w-72">
              <div className="h-3 bg-blue-200 rounded w-full" />
              <div className="h-3 bg-blue-200 rounded w-4/5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
          </div>

          {/* Customer message (left) */}
          <div className="flex gap-3 max-w-[70%]">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="bg-white border rounded-2xl rounded-tl-none p-4 space-y-2 shadow-sm w-48">
              <div className="h-3 bg-slate-200 rounded w-full" />
            </div>
          </div>
        </div>

        {/* Input box skeleton */}
        <div className="p-4 bg-white border-t flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
          <div className="h-10 bg-slate-100 rounded-xl flex-1" />
          <div className="w-12 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
