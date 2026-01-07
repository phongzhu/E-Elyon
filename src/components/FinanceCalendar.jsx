import React, { useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";

// events: [{ date, label, amount, type, branch }]
export default function FinanceCalendar({ events = [] }) {
  const [current, setCurrent] = useState(new Date());

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  const eventMap = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const d = normalizeDate(e.date);
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const monthReleaseTotal = useMemo(() => {
    const start = startOfMonth(current);
    const end = endOfMonth(current);
    return events
      .filter((e) => e.type === "Expense")
      .filter((e) => {
        const d = normalizeDate(e.date);
        return d >= start && d <= end;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [events, current]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Finance Calendar</h3>
          <p className="text-sm text-gray-600">Shows event dates and fund releases</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="px-3 py-1 border rounded-md text-sm">Prev</button>
          <span className="text-sm font-semibold text-gray-800">{format(current, "MMMM yyyy")}</span>
          <button onClick={() => setCurrent(addMonths(current, 1))} className="px-3 py-1 border rounded-md text-sm">Next</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-gray-700">Upcoming releases this month:</span>
        <span className="font-semibold text-rose-700">₱{monthReleaseTotal.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-xs font-semibold text-gray-500 text-center">{d}</div>
        ))}
        {monthDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const items = eventMap.get(key) || [];
          const release = items.filter((x) => x.type === "Expense").reduce((s, x) => s + (Number(x.amount) || 0), 0);
          const income = items.filter((x) => x.type === "Income").reduce((s, x) => s + (Number(x.amount) || 0), 0);
          const dim = isSameMonth(day, current) ? "" : "opacity-40";
          const today = isSameDay(day, new Date());
          return (
            <div key={key} className={`border rounded-lg p-2 min-h-[90px] ${dim} ${today ? "ring-2 ring-emerald-600" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{format(day, "d")}</span>
                <div className="flex items-center gap-1">
                  {income > 0 && <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-700">+₱{income.toLocaleString()}</span>}
                  {release > 0 && <span className="text-[10px] px-1 rounded bg-rose-100 text-rose-700">-₱{release.toLocaleString()}</span>}
                </div>
              </div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 2).map((e, idx) => (
                  <div key={idx} className={`text-[11px] truncate ${e.type === "Expense" ? "text-rose-700" : "text-emerald-700"}`}>
                    {e.label} · ₱{Number(e.amount || 0).toLocaleString()}
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-[11px] text-gray-500">+{items.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 flex items-center gap-3">
        <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded bg-emerald-400 inline-block" /> Income</span>
        <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded bg-rose-400 inline-block" /> Release (Expense)</span>
      </div>
    </div>
  );
}

function normalizeDate(d) {
  try {
    if (d instanceof Date) return d;
    if (typeof d === "string") return parseISO(d);
    return new Date(d);
  } catch (_) {
    return new Date();
  }
}
