import React, { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { BarChart3, PieChart, FileText, Download, History, Filter } from "lucide-react";
import BranchSelector from "../../components/BranchSelector";
import DateRangePicker from "../../components/DateRangePicker";
import { supabase } from "../../lib/supabaseClient";
import { aggregate, demoTransactions, filterTransactions, formatCurrency, BRANCHES, exportToPDF, toRows } from "../../lib/financeUtils";
import { format, startOfWeek } from "date-fns";

export default function FinanceReports() {
  const [branch, setBranch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [allTx, setAllTx] = useState([]);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data, error } = await supabase.from("finance_transactions").select("*");
        if (error || !data || !data.length) setAllTx(demoTransactions());
        else {
          const normalized = data.map((t, i) => ({
            id: t.id ?? i + 1,
            date: t.date ?? new Date(),
            type: t.type ?? (Number(t.amount) >= 0 ? "Income" : "Expense"),
            category: t.category ?? t.source ?? "-",
            branch: t.branch ?? BRANCHES[0],
            amount: Math.abs(Number(t.amount ?? 0)),
            recordedBy: t.recordedBy ?? t.member ?? "-",
          }));
          if (mounted) setAllTx(normalized);
        }
      } catch (_) {
        if (mounted) setAllTx(demoTransactions());
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => filterTransactions(allTx, {
    branch,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [allTx, branch, dateRange]);

  const agg = useMemo(() => aggregate(filtered), [filtered]);

  const titheCollection = useMemo(() => BRANCHES.map((b) => ({
    branch: b,
    period: "Current",
    amount: filterTransactions(filtered, { branch: b, category: "Tithe" }).reduce((acc, x) => acc + (Number(x.amount) || 0), 0),
  })), [filtered]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map();
    filterTransactions(filtered, { type: "Expense" }).forEach((t) => {
      const key = t.category || "Other";
      map.set(key, (map.get(key) || 0) + (Number(t.amount) || 0));
    });
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
  }, [filtered]);

  const electricityTotal = useMemo(() =>
    filterTransactions(filtered, { type: "Expense", category: "Electricity" })
      .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  , [filtered]);

  const miscTotal = useMemo(() =>
    filterTransactions(filtered, { type: "Expense", category: "Miscellaneous" })
      .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  , [filtered]);

  const waterTotal = useMemo(() =>
    filterTransactions(filtered, { type: "Expense", category: "Water" })
      .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  , [filtered]);

  const internetTotal = useMemo(() =>
    filterTransactions(filtered, { type: "Expense", category: "Internet" })
      .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  , [filtered]);

  const rentTotal = useMemo(() =>
    filterTransactions(filtered, { type: "Expense", category: "Rent" })
      .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  , [filtered]);

  const payrollTotal = useMemo(() =>
    filterTransactions(filtered, { type: "Expense", category: "Payroll" })
      .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  , [filtered]);

  const periodKey = useCallback((d) => {
    const dd = new Date(d);
    if (period === "daily") return format(dd, "yyyy-MM-dd");
    if (period === "weekly") return format(startOfWeek(dd, { weekStartsOn: 0 }), "yyyy-'W'ww");
    if (period === "yearly") return format(dd, "yyyy");
    return format(dd, "yyyy-MM");
  }, [period]);

  const expensesByPeriod = useMemo(() => {
    const list = filterTransactions(filtered, { type: "Expense" });
    const map = new Map();
    list.forEach((t) => {
      const key = periodKey(t.date);
      map.set(key, (map.get(key) || 0) + (Number(t.amount) || 0));
    });
    return Array.from(map.entries()).map(([key, amount]) => ({ key, amount }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered, periodKey]);

  const auditLog = [
    { ts: new Date().toLocaleString(), action: "Viewed Finance Reports", role: "Finance" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Reports and Analytics</h1>
              <p className="text-gray-600 mt-2">Filter, analyze, and export finance reports.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToPDF({
                  title: "Finance – Consolidated Report",
                  columns: ["Date", "Type", "Category", "Branch", "Amount", "Recorded By"],
                  rows: toRows(filtered),
                })}
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
            <BranchSelector value={branch} onChange={setBranch} />
            <DateRangePicker startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />
            <div className="ml-auto text-xs text-gray-500 inline-flex items-center gap-1"><Filter size={14} /> Filters</div>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Financial Summary</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <Row label="Total Income" value={agg.income} positive />
                <Row label="Total Expenses" value={agg.expenses} negative />
                <Row label="Net Balance" value={Math.abs(agg.net)} strong />
                <Row label="Tithes" value={agg.tithes} />
                <Row label="Offerings" value={agg.offerings} />
                <Row label="Electricity" value={electricityTotal} negative />
                <Row label="Miscellaneous" value={miscTotal} negative />
                <Row label="Water" value={waterTotal} negative />
                <Row label="Internet" value={internetTotal} negative />
                <Row label="Rent" value={rentTotal} negative />
                <Row label="Payroll" value={payrollTotal} negative />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <div className="flex items-center gap-2 text-emerald-700 mb-3">
                <BarChart3 size={18} />
                <h2 className="text-lg font-semibold text-gray-900">Income vs. Expenses (Monthly)</h2>
              </div>
              <div className="space-y-3 text-sm">
                <Bar label="Income" amount={agg.income} color="#0B6516" max={agg.income || 1} />
                <Bar label="Expenses" amount={agg.expenses} color="#9C0808" max={agg.income || 1} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tithe Collection Reports</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Branch</th>
                      <th className="px-4 py-3 font-semibold">Period</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {titheCollection.map((t) => (
                      <tr key={t.branch} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{t.branch}</td>
                        <td className="px-4 py-3 text-gray-700">{t.period}</td>
                        <td className="px-4 py-3 text-gray-900">₱{t.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 text-rose-700 mb-3">
                <PieChart size={18} />
                <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
              </div>
              <div className="space-y-3 text-sm">
                {expenseBreakdown.map((e) => (
                  <div key={e.category} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-gray-700">{e.category}</span>
                    <span className="font-semibold text-gray-900">₱{e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Events & Outreach Expenses</h3>
              <p className="text-sm text-gray-600 mb-3">Events and outreach activities incur church expenses.</p>
              <div className="space-y-2 text-sm text-gray-700">
                {filterTransactions(filtered, { type: "Expense", category: "Event" }).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>{t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {filterTransactions(filtered, { type: "Expense", category: "Outreach" }).map((t) => (
                  <div key={`o-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>Outreach · {t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {filterTransactions(filtered, { type: "Expense", category: "Miscellaneous" }).map((t) => (
                  <div key={`m-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>Misc · {t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Utilities & Payroll</h3>
              <p className="text-sm text-gray-600 mb-3">Electricity, water, internet, rent, and payroll expenses.</p>
              <div className="space-y-2 text-sm text-gray-700">
                {filterTransactions(filtered, { type: "Expense", category: "Electricity" }).map((t) => (
                  <div key={`el-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>{t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {filterTransactions(filtered, { type: "Expense", category: "Water" }).map((t) => (
                  <div key={`wa-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>Water · {t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {filterTransactions(filtered, { type: "Expense", category: "Internet" }).map((t) => (
                  <div key={`in-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>Internet · {t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {filterTransactions(filtered, { type: "Expense", category: "Rent" }).map((t) => (
                  <div key={`re-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>Rent · {t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {filterTransactions(filtered, { type: "Expense", category: "Payroll" }).map((t) => (
                  <div key={`pa-${t.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>Payroll · {t.branch} · {new Date(t.date).toLocaleDateString()}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                {electricityTotal + waterTotal + internetTotal + rentTotal + payrollTotal === 0 && (
                  <div className="text-xs text-gray-500">No utility or payroll expenses in current filters.</div>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Branch Performance Comparison</h3>
              <p className="text-sm text-gray-600 mb-3">Fund contribution trends by branch.</p>
              <div className="space-y-2 text-sm text-gray-700">
                {titheCollection.map((t) => (
                  <Bar key={t.branch} label={t.branch} amount={t.amount} color="#0B6516" max={Math.max(...titheCollection.map((x) => x.amount)) || 1} />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Stipend Distribution Report</h3>
              <p className="text-sm text-gray-600 mb-3">Released vs pending (placeholder)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Released", amount: 32400 },
                  { label: "Pending", amount: 12800 },
                ].map((s) => (
                  <div key={s.label} className="border border-gray-100 rounded-lg p-3">
                    <p className="text-gray-600">{s.label}</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(s.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">General Ledger</h3>
                <span className="text-xs text-gray-500">Filtered by branch & dates</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Branch</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((t) => (
                      <tr key={`gl-${t.id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-700">{t.branch}</td>
                        <td className={`px-4 py-3 font-semibold ${t.type === "Income" ? "text-emerald-700" : "text-rose-700"}`}>{t.type}</td>
                        <td className="px-4 py-3 text-gray-700">{t.category}</td>
                        <td className="px-4 py-3 text-gray-900">{formatCurrency(t.amount)}</td>
                        <td className="px-4 py-3 text-gray-700">{t.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Expenses by Period</h3>
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {expensesByPeriod.map((row) => (
                  <div key={row.key} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>{row.key}</span>
                    <span className="font-semibold">{formatCurrency(row.amount)}</span>
                  </div>
                ))}
                {expensesByPeriod.length === 0 && (
                  <div className="text-xs text-gray-500">No expenses in current filters.</div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 text-gray-800 mb-3">
              <History size={18} />
              <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">User Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLog.map((a, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{a.ts}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{a.action}</td>
                      <td className="px-4 py-3 text-gray-700">{a.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Row({ label, value, positive, negative, strong }) {
  const color = strong ? "text-gray-900" : positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-gray-800";
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-semibold ${color}`}>₱{value.toLocaleString()}</span>
    </div>
  );
}

function Bar({ label, amount, color, max }) {
  const width = Math.max(8, Math.min(100, Math.round((amount / max) * 100)));
  return (
    <div>
      <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
        <span>{label}</span>
        <span>₱{amount.toLocaleString()}</span>
      </div>
      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
