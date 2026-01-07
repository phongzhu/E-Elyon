import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { Plus, Sparkles, Download, Filter } from "lucide-react";
import BranchSelector from "../../components/BranchSelector";
import DateRangePicker from "../../components/DateRangePicker";
import { supabase } from "../../lib/supabaseClient";
import {
  aggregate,
  demoTransactions,
  exportToPDF,
  filterTransactions,
  toRows,
  formatCurrency,
  BRANCHES,
} from "../../lib/financeUtils";

export default function FinanceFunds() {
  const [tab, setTab] = useState("overview");
  const [branch, setBranch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data } = await (async () => {
          // Attempt Supabase, fallback to demo
          try {
            const { data, error } = await supabase.from("finance_transactions").select("*");
            if (error || !data || !data.length) return { data: demoTransactions() };
            const normalized = data.map((t, i) => ({
              id: t.id ?? i + 1,
              date: t.date ?? new Date(),
              type: t.type ?? (Number(t.amount) >= 0 ? "Income" : "Expense"),
              category: t.category ?? t.source ?? "-",
              branch: t.branch ?? BRANCHES[0],
              amount: Math.abs(Number(t.amount ?? 0)),
              recordedBy: t.recordedBy ?? t.member ?? "-",
            }));
            return { data: normalized };
          } catch (_) {
            return { data: demoTransactions() };
          }
        })();
        if (mounted) setAllTx(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => filterTransactions(allTx, {
    branch,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...(tab === "income" ? { type: "Income" } : {}),
    ...(tab === "expenses" ? { type: "Expense" } : {}),
    ...(tab === "tithes" ? { category: "Tithe" } : {}),
    ...(tab === "offerings" ? { category: "Offering" } : {}),
  }), [allTx, branch, dateRange, tab]);

  const agg = useMemo(() => aggregate(filtered), [filtered]);

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Church Fund Management</h1>
              <p className="text-gray-600 mt-2">Income, expenses, tithes, offerings across branches.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => exportToPDF({
                  title: "Funds – Transactions",
                  columns: ["Date", "Type", "Category", "Branch", "Amount", "Recorded By"],
                  rows: toRows(filtered),
                })}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition"
              >
                <Download size={18} /> Export PDF
              </button>
              <button className="inline-flex items-center gap-2 border border-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition">
                <Plus size={18} /> Add Fund Record
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg shadow p-4">
            <BranchSelector value={branch} onChange={setBranch} />
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={setDateRange}
            />
            <div className="ml-auto text-xs text-gray-500 inline-flex items-center gap-1"><Filter size={14} /> Filters</div>
          </div>

          <div className="bg-white rounded-lg shadow px-4 py-2 flex flex-wrap gap-2">
            {[
              { key: "overview", label: "All" },
              { key: "income", label: "Income" },
              { key: "expenses", label: "Expenses" },
              { key: "tithes", label: "Tithes" },
              { key: "offerings", label: "Offerings" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1 rounded-md text-sm border ${tab === t.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-800 border-gray-200"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Tithes" value={agg.tithes} />
            <SummaryCard label="Offerings" value={agg.offerings} />
            <SummaryCard label="Income (All)" value={agg.income} />
            <SummaryCard label="Expenses" value={agg.expenses} negative />
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Per-Branch Snapshot</h2>
              <span className="text-xs text-gray-500">Based on current filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {BRANCHES.map((b) => {
                const rows = filterTransactions(filtered, { branch: b });
                const sums = aggregate(rows);
                return (
                  <div key={b} className="border border-gray-100 rounded-lg p-4">
                    <p className="font-semibold text-gray-800">{b}</p>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      <div className="flex justify-between"><span>Income</span><span className="font-semibold">{formatCurrency(sums.income)}</span></div>
                      <div className="flex justify-between"><span>Expenses</span><span className="font-semibold">{formatCurrency(sums.expenses)}</span></div>
                      <div className="flex justify-between"><span>Net</span><span className="font-semibold">{formatCurrency(Math.abs(sums.net))}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Records</h3>
                <span className="text-xs text-gray-500">Filtered list</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Branch</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{new Date(t.date).toLocaleDateString()}</td>
                        <td className={`px-4 py-3 font-semibold ${t.type === "Income" ? "text-emerald-700" : "text-rose-700"}`}>{t.type}</td>
                        <td className="px-4 py-3 text-gray-700">{t.category}</td>
                        <td className="px-4 py-3 text-gray-700">{t.branch}</td>
                        <td className="px-4 py-3 text-gray-900">{formatCurrency(t.amount)}</td>
                        <td className="px-4 py-3 text-gray-500">{t.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <AddForms onAdd={(record) => setAllTx((prev) => [...prev, { id: prev.length + 1000, ...record }])} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles size={18} />
                <h3 className="text-lg font-semibold text-gray-900">Financial Forecast (Advisory)</h3>
              </div>
              <p className="text-sm text-gray-600">Projection based on filtered historicals.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <ForecastRow label="Projected Monthly Income" value={agg.income * 1.05} />
                <ForecastRow label="Projected Monthly Expenses" value={agg.expenses * 1.02} />
                <ForecastRow label="Projected Month-End Balance" value={(agg.income * 1.05) - (agg.expenses * 1.02)} />
                <div className="border border-gray-100 rounded-lg p-3">
                  <p className="text-gray-600">Risk: Shortage Window</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{agg.net > 0 ? "Low (next 30 days)" : "Medium"}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500">Forecasts are advisory and do not execute financial actions.</div>
            </div>

            <RevolvingFundRequests />
          </section>
        </main>
      </div>
    </div>
  );
}

  function SummaryCard({ label, value, negative }) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${negative ? "text-rose-700" : "text-gray-900"} mt-2`}>{formatCurrency(value)}</p>
      </div>
    );
  }

  function ForecastRow({ label, value }) {
    return (
      <div className="border border-gray-100 rounded-lg p-3">
        <p className="text-gray-600">{label}</p>
        <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(value)}</p>
      </div>
    );
  }

  function AddForms({ onAdd }) {
    const [memberName, setMemberName] = useState("");
    const [amount, setAmount] = useState("");
    const [branchSel, setBranchSel] = useState("");
    const [dateSel, setDateSel] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState("Event");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseBranch, setExpenseBranch] = useState("");
    const [expenseDate, setExpenseDate] = useState("");
    const [expenseNote, setExpenseNote] = useState("");

    function addTitheOrOffering() {
      const amt = Number(amount) || 0;
      const hasMember = memberName.trim().length > 0;
      const category = isAnonymous ? (amt > 1000 ? "Tithe" : "Love Gift") : "Tithe";
      const record = {
        date: dateSel || new Date(),
        type: "Income",
        category,
        branch: branchSel || BRANCHES[0],
        amount: amt,
        recordedBy: hasMember ? memberName : "Anonymous",
      };
      onAdd?.(record);
      setMemberName("");
      setAmount("");
      setIsAnonymous(false);
    }

    function addExpense() {
      const amt = Number(expenseAmount) || 0;
      const record = {
        date: expenseDate || new Date(),
        type: "Expense",
        category: expenseCategory,
        branch: expenseBranch || BRANCHES[0],
        amount: amt,
        recordedBy: expenseNote || "-",
      };
      onAdd?.(record);
      setExpenseAmount("");
      setExpenseNote("");
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Tithe / Offering</h3>
          <span className="text-xs text-gray-500">Search member first</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Member Name</p>
            <input className="mt-1 border rounded-lg px-3 py-2 w-full" placeholder="Search or type member name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
          </div>
          <div>
            <p className="text-gray-600">Amount</p>
            <input type="number" className="mt-1 border rounded-lg px-3 py-2 w-full" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <p className="text-gray-600">Date</p>
            <input type="date" className="mt-1 border rounded-lg px-3 py-2 w-full" value={dateSel} onChange={(e) => setDateSel(e.target.value)} />
          </div>
          <div>
            <p className="text-gray-600">Branch</p>
            <select className="mt-1 border rounded-lg px-3 py-2 w-full" value={branchSel} onChange={(e) => setBranchSel(e.target.value)}>
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} /> Anonymous offering? (auto: &gt;1000 → Tithe, else Love Gift)
          </label>
        </div>
        <div className="flex gap-3">
          <button onClick={addTitheOrOffering} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition">
            Add Record
          </button>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add Expense</h3>
            <span className="text-xs text-gray-500">Events cause expenses; include misc items</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Category</p>
              <select className="mt-1 border rounded-lg px-3 py-2 w-full" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                <option>Event</option>
                <option>Outreach</option>
                <option>Equipment</option>
                <option>Miscellaneous</option>
              </select>
            </div>
            <div>
              <p className="text-gray-600">Amount</p>
              <input type="number" className="mt-1 border rounded-lg px-3 py-2 w-full" placeholder="0" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <input type="date" className="mt-1 border rounded-lg px-3 py-2 w-full" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div>
              <p className="text-gray-600">Branch</p>
              <select className="mt-1 border rounded-lg px-3 py-2 w-full" value={expenseBranch} onChange={(e) => setExpenseBranch(e.target.value)}>
                <option value="">Select branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-600">Notes (event name, details, misc)</p>
              <input className="mt-1 border rounded-lg px-3 py-2 w-full" placeholder="e.g., Christmas Outreach supplies" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addExpense} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition">
              Add Expense
            </button>
          </div>
        </div>
      </div>
    );
  }

  function RevolvingFundRequests() {
    const [requests, setRequests] = useState([
      { id: 1, branch: "San Roque", amount: 15000, purpose: "Sound system repair", status: "Pending" },
      { id: 2, branch: "Vizal Pampanga", amount: 8000, purpose: "Venue maintenance", status: "Pending" },
      { id: 3, branch: "Bustos", amount: 12000, purpose: "Outreach materials", status: "Approved" },
    ]);

    function approve(id) {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Approved" } : r)));
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Revolving Fund Requests</h3>
          <span className="text-xs text-gray-500">From sub-branches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.branch}</td>
                  <td className="px-4 py-3 text-gray-900">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.purpose}</td>
                  <td className="px-4 py-3 text-gray-700">{r.status}</td>
                  <td className="px-4 py-3">
                    {r.status === "Pending" && (
                      <button onClick={() => approve(r.id)} className="text-sm text-emerald-700 font-semibold hover:underline">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }