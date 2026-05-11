export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-7 max-w-[960px]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-36 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="py-2.5 flex items-center justify-center">
              <div className="h-3 w-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="min-h-[80px] md:min-h-[96px] border-b border-r border-slate-50 dark:border-slate-800 p-1.5">
              <div className="animate-pulse h-5 w-5 bg-slate-100 dark:bg-slate-800 rounded-full mb-1.5" />
              {i % 4 === 0 && <div className="animate-pulse h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
