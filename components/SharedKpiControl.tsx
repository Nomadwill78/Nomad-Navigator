import React from 'react';
import { Link2, Unlink } from 'lucide-react';
import { Grant, GrantKPI } from '../types';

interface Props {
  grant: Grant;
  kpi: GrantKPI;
  /** Every grant the user can link to. Linking is limited to the same program when the grant has one. */
  allGrants: Grant[];
  canEdit: boolean;
  onLink: (sourceGrantId: string, sourceKpiId: string) => void;
  onUnlink: () => void;
}

/**
 * Lets two grants report the same real-world outcome (for example "youth placed in jobs")
 * against different funder targets. The value is entered once and counted once.
 */
export const SharedKpiControl: React.FC<Props> = ({ grant, kpi, allGrants, canEdit, onLink, onUnlink }) => {
  if (kpi.sharedKpiId) {
    const partners = allGrants.filter((g) => g.id !== grant.id && g.kpis.some((k) => k.sharedKpiId === kpi.sharedKpiId));
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-teal">
        <Link2 size={12} />
        <span>
          Same outcome as {partners.length > 0 ? partners.map((g) => g.funder).join(', ') : 'another grant'}. Counted once.
        </span>
        {canEdit && (
          <button onClick={onUnlink} className="inline-flex items-center gap-1 text-inkmute hover:text-parchment underline">
            <Unlink size={11} /> Unlink
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) return null;
  const options = allGrants
    .filter((g) => g.id !== grant.id && (!grant.programId || g.programId === grant.programId))
    .flatMap((g) => g.kpis.map((k) => ({ g, k })));
  if (options.length === 0) return null;

  return (
    <label className="flex flex-wrap items-center gap-2 text-[11px] text-inkfaint">
      <Link2 size={12} />
      <span>Same outcome as another funder's KPI:</span>
      <select
        value=""
        onChange={(e) => {
          const [gid, kid] = e.target.value.split('|');
          if (gid && kid) onLink(gid, kid);
        }}
        className="bg-ink/70 border border-hairline rounded-md px-2 py-1 text-parchment outline-none max-w-[16rem]"
      >
        <option value="">Choose one to link</option>
        {options.map(({ g, k }) => (
          <option key={`${g.id}|${k.id}`} value={`${g.id}|${k.id}`}>{g.funder}: {k.name}</option>
        ))}
      </select>
    </label>
  );
};
