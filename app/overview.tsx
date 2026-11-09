import type { ReactNode } from 'react';
import { OVERRUN_MARGIN, SHORTFALL_MARGIN, INCOME_SERIOUS_SHARE } from '@/lib/budget-pace';
import { Pending } from './kitsas-pending';

export type Totals = { usedCents: number; plannedCents: number; expectedCents: number };
type Tone = 'over' | 'ahead' | 'good';

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('fi-FI', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);

/** Both halves of the budget are judged against pace, never against the calendar alone. */
function expenseTone(totals: Totals): Tone {
  if (totals.plannedCents > 0 && totals.usedCents > totals.plannedCents) return 'over';
  return totals.usedCents > totals.expectedCents * OVERRUN_MARGIN ? 'ahead' : 'good';
}

function incomeTone(totals: Totals): Tone {
  if (totals.plannedCents === 0 || totals.expectedCents === 0) return 'good';
  if (totals.usedCents < totals.expectedCents * INCOME_SERIOUS_SHARE) return 'over';
  return totals.usedCents < totals.expectedCents * SHORTFALL_MARGIN ? 'ahead' : 'good';
}

/**
 * The state of the budget as a whole, then the lines that have drifted off their
 * own pace. Every bar reads the same way: the fill is what has actually
 * happened, the solid tick is where the line should stand today, and the track
 * ends at the full-year estimate.
 */
export function Overview({
  currency,
  awaiting,
  expense,
  income,
}: {
  currency: string;
  awaiting: boolean;
  expense: Totals;
  income: Totals;
}) {
  if (awaiting)
    return (
      <section className="card overview">
        <div className="section-head">
          <h2>Yleiskuva</h2>
        </div>
        <div className="empty">
          <Pending wide />
        </div>
      </section>
    );
  return (
    <section className="card overview">
      <div className="section-head">
        <h2>Yleiskuva</h2>
        <span className="label">kuluva kausi suhteessa arvioon</span>
      </div>
      <div className="overview-totals">
        <MeterRow name="Menot" tone={expenseTone(expense)} totals={expense} currency={currency} />
        <MeterRow name="Tulot" tone={incomeTone(income)} totals={income} currency={currency} />
      </div>
      <p className="meter-legend">
        <span>
          <span className="meter-key" />
          Tavoitetaso tänään
        </span>
        <span>
          <span className="meter-key meter-key-plan" />
          Koko vuoden arvio
        </span>
      </p>
    </section>
  );
}

export function BudgetMeter({ tone, totals, compact = false }: { tone: Tone; totals: Totals; compact?: boolean }) {
  /** The track runs to whichever is larger, so an overrun stays visible instead of pinning at full. */
  const scale = Math.max(totals.plannedCents, totals.usedCents, totals.expectedCents, 1);
  const pct = (cents: number) => Math.min(100, Math.max(0, (cents / scale) * 100));
  /** A few euros against a five-figure budget would otherwise render as nothing at all. */
  const fill = totals.usedCents > 0 ? Math.max(1.5, pct(totals.usedCents)) : 0;
  return (
    <div className={compact ? 'meter meter-compact' : 'meter'} data-tone={tone}>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${fill}%` }} />
        {totals.plannedCents > 0 && totals.plannedCents < scale && (
          <span className="meter-plan" style={{ left: `${pct(totals.plannedCents)}%` }} />
        )}
        {totals.expectedCents > 0 && <span className="meter-now" style={{ left: `${pct(totals.expectedCents)}%` }} />}
      </div>
    </div>
  );
}

function MeterRow({
  name,
  tone,
  label,
  totals,
  currency,
  note,
}: {
  name: ReactNode;
  tone: Tone;
  label?: string;
  totals: Totals;
  currency: string;
  note?: string;
}) {
  return (
    <div className="overview-row">
      <div className="overview-row-head">
        <span className="overview-name">{name}</span>
        {label && <span className={`badge badge-${tone}`}>{label}</span>}
        <span className="overview-figures">
          {money(totals.usedCents, currency)} / {money(totals.plannedCents, currency)}
        </span>
      </div>
      <BudgetMeter tone={tone} totals={totals} />
      {/* The solid tick in euros, named as the legend names it, so the fill-vs-tick
          read does not depend on judging a pixel position against the track. */}
      {totals.expectedCents > 0 && (
        <span className="label">Tavoitetaso tänään {money(totals.expectedCents, currency)}</span>
      )}
      {note && <span className="label">{note}</span>}
    </div>
  );
}
