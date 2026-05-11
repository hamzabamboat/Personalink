export default function PostsLoading() {
  return (
    <div className="p-4 md:p-7">
      <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse mb-6" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse mb-3" />
      ))}
    </div>
  )
}
