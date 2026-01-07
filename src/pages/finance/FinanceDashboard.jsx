import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
} from "lucide-react";
import BranchSelector from "../../components/BranchSelector";
import DateRangePicker from "../../components/DateRangePicker";
import { supabase } from "../../lib/supabaseClient";
import { aggregate, filterTransactions, demoTransactions, formatCurrency, BRANCHES } from "../../lib/financeUtils";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import FinanceCalendar from "../../components/FinanceCalendar";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function FinanceDashboard() {
  const { branding } = useBranding();
  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";
  const neutral = "#e5e7eb";
  const [branch, setBranch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [allTx, setAllTx] = useState([]);
  const [insightTab, setInsightTab] = useState("recent");
  const [advisoryTab, setAdvisoryTab] = useState("risk");

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

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Finance Dashboard</h1>
              <p className="text-gray-600 mt-2">High-level snapshot of church financial health.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <BranchSelector value={branch} onChange={setBranch} />
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onChange={setDateRange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<DollarSign size={22} style={{ color: primaryColor }} />} label="Income" value={agg.income} />
              <StatCard icon={<Wallet size={22} style={{ color: secondaryColor }} />} label="Expenses" value={agg.expenses} />
              <StatCard icon={<TrendingUp size={22} style={{ color: primaryColor }} />} label="Net" value={Math.abs(agg.net)} />
              <StatCard icon={<PieChart size={22} style={{ color: secondaryColor }} />} label="Tithes + Offerings" value={agg.tithes + agg.offerings} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Income vs Expenses</h2>
                    <p className="text-sm text-gray-600">Based on current filters</p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Net {formatCurrency(Math.abs(agg.net))}</span>
                </div>
                <div className="h-56">
                  <Bar
                  data={{
                    labels: ["Income", "Expenses"],
                    datasets: [
                      { label: "Amount", data: [agg.income, agg.expenses], backgroundColor: [primaryColor, secondaryColor] },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-0 lg:col-span-2">
                <div className="border-b px-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Insights</h2>
                    <div className="flex gap-2">
                      {[
                        { key: "recent", label: "Recent Transactions" },
                        { key: "contrib", label: "Branch Contribution" },
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setInsightTab(t.key)}
                          className={`px-3 py-2 text-sm rounded-t-md ${insightTab === t.key ? "bg-white border-x border-t border-gray-200 text-gray-900" : "text-gray-600"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {insightTab === "recent" ? (
                    <ul className="divide-y divide-gray-100">
                      {filtered.slice(0, 8).map((tx) => {
                        const isIncome = tx.type === "Income";
                        return (
                          <li key={tx.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{tx.category} · {tx.branch}</p>
                              <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isIncome ? (
                                <ArrowUpRight size={16} className="text-emerald-600" />
                              ) : (
                                <ArrowDownLeft size={16} className="text-rose-600" />
                              )}
                              <span className={`text-sm font-semibold ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>
                                {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Highest and lowest contributing branches</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {BRANCHES.map((b) => {
                          const rows = filterTransactions(filtered, { branch: b });
                          const sums = aggregate(rows);
                          return (
                            <div key={b} className="border border-gray-100 rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: neutral }}>
                                  <Building2 size={18} className="text-gray-700" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{b}</p>
                                  <p className="text-xs text-gray-500">Net</p>
                                </div>
                              </div>
                              <p className="text-lg font-semibold text-gray-900">{formatCurrency(Math.abs(sums.net))}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2">
                <FinanceCalendar
                  events={filtered.map((t) => ({
                    date: t.date,
                    label: t.category || t.type,
                    amount: t.amount,
                    type: t.type,
                    branch: t.branch,
                  }))}
                />
              </div>
              <div className="bg-white rounded-lg shadow p-0">
                <div className="border-b px-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Advisory</h2>
                    <div className="flex gap-2">
                      {[
                        { key: "risk", label: "Branch Risk Alerts" },
                        { key: "releases", label: "Upcoming Releases" },
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setAdvisoryTab(t.key)}
                          className={`px-3 py-2 text-sm rounded-t-md ${advisoryTab === t.key ? "bg-white border-x border-t border-gray-200 text-gray-900" : "text-gray-600"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {advisoryTab === "risk" ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Flags branches at risk due to low tithes vs expenses</p>
                      <ul className="divide-y divide-gray-100">
                        {BRANCHES.map((b) => {
                          const rows = filterTransactions(filtered, { branch: b });
                          const sums = aggregate(rows);
                          const tithesAmt = rows.filter((r) => r.category === "Tithe").reduce((a, x) => a + (Number(x.amount) || 0), 0);
                          const risk = sums.net <= 0 && tithesAmt < sums.expenses * 0.8;
                          return (
                            <li key={b} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{b}</p>
                                <p className="text-xs text-gray-500">Tithes {formatCurrency(tithesAmt)} · Expenses {formatCurrency(sums.expenses)} · Net {formatCurrency(Math.abs(sums.net))}</p>
                              </div>
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${risk ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {risk ? "Short Risk" : "Stable"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">Advisory only; investigate donor engagement and outreach costs.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Based on filtered data</p>
                      <ul className="divide-y divide-gray-100">
                        {filtered
                          .filter((t) => t.type === "Expense")
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .slice(0, 10)
                          .map((t) => (
                            <li key={`u-${t.id}`} className="py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{t.category} · {t.branch}</p>
                                <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                              </div>
                              <span className="text-sm font-semibold text-rose-700">-{formatCurrency(t.amount)}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h4 className="text-sm font-medium text-gray-500">{label}</h4>
      </div>
      <p className="text-4xl font-bold text-gray-800">₱{value.toLocaleString()}</p>
    </div>
  );
}

// Removed BarRow in favor of chart for alignment consistency
