export type BoothView = "calendar" | "list";

const STORAGE_KEY = "booth_calendar_prefs";

interface Prefs {
  view?: BoothView;
  weekStart?: number;
}

function read(): Prefs {
  if (!import.meta.client) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Prefs) : {};
  } catch {
    return {};
  }
}

function write(prefs: Prefs) {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode errors
  }
}

/**
 * Per-device calendar preferences (localStorage): booth view and first day of
 * the week (0 = Sunday … 6 = Saturday; default Sunday). The view defaults to
 * the calendar on wide screens and the list on phones until the user picks one.
 */
export function useCalendarPrefs() {
  const saved = read();
  const view = useState<BoothView>("booth-view", () =>
    saved.view === "calendar" || saved.view === "list"
      ? saved.view
      : import.meta.client && window.innerWidth < 1024
        ? "list"
        : "calendar",
  );
  const weekStart = useState<number>("calendar-week-start", () =>
    Number.isInteger(saved.weekStart) && saved.weekStart! >= 0 && saved.weekStart! <= 6
      ? saved.weekStart!
      : 0,
  );

  function setView(next: BoothView) {
    view.value = next;
    write({ ...read(), view: next });
  }

  function setWeekStart(day: number) {
    weekStart.value = day;
    write({ ...read(), weekStart: day });
  }

  return { view, weekStart, setView, setWeekStart };
}
