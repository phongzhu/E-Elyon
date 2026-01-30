import React from "react";
import { BRANCHES } from "../lib/financeUtils";

export default function BranchSelector({ value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600">Branch</label>
      <select
        className="border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">All Branches</option>
        {BRANCHES.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
    </div>
  );
}
