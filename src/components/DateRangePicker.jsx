import React from "react";

export default function DateRangePicker({ startDate, endDate, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600">Start</label>
      <input
        type="date"
        className="border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white"
        value={startDate || ""}
        onChange={(e) => onChange?.({ startDate: e.target.value, endDate })}
      />
      <label className="text-sm text-gray-600">End</label>
      <input
        type="date"
        className="border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white"
        value={endDate || ""}
        onChange={(e) => onChange?.({ startDate, endDate: e.target.value })}
      />
    </div>
  );
}
