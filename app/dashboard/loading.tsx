export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-7">
      <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
    </div>
  )
}
