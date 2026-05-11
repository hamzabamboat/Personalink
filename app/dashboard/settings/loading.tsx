export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-7 max-w-3xl">
      <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse mb-6" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse mb-4" />
      ))}
    </div>
  )
}
