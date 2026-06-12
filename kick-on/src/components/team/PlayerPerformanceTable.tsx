'use client';

import { useMemo, useState } from 'react';
import { JERSEY_ORDER, POSITION_LABELS, POSITION_NAMES } from '@/lib/coachMatch';
import { avgPerf, sumPerf, type PlayerGamePerf } from '@/lib/playerPerformance';

interface PlayerPerformanceTableProps {
  games: PlayerGamePerf[];
}

type SortKey =
  | 'date' | 'competition' | 'opposition' | 'position' | 'role'
  | 'possessions' | 'shots' | 'turnoversWon' | 'turnoversLost' | 'assists' | 'reviewed';

interface ColumnDef {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'date', label: 'Date', numeric: false },
  { key: 'competition', label: 'Competition', numeric: false },
  { key: 'opposition', label: 'Opposition', numeric: false },
  { key: 'position', label: 'Pos', numeric: false },
  { key: 'role', label: 'Start/Sub', numeric: false },
  { key: 'possessions', label: 'Poss', numeric: true },
  { key: 'shots', label: 'Shots', numeric: true },
  { key: 'turnoversWon', label: 'TO Won', numeric: true },
  { key: 'turnoversLost', label: 'TO Lost', numeric: true },
  { key: 'assists', label: 'Assists', numeric: true },
  { key: 'reviewed', label: 'Status', numeric: false },
];

function sortValue(g: PlayerGamePerf, key: SortKey): number | string {
  switch (key) {
    case 'date': return g.date;
    case 'competition': return g.competition.toLowerCase();
    case 'opposition': return g.opposition.toLowerCase();
    case 'position': return JERSEY_ORDER.indexOf(g.position);
    case 'role': return g.isStarter ? -1 : (g.subMinute ?? 999);
    case 'shots': return g.shots;
    case 'reviewed': return g.reviewed ? 1 : 0;
    default: return g[key] as number;
  }
}

export default function PlayerPerformanceTable({ games }: PlayerPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [asc, setAsc] = useState(false); // newest first by default

  const sorted = useMemo(() => {
    const copy = [...games];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [games, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else { setSortKey(key); setAsc(key === 'date' ? false : true); }
  };

  if (games.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">No games match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-text-muted">
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 font-semibold ${
                  c.numeric ? 'text-right' : 'text-left'
                } ${sortKey === c.key ? 'text-primary' : ''}`}
              >
                {c.label}
                {sortKey === c.key && <span className="ml-0.5">{asc ? '▲' : '▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((g) => (
            <tr
              key={g.matchId}
              className={`border-b border-grey-light ${g.reviewed ? '' : 'opacity-50'}`}
            >
              <td className="whitespace-nowrap px-2 py-2 text-text">{g.date}</td>
              <td className="whitespace-nowrap px-2 py-2 text-text-muted">{g.competition}</td>
              <td className="whitespace-nowrap px-2 py-2 font-medium text-text">{g.opposition}</td>
              <td className="px-2 py-2 text-text-muted" title={POSITION_NAMES[g.position]}>
                {POSITION_LABELS[g.position]}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-text-muted">
                {g.isStarter ? 'Start' : (
                  <span className="text-success">
                    Sub{g.subMinute != null ? ` ${g.subMinute}'` : ''}
                  </span>
                )}
              </td>
              <td className="px-2 py-2 text-right text-text">{g.possessions}</td>
              <td className="px-2 py-2 text-right text-text">{g.shotsScored}/{g.shots}</td>
              <td className="px-2 py-2 text-right text-text">{g.turnoversWon}</td>
              <td className="px-2 py-2 text-right text-text">{g.turnoversLost}</td>
              <td className="px-2 py-2 text-right text-text" title={`${g.assistGoals} goal, ${g.assistPoints} point`}>
                {g.assists}
              </td>
              <td className="px-2 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    g.reviewed ? 'bg-success/15 text-success' : 'bg-grey-light text-text-muted'
                  }`}
                >
                  {g.reviewed ? 'Reviewed' : 'Not reviewed'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-text">
          <tr className="border-t-2 border-border font-bold">
            <td className="px-2 py-2" colSpan={5}>Totals ({games.length} games)</td>
            <td className="px-2 py-2 text-right">{sumPerf(games, 'possessions')}</td>
            <td className="px-2 py-2 text-right">{sumPerf(games, 'shotsScored')}/{sumPerf(games, 'shots')}</td>
            <td className="px-2 py-2 text-right">{sumPerf(games, 'turnoversWon')}</td>
            <td className="px-2 py-2 text-right">{sumPerf(games, 'turnoversLost')}</td>
            <td className="px-2 py-2 text-right">{sumPerf(games, 'assists')}</td>
            <td className="px-2 py-2" />
          </tr>
          <tr className="font-semibold text-text-muted">
            <td className="px-2 py-1.5" colSpan={5}>Average per game</td>
            <td className="px-2 py-1.5 text-right">{avgPerf(games, 'possessions')}</td>
            <td className="px-2 py-1.5 text-right">{avgPerf(games, 'shotsScored')}/{avgPerf(games, 'shots')}</td>
            <td className="px-2 py-1.5 text-right">{avgPerf(games, 'turnoversWon')}</td>
            <td className="px-2 py-1.5 text-right">{avgPerf(games, 'turnoversLost')}</td>
            <td className="px-2 py-1.5 text-right">{avgPerf(games, 'assists')}</td>
            <td className="px-2 py-1.5" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
