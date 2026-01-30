import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { aggregate, demoTransactions, filterTransactions, toRows, exportToPDF, formatCurrency, BRANCHES } from "../../lib/financeUtils";
import { Download, FileText } from "lucide-react";

export default function BishopAnalytics() {
  const [branch, setBranch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const tx = demoTransactions();
  const filtered = useMemo(() => filterTransactions(tx, { branch, startDate: dateRange.startDate, endDate: dateRange.endDate }), [tx, branch, dateRange]);
  const agg = useMemo(() => aggregate(filtered), [filtered]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
              <p className="text-gray-600">Export-ready system-wide summaries and branch comparisons.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToPDF({ title: "System-wide Financial Performance", columns: ["Date", "Type", "Category", "Branch", "Amount", "Recorded By"], rows: toRows(filtered) })}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition text-sm font-semibold"
              >
                <Download size={18} /> Export PDF
              </button>
              <button className="inline-flex items-center gap-2 border border-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition text-sm font-semibold">
                <FileText size={18} /> Export Excel
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg shadow p-4">
            <select className="border rounded-md px-3 py-2 text-sm" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input type="date" className="border rounded-md px-3 py-2 text-sm" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
            <input type="date" className="border rounded-md px-3 py-2 text-sm" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
            <div className="ml-auto text-xs text-gray-500">Filters</div>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Financial Performance</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <Row label="Total Income" value={agg.income} />
                <Row label="Total Expenses" value={agg.expenses} />
                <Row label="Net Balance" value={agg.net} strong />
                <Row label="Tithes" value={agg.tithes} />
                <Row label="Offerings" value={agg.offerings} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Branch Comparison</h3>
              <div className="space-y-2 text-sm text-gray-700">
                {BRANCHES.map((b) => {
                  const amount = filterTransactions(filtered, { branch: b, type: "Income" }).reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
                  return (
                    <div key={b} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                      <span>{b}</span>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Stipend Distribution Summary</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {BRANCHES.map((b) => (
                <div key={`stip-${b}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                  <span>{b}</span>
                  <span className="font-semibold">{formatCurrency(estimateStipends(b))}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">Restricted: Analytics only, no data manipulation.</p>
          </section>
        </main>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-semibold ${strong ? "text-gray-900" : "text-gray-800"}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function estimateStipends(branch) {
  // Simple demo estimator based on branch string length
  const base = 10000;
  return base + (branch.length * 123);
}
