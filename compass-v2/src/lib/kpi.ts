import { type KpiStatus } from 'src/constants/enums';
import { floorTo, toNumber } from 'src/lib/money';

// Ported from Nomad Compass v1 (src/lib/kpiStatus.ts). A KPI used to be shown
// as current / target everywhere, which turned a missing or zero target into
// Infinity or NaN on screen. Every KPI now resolves to exactly one named state,
// computed in one place.

export const KPI_STATUS_LABELS: Record<KpiStatus, string> = {
  NO_TARGET: 'No target',
  NOT_STARTED: 'Not started',
  BEHIND: 'Behind',
  ON_TRACK: 'On track',
  MET: 'Met',
  EXCEEDED: 'Exceeded',
};

export type KpiStatusInfo = {
  status: KpiStatus;
  label: string;
  // Always a finite number, never Infinity or NaN. Can exceed 100 for EXCEEDED.
  progressPercent: number;
};

// A negative or non-numeric count is not meaningful for "people served"-style
// measures, so it is treated as zero rather than dragging progress below zero.
const clampNonNegative = (value: unknown): number => {
  const parsed = toNumber(value);

  return parsed !== null && parsed > 0 ? parsed : 0;
};

export const resolveKpiStatus = (
  current: unknown,
  target: unknown,
): KpiStatusInfo => {
  const safeCurrent = clampNonNegative(current);
  const safeTarget = clampNonNegative(target);

  const build = (status: KpiStatus, progressPercent: number): KpiStatusInfo => ({
    status,
    label: KPI_STATUS_LABELS[status],
    progressPercent,
  });

  if (safeTarget === 0) return build('NO_TARGET', 0);
  if (safeCurrent === 0) return build('NOT_STARTED', 0);

  // The status is decided on the exact ratio. Only the number shown is rounded,
  // and it is rounded down, so 99.96% reads 99.9 and is never called "Met".
  const exactPercent = (safeCurrent / safeTarget) * 100;
  const progressPercent = floorTo(exactPercent, 1);

  if (exactPercent > 100) return build('EXCEEDED', progressPercent);
  if (exactPercent >= 100) return build('MET', progressPercent);
  if (exactPercent >= 50) return build('ON_TRACK', progressPercent);

  return build('BEHIND', progressPercent);
};

export type KpiSummary = {
  kpiCount: number;
  // KPIs that have a usable target. Only these count toward progress.
  measuredCount: number;
  // Mean progress of the measured KPIs, each capped at 100 so one KPI that blew
  // past its target cannot hide another that is far behind. Null when nothing
  // is measured, so the screen says "no data" instead of showing 0%.
  averageProgressPercent: number | null;
  countsByStatus: Record<KpiStatus, number>;
};

export const summarizeKpis = (
  kpis: readonly { current?: unknown; target?: unknown }[],
): KpiSummary => {
  const countsByStatus: Record<KpiStatus, number> = {
    NO_TARGET: 0,
    NOT_STARTED: 0,
    BEHIND: 0,
    ON_TRACK: 0,
    MET: 0,
    EXCEEDED: 0,
  };
  const cappedProgress: number[] = [];

  for (const kpi of kpis) {
    const info = resolveKpiStatus(kpi.current, kpi.target);

    countsByStatus[info.status] += 1;

    if (info.status !== 'NO_TARGET') {
      cappedProgress.push(Math.min(info.progressPercent, 100));
    }
  }

  const average =
    cappedProgress.length === 0
      ? null
      : floorTo(
          cappedProgress.reduce((sum, value) => sum + value, 0) /
            cappedProgress.length,
          1,
        );

  return {
    kpiCount: kpis.length,
    measuredCount: cappedProgress.length,
    averageProgressPercent: average,
    countsByStatus,
  };
};
