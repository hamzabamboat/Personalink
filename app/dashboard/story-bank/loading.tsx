export default function StoryBankLoading() {
  return (
    <div className="p-4 md:p-7 max-w-[820px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/6" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="flex gap-2">
                <div className="h-7 w-7 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-7 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
