export default function GenerateLoading() {
  return (
    <div className="p-4 md:p-7 max-w-3xl">
      <div className="h-8 w-40 bg-slate-200 rounded-lg animate-pulse mb-6" />
      <div className="h-32 bg-slate-200 rounded-xl animate-pulse mb-4" />
      <div className="h-12 w-40 bg-slate-200 rounded-lg animate-pulse" />
    </div>
  )
}
