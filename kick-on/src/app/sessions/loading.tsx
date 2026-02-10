export default function SessionsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title */}
      <div className="h-8 w-32 bg-grey-light rounded-lg" />

      {/* Calendar skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-6 w-36 bg-grey-light rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-grey-light rounded" />
            <div className="h-8 w-8 bg-grey-light rounded" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 bg-grey-light rounded" />
          ))}
        </div>
      </div>

      {/* Session list skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 bg-grey-light rounded" />
                <div className="h-3 w-24 bg-grey-light rounded" />
              </div>
              <div className="h-8 w-16 bg-grey-light rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
