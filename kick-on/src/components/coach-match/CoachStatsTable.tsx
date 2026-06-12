'use client';

import { useMemo, useState } from 'react';
import { ALL_POSITIONS, POSITION_LABELS, POSITION_NAMES } from '@/lib/coachMatch';
import { sumField, type PlayerStatRow } from '@/lib/coachStats';

interface CoachStatsTableProps {
  rows: PlayerStatRow[];
  onRowClick: (row: PlayerStatRow) => void;
}

type SortKey =
  | 'name' | 'position' | 'reviewed'
  | 'possessions' | 'shots' | 'turnoversWon' | 'turnoversLost' | 'assists' | 'kickouts';

interface ColumnDef {
  key: SortKey;
  label: string;
  title?: string;
  numeric: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Player', numeric: false },
  { key: 'position', label: 'Pos', numeric: false },
  { key: 'reviewed', label: 'Status', numeric: false },
  { key: 'possessions', label: 'Poss', numeric: true },
  { key: 'shots', label: 'Shots', title: 'scored / total', numeric: true },
  { key: 'turnoversWon', label: 'TO Won', numeric: true },
  { key: 'turnoversLost', label: 'TO Lost', numeric: true },
  { key: 'assists', label: 'Assists', title: 'goal / point in brackets', numeric: true },
  { key: 'kickouts', label: 'KO', title: 'won / lost (GK)', numeric: true },
];

function sortValue(row: PlayerStatRow, key: SortKey): number | string {
  switch (key) {
    case 'name': return row.name.toLowerCase();
    case 'position': return ALL_POSITIONS.indexOf(row.position);
    case 'reviewed': return row.reviewed ? 1 : 0;
    case 'shots': return row.shots;
    case 'kickouts': return row.kickoutsWon + row.kickoutsLost;
    default: return row[key] as number;
  }
}

export default function CoachStatsTable({ rows, onRowClick }: CoachStatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else { setSortKey(key); setAsc(true); }
  };

  const hasKickouts = rows.some((r) => r.position === 'GK');
  const columns = hasKickouts ? COLUMNS : COLUMNS.filter((c) => c.key !== 'kickouts');

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">No players assigned to this game.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-text-muted">
            {columns.map((c) => (
              <th
                key={c.key}
                title={c.title}
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
          {sorted.map((r) => (
            <tr
              key={r.cmpId}
              onClick={() => onRowClick(r)}
              className={`cursor-pointer border-b border-grey-light transition-colors hover:bg-grey-light ${
                r.reviewed ? '' : 'opacity-50'
              }`}
            >
              <td className="whitespace-nowrap px-2 py-2 font-semibold text-text">
                {r.name}
                {!r.isStarter && <span className="ml-1 text-[10px] text-success">(sub)</span>}
              </td>
              <td className="px-2 py-2 text-text-muted" title={POSITION_NAMES[r.position]}>
                {POSITION_LABELS[r.position]}
              </td>
              <td className="px-2 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.reviewed ? 'bg-success/15 text-success' : 'bg-grey-light text-text-muted'
                  }`}
                >
                  {r.reviewed ? 'Reviewed' : 'Not reviewed'}
                </span>
              </td>
              <td className="px-2 py-2 text-right text-text">{r.possessions}</td>
              <td className="px-2 py-2 text-right text-text">
                {r.shotsScored}/{r.shots}
              </td>
              <td className="px-2 py-2 text-right text-text">{r.turnoversWon}</td>
              <td className="px-2 py-2 text-right text-text">{r.turnoversLost}</td>
              <td className="px-2 py-2 text-right text-text" title={`${r.assistGoals} goal, ${r.assistPoints} point`}>
                {r.assists}
                {r.assists > 0 && (
                  <span className="text-text-muted"> ({r.assistGoals}g/{r.assistPoints}p)</span>
                )}
              </td>
              {hasKickouts && (
                <td className="px-2 py-2 text-right text-text">
                  {r.position === 'GK' ? `${r.kickoutsWon}/${r.kickoutsLost}` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-bold text-text">
            <td className="px-2 py-2" colSpan={3}>Team totals</td>
            <td className="px-2 py-2 text-right">{sumField(rows, 'possessions')}</td>
            <td className="px-2 py-2 text-right">
              {sumField(rows, 'shotsScored')}/{sumField(rows, 'shots')}
            </td>
            <td className="px-2 py-2 text-right">{sumField(rows, 'turnoversWon')}</td>
            <td className="px-2 py-2 text-right">{sumField(rows, 'turnoversLost')}</td>
            <td className="px-2 py-2 text-right">{sumField(rows, 'assists')}</td>
            {hasKickouts && (
              <td className="px-2 py-2 text-right">
                {sumField(rows, 'kickoutsWon')}/{sumField(rows, 'kickoutsLost')}
              </td>
            )}
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 px-2 text-[11px] text-text-muted">
        Tap a player for their detailed breakdown. Greyed rows haven&apos;t submitted yet.
      </p>
    </div>
  );
}
