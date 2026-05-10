export default function UploadLoading() {
  return (
    <div className="p-4 md:p-7 max-w-[820px]">
      <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-6" />
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-6 animate-pulse">
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 animate-pulse">
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-10 flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  )
}
