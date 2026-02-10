export default function TrackLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Session controls skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
        <div className="h-5 w-32 bg-grey-light rounded" />
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-grey-light rounded-xl" />
          <div className="flex-1 h-10 bg-grey-light rounded-xl" />
        </div>
        <div className="h-10 w-full bg-grey-light rounded-xl" />
      </div>

      {/* Pitch skeleton */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="h-80 bg-pitch-green/30 rounded-xl" />
      </div>
    </div>
  );
}
