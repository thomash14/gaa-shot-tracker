export default function AnalyticsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title */}
      <div className="h-8 w-24 bg-grey-light rounded-lg" />

      {/* Filter bar skeleton */}
      <div className="bg-surface rounded-2xl p-3 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-28 bg-grey-light rounded-lg" />
          ))}
        </div>
      </div>

      {/* Toggle skeleton */}
      <div className="h-9 w-48 bg-grey-light rounded-lg" />

      {/* Conversion stats skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-grey-light rounded-xl" />
          ))}
        </div>
      </div>

      {/* Shot map skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="h-64 bg-grey-light rounded-xl" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-grey-light rounded" />
        ))}
      </div>
    </div>
  );
}
