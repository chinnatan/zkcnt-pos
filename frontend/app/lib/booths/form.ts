import type { DateRange } from "~/lib/booths/calendar";
import type { Booth, BoothExtraCost } from "~/lib/types";

/** Draft of the editable booth fields (info + costs tabs share it). */
export interface BoothForm {
  name: string;
  location: string;
  range: DateRange;
  booth_fee: number;
  extra_costs: BoothExtraCost[];
}

export function formFromBooth(b: Booth): BoothForm {
  return {
    name: b.name,
    location: b.location,
    range: { start: b.start_date, end: b.end_date },
    booth_fee: b.booth_fee,
    extra_costs: b.extra_costs.map((c) => ({ ...c })),
  };
}

/** Normalised payload for `PATCH /booths/:id` (blank rows dropped, end defaults to start). */
export function formToPatch(f: BoothForm) {
  return {
    name: f.name.trim(),
    location: f.location.trim(),
    start_date: f.range.start,
    end_date: f.range.end || f.range.start,
    booth_fee: Number(f.booth_fee) || 0,
    extra_costs: f.extra_costs
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), amount: Number(c.amount) || 0 })),
  };
}

/** True when the draft differs from the saved booth (compared after normalising). */
export function isFormDirty(f: BoothForm, b: Booth): boolean {
  return JSON.stringify(formToPatch(f)) !== JSON.stringify(formToPatch(formFromBooth(b)));
}
