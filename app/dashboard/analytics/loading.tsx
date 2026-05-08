export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-7">
      <div className="h-8 w-40 bg-slate-200 rounded-lg animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
    </div>
  )
}
