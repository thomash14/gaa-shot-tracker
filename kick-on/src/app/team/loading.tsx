export default function TeamLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title */}
      <div className="h-8 w-24 bg-grey-light rounded-lg" />

      {/* Team info + drills skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="h-6 w-48 bg-grey-light rounded" />
          <div className="h-4 w-32 bg-grey-light rounded" />
          <div className="space-y-2 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-grey-light rounded-xl" />
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="h-5 w-28 bg-grey-light rounded" />
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-grey-light rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
