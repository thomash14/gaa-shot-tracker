export default function HomeLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Title */}
      <div className="h-8 w-36 bg-grey-light rounded-lg" />

      {/* Week summary skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-16 bg-grey-light rounded-xl" />
          ))}
        </div>
      </div>

      {/* Carousel skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-5 w-40 bg-grey-light rounded" />
        <div className="h-48 bg-grey-light rounded-xl" />
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-surface rounded-2xl shadow-sm" />
        ))}
      </div>
    </div>
  );
}
