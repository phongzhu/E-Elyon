import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { CheckCircle2, UserCheck, CalendarClock, Filter, Download } from "lucide-react";

function demoRequests() {
  return [
    { id: 1, date: new Date(2025, 11, 12), memberName: "Juan D.", branch: "Sampaloc (Main Branch)", topic: "Marriage counseling", status: "Pending", assignedPastorId: null },
    { id: 2, date: new Date(2025, 11, 11), memberName: "Maria P.", branch: "Vizal Pampanga", topic: "Grief support", status: "Pending", assignedPastorId: null },
    { id: 3, date: new Date(2025, 11, 10), memberName: "Rafael S.", branch: "Bustos", topic: "Career guidance", status: "Assigned", assignedPastorId: 101 },
  ];
}

function demoPastors() {
  return [
    { id: 101, name: "Ps. Daniel Cruz", branch: "Sampaloc (Main Branch)", available: true },
    { id: 102, name: "Ps. Lea Santos", branch: "Vizal Pampanga", available: true },
    { id: 103, name: "Ps. Mark Reyes", branch: "Bustos", available: false },
  ];
}

export default function BishopCounseling() {
  const [requests, setRequests] = useState([]);
  const [pastors, setPastors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data: reqData, error: reqErr } = await supabase
          .from("counseling_requests")
          .select("id, created_at, member_name, branch, topic, status, assigned_pastor_id")
          .order("created_at", { ascending: false });

        const { data: pastorData, error: pastorErr } = await supabase
          .from("users")
          .select("id, full_name, branch, role, is_available")
          .in("role", ["Pastor", "Leader"]);

        const normalizedReq = (!reqErr && reqData && reqData.length)
          ? reqData.map((r) => ({
              id: r.id,
              date: r.created_at || new Date(),
              memberName: r.member_name || "-",
              branch: r.branch || "-",
              topic: r.topic || "-",
              status: r.status || "Pending",
              assignedPastorId: r.assigned_pastor_id || null,
            }))
          : demoRequests();

        const normalizedPastors = (!pastorErr && pastorData && pastorData.length)
          ? pastorData.map((p) => ({ id: p.id, name: p.full_name || "-", branch: p.branch || "-", available: !!p.is_available }))
          : demoPastors();

        if (mounted) {
          setRequests(normalizedReq);
          setPastors(normalizedPastors);
        }
      } catch (_) {
        if (mounted) {
          setRequests(demoRequests());
          setPastors(demoPastors());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => (statusFilter ? r.status === statusFilter : true));
  }, [requests, statusFilter]);

  async function assignPastor(reqId, pastorId) {
    setSaving(true);
    try {
      setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, assignedPastorId: pastorId, status: "Assigned" } : r));
      const { error } = await supabase
        .from("counseling_requests")
        .update({ assigned_pastor_id: pastorId, status: "Assigned" })
        .eq("id", reqId);
      if (error) console.warn("Supabase assignPastor error:", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRequest(reqId) {
    setSaving(true);
    try {
      setRequests((prev) => prev.map((r) => r.id === reqId ? { ...r, status: "Confirmed" } : r));
      const { error } = await supabase
        .from("counseling_requests")
        .update({ status: "Confirmed" })
        .eq("id", reqId);
      if (error) console.warn("Supabase confirmRequest error:", error.message);
    } finally {
      setSaving(false);
    }
  }

  function pastorNameById(id) {
    const p = pastors.find((x) => x.id === id);
    return p ? p.name : "—";
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Counseling Requests</h1>
              <p className="text-gray-600">View member requests, assign an available pastor, and confirm appointments.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 inline-flex items-center gap-1"><Filter size={14} /> Filters</div>
              <select className="border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 font-semibold">Topic</th>
                    <th className="px-4 py-3 font-semibold">Assigned Pastor</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-gray-700">{r.memberName}</td>
                      <td className="px-4 py-3 text-gray-700">{r.branch}</td>
                      <td className="px-4 py-3 text-gray-700">{r.topic}</td>
                      <td className="px-4 py-3 text-gray-700">{pastorNameById(r.assignedPastorId)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            className="border rounded-md px-2 py-1"
                            value={r.assignedPastorId || ""}
                            onChange={(e) => assignPastor(r.id, Number(e.target.value))}
                          >
                            <option value="">Assign Pastor</option>
                            {pastors.filter((p) => p.available).map((p) => (
                              <option key={p.id} value={p.id}>{p.name} · {p.branch}</option>
                            ))}
                          </select>
                          <button
                            disabled={!r.assignedPastorId || saving}
                            onClick={() => confirmRequest(r.id)}
                            className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} /> Confirm
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={7}>No requests found for the selected filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">Privacy note: Bishop sees request summaries only. Private messages remain hidden unless explicitly authorized.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
