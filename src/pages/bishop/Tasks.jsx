import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { ClipboardList, CheckCircle2 } from "lucide-react";

export default function BishopTasks() {
  const [assignments, setAssignments] = useState([]);
  const [policy, setPolicy] = useState({ minAttendanceForService: 70 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("assignments")
          .select("id, ministry, service, branch, worker_count, compliance_score, status");
        const normalized = (!error && data && data.length) ? data : demoAssignments();
        if (mounted) setAssignments(normalized);
      } catch (_) {
        if (mounted) setAssignments(demoAssignments());
      }
    })();
    return () => { mounted = false; };
  }, []);

  const summaries = useMemo(() => {
    const map = new Map();
    (assignments || []).forEach((a) => {
      const key = `${a.branch} · ${a.ministry}`;
      map.set(key, (map.get(key) || 0) + (Number(a.worker_count) || 0));
    });
    return Array.from(map.entries()).map(([k, v]) => ({ label: k, count: v }));
  }, [assignments]);

  async function approvePolicy() {
    // Bishop approves high-level policy; not modifying assignments directly
    await supabase.from("policies").upsert({ key: "minAttendanceForService", value: policy.minAttendanceForService });
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Assignment Control</h1>
            <p className="text-gray-600">Summaries and AI scheduling outcomes; policy-level approvals only.</p>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <ClipboardList size={18} />
                <h3 className="text-lg font-semibold text-gray-900">Ministry Staffing Summaries</h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {summaries.map((s) => (
                  <div key={s.label} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>{s.label}</span>
                    <span className="font-semibold">{s.count} workers</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Assignment Reports</h3>
              <div className="space-y-2 text-sm text-gray-700">
                {(assignments || []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span>{a.branch} · {a.ministry} · {a.service}</span>
                    <span className="font-semibold">Compliance: {a.compliance_score || 0}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Restricted: No manual assignment or worker replacement here.</p>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Policy-Level Rules</h3>
              <button className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700" onClick={approvePolicy}>
                <CheckCircle2 size={16} /> Approve Policy
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <label className="text-gray-700">Min attendance for service eligibility</label>
              <input type="number" className="border rounded px-2 py-1 w-28" value={policy.minAttendanceForService} onChange={(e) => setPolicy({ ...policy, minAttendanceForService: Number(e.target.value) })} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function demoAssignments() {
  return [
    { id: 1, ministry: "Worship", service: "Sunday AM", branch: "Sampaloc (Main Branch)", worker_count: 8, compliance_score: 92, status: "OK" },
    { id: 2, ministry: "Ushering", service: "Sunday AM", branch: "Vizal Pampanga", worker_count: 6, compliance_score: 88, status: "OK" },
    { id: 3, ministry: "Tech", service: "Friday Youth", branch: "Cavite", worker_count: 4, compliance_score: 75, status: "Attention" },
  ];
}
