import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { CheckCircle2, Clock, AlertTriangle, UserCheck, Download, Filter } from "lucide-react";
import DateRangePicker from "../../components/DateRangePicker";
import { exportToPDF, formatCurrency } from "../../lib/financeUtils";

export default function FinanceStipends() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [beneficiaries, setBeneficiaries] = useState([
    { name: "Ps. Daniel Cruz", role: "Pastor", amount: 12000, frequency: "Monthly", status: "Paid" },
    { name: "Sis. Maria Reyes", role: "Overseer", amount: 8500, frequency: "Monthly", status: "Pending" },
    { name: "Bro. Alvin Lim", role: "Assigned Worker", amount: 5000, frequency: "Bi-weekly", status: "Overdue" },
    { name: "Sis. Paula Santos", role: "Assigned Worker", amount: 5200, frequency: "Bi-weekly", status: "Paid" },
  ]);

  const releaseLogs = [
    { date: "Dec 12, 2025", name: "Ps. Daniel Cruz", amount: 12000, authorized: "Finance Admin" },
    { date: "Dec 11, 2025", name: "Sis. Paula Santos", amount: 5200, authorized: "Finance Coordinator" },
    { date: "Dec 10, 2025", name: "Bro. Alvin Lim", amount: 5000, authorized: "Finance Admin" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Church Stipends</h1>
              <p className="text-gray-600 mt-2">Manage beneficiaries, statuses, filters, and exports.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToPDF({
                  title: "Stipends – Beneficiaries",
                  columns: ["Name", "Role", "Amount", "Frequency", "Status"],
                  rows: beneficiaries.map((b) => [b.name, b.role, formatCurrency(b.amount), b.frequency, b.status]),
                })}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition text-sm font-semibold"
              >
                <Download size={18} /> Export PDF
              </button>
              <button className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition text-sm font-semibold">
                <UserCheck size={18} /> Add Beneficiary
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-lg shadow p-4">
            <DateRangePicker startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />
            <div className="ml-auto text-xs text-gray-500 inline-flex items-center gap-1"><Filter size={14} /> Filters</div>
          </div>

          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Stipend Beneficiary List</h2>
              <span className="text-xs text-gray-500">Pastors · Overseers · Assigned Workers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Stipend</th>
                    <th className="px-4 py-3 font-semibold">Frequency</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {beneficiaries.map((b) => (
                    <tr key={b.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{b.name}</td>
                      <td className="px-4 py-3 text-gray-700">{b.role}</td>
                      <td className="px-4 py-3 text-gray-900">₱{b.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{b.frequency}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-700 font-semibold">
                        <button
                          className="text-emerald-700 hover:underline mr-2"
                          onClick={() => setBeneficiaries((prev) => prev.map((x) => x.name === b.name ? { ...x, status: "Paid" } : x))}
                        >
                          Mark Paid
                        </button>
                        <button
                          className="text-amber-700 hover:underline"
                          onClick={() => setBeneficiaries((prev) => prev.map((x) => x.name === b.name ? { ...x, status: "Pending" } : x))}
                        >
                          Mark Pending
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Stipend Details</h3>
                <span className="text-xs text-gray-500">Sample record</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Field label="Assigned Role" value="Pastor" />
                <Field label="Stipend Amount" value="₱12,000" />
                <Field label="Payment Frequency" value="Monthly" />
                <Field label="Payment Status" value={<StatusPill status="Paid" />} />
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition">
                  Mark as Released
                </button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                  Schedule Release
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Stipend Release Logs</h3>
                <span className="text-xs text-gray-500">Recent</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date Released</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {releaseLogs.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{r.date}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{r.name}</td>
                        <td className="px-4 py-3 text-gray-900">₱{r.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">{r.authorized}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Approval Controls</h3>
              <span className="text-xs text-gray-500">Admin / Finance Coordinator validation</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <Field label="Requested By" value="Finance Coordinator" />
              <Field label="Approval Status" value={<StatusPill status="Pending" />} />
              <Field label="Notes" value="Awaiting admin validation" />
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition">
                Approve
              </button>
              <button className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition">
                Reject
              </button>
              <button className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Request Changes
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    Paid: { color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 size={14} /> },
    Pending: { color: "bg-amber-100 text-amber-800", icon: <Clock size={14} /> },
    Overdue: { color: "bg-rose-100 text-rose-800", icon: <AlertTriangle size={14} /> },
  };
  const cfg = map[status] || map.Pending;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}
      {status}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-gray-600 text-xs uppercase tracking-wide">{label}</p>
      <div className="mt-1 text-gray-900 font-semibold flex items-center gap-2">{value}</div>
    </div>
  );
}
