import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { Sparkles, Repeat2, Bell, Users, Download, Filter } from "lucide-react";
import DateRangePicker from "../../components/DateRangePicker";
import { exportToPDF } from "../../lib/financeUtils";

export default function FinanceTasks() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const assigned = [
    { service: "Dec 15, 2025 - Sunday AM", roles: "Offering Count · Audit Support", eligibility: "Meets attendance (6 months)" },
    { service: "Dec 18, 2025 - Midweek", roles: "Disbursement Prep", eligibility: "Meets attendance (6 months)" },
    { service: "Dec 22, 2025 - Sunday PM", roles: "Cashiering · Reporting", eligibility: "Flag: attendance check" },
  ];

  const recommendations = [
    { name: "Anna Reyes", availability: "Available", note: "Completed last 3 services" },
    { name: "Marco Lim", availability: "Available", note: "Finance certified" },
    { name: "Elijah Cruz", availability: "Limited", note: "Traveling next week" },
  ];

  const history = [
    { date: "Dec 8, 2025", role: "Offering Count", compliance: "Present" },
    { date: "Dec 1, 2025", role: "Audit Support", compliance: "Present" },
    { date: "Nov 24, 2025", role: "Cashiering", compliance: "Missed" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Assignment Control</h1>
              <p className="text-gray-600 mt-2">Coordinate finance tasks (offering count, audit, disbursement).</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportToPDF({
                  title: "Finance – Task Assignments",
                  columns: ["Service", "Roles", "Eligibility"],
                  rows: assigned.map((a) => [a.service, a.roles, a.eligibility]),
                })}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition text-sm font-semibold"
              >
                <Download size={18} /> Export PDF
              </button>
              <button className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 transition text-sm font-semibold">
                <Users size={18} /> Assign Worker
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-lg shadow p-4">
            <DateRangePicker startDate={dateRange.startDate} endDate={dateRange.endDate} onChange={setDateRange} />
            <div className="ml-auto text-xs text-gray-500 inline-flex items-center gap-1"><Filter size={14} /> Filters</div>
          </div>

          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Assigned Workers per Service</h2>
              <span className="text-xs text-gray-500">Includes attendance eligibility</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Service Date</th>
                    <th className="px-4 py-3 font-semibold">Assigned Roles</th>
                    <th className="px-4 py-3 font-semibold">Attendance Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assigned.map((a, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{a.service}</td>
                      <td className="px-4 py-3 text-gray-700">{a.roles}</td>
                      <td className="px-4 py-3 text-sm text-emerald-700">{a.eligibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles size={18} />
                <h3 className="text-lg font-semibold text-gray-900">AI-Based Assignment Recommendations</h3>
              </div>
              <p className="text-sm text-gray-600">Suggestions consider availability and recent attendance.</p>
              <div className="space-y-3">
                {recommendations.map((r) => (
                  <div key={r.name} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-600">{r.note}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${r.availability === "Available" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {r.availability}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500">Recommendations are advisory; manual overrides are allowed.</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-800">
                <Repeat2 size={18} />
                <h3 className="text-lg font-semibold text-gray-900">Manual Override Controls</h3>
              </div>
              <p className="text-sm text-gray-600">Replace or reassign workers during cancellations.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Field label="Current Assignee" value="Anna Reyes" />
                <Field label="Replacement" value="Marco Lim" />
                <Field label="Service Date" value="Dec 22, 2025" />
                <Field label="Reason" value="Travel conflict" />
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition">
                  Confirm Override
                </button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Bell size={14} /> Notifications will be sent after approval.
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assignment History</h3>
              <span className="text-xs text-gray-500">Compliance reference</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Service Date</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Attendance Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((h, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{h.date}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{h.role}</td>
                      <td
                        className={`px-4 py-3 text-sm ${h.compliance === "Missed" ? "text-rose-700" : "text-emerald-700"}`}
                      >
                        {h.compliance}
                      </td>
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

function Field({ label, value }) {
  return (
    <div>
      <p className="text-gray-600 text-xs uppercase tracking-wide">{label}</p>
      <div className="mt-1 text-gray-900 font-semibold">{value}</div>
    </div>
  );
}
