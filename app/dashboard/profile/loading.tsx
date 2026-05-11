export default function ProfileLoading() {
  return (
    <div className="p-4 md:p-7">
      <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />
      <div className="max-w-2xl space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
