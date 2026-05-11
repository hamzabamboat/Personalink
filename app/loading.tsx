export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-light animate-pulse" />
        <div className="h-2 w-24 bg-slate-200 rounded-full animate-pulse" />
      </div>
    </div>
  )
}
