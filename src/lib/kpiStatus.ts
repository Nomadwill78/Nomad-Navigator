/**
 * A KPI's progress used to be computed as `current / target` wherever it was
 * displayed, which meant a `target` of 0 (or missing) produced `Infinity` or
 * `NaN` on screen — a real number in place of a state that never actually
 * "started" or "isn't measured". Every KPI now resolves to exactly one of
 * these named states, computed once, here.
 */
export type KpiStatus = 'no_target' | 'not_started' | 'behind' | 'on_track' | 'met' | 'exceeded';

export interface KpiStatusInfo {
  status: KpiStatus;
  label: string;
  /** Always a finite number, never Infinity/NaN. Can exceed 100 for 'exceeded'. */
  progressPercent: number;
}

const STATUS_LABELS: Record<KpiStatus, string> = {
  no_target: 'No Target',
  not_started: 'Not Started',
  behind: 'Behind',
  on_track: 'On Track',
  met: 'Met',
  exceeded: 'Exceeded',
};

/** Negative progress isn't meaningful for a "people served"-style count. */
function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function resolveKpiStatus(current: number, target: number): KpiStatusInfo {
  const safeCurrent = clampNonNegative(current);
  const safeTarget = clampNonNegative(target);

  if (safeTarget === 0) {
    return { status: 'no_target', label: STATUS_LABELS.no_target, progressPercent: 0 };
  }
  if (safeCurrent === 0) {
    return { status: 'not_started', label: STATUS_LABELS.not_started, progressPercent: 0 };
  }

  const progressPercent = (safeCurrent / safeTarget) * 100;

  let status: KpiStatus;
  if (progressPercent > 100) status = 'exceeded';
  else if (progressPercent >= 100) status = 'met';
  else if (progressPercent >= 50) status = 'on_track';
  else status = 'behind';

  return { status, label: STATUS_LABELS[status], progressPercent };
}
