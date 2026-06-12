'use client';

import PlayerGamesList from './PlayerGamesList';

interface GameReviewSectionProps {
  teamName: string;
  teamId?: string;
}

/**
 * Dashboard "Game Review" section — shows games the coach has sent that the
 * player has not yet reviewed. Hides itself entirely when there are none.
 */
export default function GameReviewSection({ teamName, teamId }: GameReviewSectionProps) {
  return (
    <PlayerGamesList
      heading="Game Review"
      teamName={teamName}
      teamId={teamId}
      filter="unreviewed"
      emptyMode="hide"
    />
  );
}
