import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { CheckCircle2, CalendarClock, Filter, Eye, X } from "lucide-react";

const safeFullName = (d) =>
  [d?.first_name, d?.middle_name, d?.last_name, d?.suffix]
    .filter(Boolean)
    .join(" ")
    .trim();

const fmtDateTime = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const toLocalInputValue = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toIsoOrNull = (datetimeLocal) => {
  if (!datetimeLocal) return null;
  const d = new Date(datetimeLocal);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export default function BishopCounseling({
  branchScopeIds = null,
  defaultBranchFilter = "ALL",
  roleLabel = "Bishop",
  allBranchesLabel = "All Branches",
} = {}) {
  const [err, setErr] = useState("");
  const [requests, setRequests] = useState([]);
  const [branchesById, setBranchesById] = useState(new Map());
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(defaultBranchFilter);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at_local: "",
    location: "",
    reschedule_reason: "",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        setErr("");

        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) {
          if (mounted) {
            setErr("You must be logged in.");
            setRequests([]);
          }
          return;
        }

        let branchQ = supabase
          .from("branches")
          .select("branch_id, name")
          .order("name", { ascending: true });

        if (Array.isArray(branchScopeIds)) {
          const ids = (branchScopeIds || [])
            .map((x) => Number(x))
            .filter((x) => !Number.isNaN(x));
          if (ids.length === 0) {
            if (mounted) {
              setBranchesById(new Map());
              setRequests([]);
            }
            return;
          }
          branchQ = branchQ.in("branch_id", ids);
        }

        const { data: branchRows, error: bErr } = await branchQ;
        if (bErr) throw bErr;
        const map = new Map();
        (branchRows || []).forEach((b) => map.set(b.branch_id, b.name));
        if (mounted) setBranchesById(map);

        let reqQ = supabase
          .from("counseling_requests")
          .select(
            `
            request_id,
            user_id,
            type,
            description,
            status,
            requested_at,
            scheduled_by,
            scheduled_at,
            location,
            rescheduled_at,
            reschedule_reason,
            updated_by,
            updated_at,
            branch_id,
            requester:users!counseling_requests_user_id_fkey(
              user_id,
              email,
              user_details_id,
              user_details:users_details(
                user_details_id,
                first_name,
                middle_name,
                last_name,
                suffix,
                contact_number,
                branch_id
              )
            )
          `
          )
          .order("requested_at", { ascending: false })
          .order("request_id", { ascending: false });

        if (Array.isArray(branchScopeIds)) {
          const ids = (branchScopeIds || [])
            .map((x) => Number(x))
            .filter((x) => !Number.isNaN(x));
          if (ids.length === 0) {
            if (mounted) setRequests([]);
            return;
          }
          reqQ = reqQ.in("branch_id", ids);
        }

        const { data: reqData, error: reqErr } = await reqQ;
        if (reqErr) throw reqErr;

        if (mounted) setRequests(reqData || []);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setErr(e?.message || "Failed to load counseling requests.");
          setRequests([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requests || [])
      .filter((r) => (statusFilter ? String(r.status || "").toLowerCase() === statusFilter.toLowerCase() : true))
      .filter((r) => (branchFilter === "ALL" ? true : Number(r.branch_id) === Number(branchFilter)))
      .filter((r) => {
        if (!q) return true;
        const d = r?.requester?.user_details || null;
        const name = safeFullName(d);
        const email = r?.requester?.email || "";
        const type = r?.type || "";
        const desc = r?.description || "";
        const branch = branchesById.get(r?.branch_id) || "";
        return [name, email, type, desc, branch].some((x) => String(x).toLowerCase().includes(q));
      });
  }, [requests, statusFilter, branchFilter, search, branchesById]);

  const upcomingScheduled = useMemo(() => {
    const now = Date.now();
    return (requests || [])
      .filter((r) => !!r?.scheduled_at)
      .map((r) => ({ ...r, _t: new Date(r.scheduled_at).getTime() }))
      .filter((r) => Number.isFinite(r._t))
      .filter((r) => r._t >= now - 1000 * 60 * 60 * 24)
      .sort((a, b) => a._t - b._t)
      .slice(0, 8);
  }, [requests]);

  const openView = (r) => {
    setSelected(r);
    setScheduleForm({
      scheduled_at_local: toLocalInputValue(r?.scheduled_at),
      location: r?.location || "",
      reschedule_reason: "",
    });
    setViewOpen(true);
  };

  const closeView = () => {
    setViewOpen(false);
    setSelected(null);
    setScheduleForm({ scheduled_at_local: "", location: "", reschedule_reason: "" });
  };

  const saveSchedule = async () => {
    if (!selected?.request_id) return;
    const bishopUserId = Number(localStorage.getItem("userId")) || null;
    if (!bishopUserId) {
      setErr("Missing current userId. Please re-login.");
      return;
    }

    const nextIso = toIsoOrNull(scheduleForm.scheduled_at_local);
    if (!nextIso) {
      setErr("Please set a valid schedule date/time.");
      return;
    }

    const prevIso = selected?.scheduled_at || null;
    const isReschedule = !!prevIso && prevIso !== nextIso;
    if (isReschedule && !scheduleForm.reschedule_reason.trim()) {
      setErr("Reschedule reason is required when changing the schedule.");
      return;
    }

    setSaving(true);
    try {
      setErr("");

      const updates = {
        scheduled_at: nextIso,
        location: scheduleForm.location?.trim() || null,
        status: "Approved",
        scheduled_by: bishopUserId,
        updated_by: bishopUserId,
        updated_at: new Date().toISOString(),
        ...(isReschedule
          ? {
              rescheduled_at: new Date().toISOString(),
              reschedule_reason: scheduleForm.reschedule_reason.trim(),
            }
          : {}),
      };

      const { error } = await supabase
        .from("counseling_requests")
        .update(updates)
        .eq("request_id", Number(selected.request_id));
      if (error) throw error;

      setRequests((prev) =>
        (prev || []).map((r) => (r.request_id === selected.request_id ? { ...r, ...updates } : r))
      );

      setSelected((prev) => (prev ? { ...prev, ...updates } : prev));
      setViewOpen(false);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Counseling Requests</h1>
              <p className="text-gray-600">{roleLabel} view: view live member requests, review details, and schedule counseling appointments.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 inline-flex items-center gap-1"><Filter size={14} /> Filters</div>
              <select className="border rounded-md px-3 py-2 text-sm" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="ALL">{allBranchesLabel}</option>
                {Array.from(branchesById.entries()).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select className="border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {err && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-sm">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Requests</h2>
                  <p className="text-sm text-gray-600">No placeholders — this list is loaded from your database.</p>
                </div>
                <input
                  className="border rounded-md px-3 py-2 text-sm w-full max-w-xs"
                  placeholder="Search name, email, purpose, branch…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Requested</th>
                      <th className="px-4 py-3 font-semibold">Member</th>
                      <th className="px-4 py-3 font-semibold">Branch</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                      <th className="px-4 py-3 font-semibold">Scheduled</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((r) => (
                      <tr key={r.request_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{fmtDateTime(r.requested_at)}</td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="font-medium">
                            {safeFullName(r?.requester?.user_details) || r?.requester?.email || `User #${r.user_id || "—"}`}
                          </div>
                          <div className="text-xs text-gray-500">{r?.requester?.email || "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{branchesById.get(r.branch_id) || "—"}</td>
                        <td className="px-4 py-3 text-gray-700">{r.type || "—"}</td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="inline-flex items-center gap-1">
                            <CalendarClock size={16} className="text-gray-400" />
                            <span>{r.scheduled_at ? fmtDateTime(r.scheduled_at) : "Not set"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{r.status || "Pending"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              disabled={saving}
                              onClick={() => openView(r)}
                              className="inline-flex items-center gap-1 bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-black disabled:opacity-50"
                            >
                              <Eye size={16} /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={7}>
                          {loading ? "Loading…" : "No requests found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">Tip: Scheduling a date/time sets the request status to “Approved”.</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h2>
                  <p className="text-sm text-gray-600">Approved counseling with a scheduled date will appear here.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {upcomingScheduled.map((r) => {
                  const d = r?.requester?.user_details || null;
                  const name = safeFullName(d) || r?.requester?.email || `User #${r.user_id || "—"}`;
                  return (
                    <button
                      key={r.request_id}
                      onClick={() => openView(r)}
                      className="w-full text-left border rounded-lg px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 truncate">{name}</div>
                        <div className="text-xs text-gray-600">{fmtDateTime(r.scheduled_at)}</div>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{r.type || "—"}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {branchesById.get(r.branch_id) || "—"}{r.location ? ` · ${r.location}` : ""}
                      </div>
                    </button>
                  );
                })}
                {upcomingScheduled.length === 0 && (
                  <div className="text-sm text-gray-500">No scheduled counseling yet.</div>
                )}
              </div>
            </div>
          </div>

        {viewOpen && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Counseling Request</div>
                  <div className="text-xs text-gray-500">Request #{selected.request_id}</div>
                </div>
                <button onClick={closeView} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Member</div>
                    <div className="font-semibold text-gray-900">
                      {safeFullName(selected?.requester?.user_details) || selected?.requester?.email || `User #${selected.user_id || "—"}`}
                    </div>
                    <div className="text-sm text-gray-700">{selected?.requester?.email || "—"}</div>
                    <div className="text-sm text-gray-700">{selected?.requester?.user_details?.contact_number || "—"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Branch</div>
                    <div className="font-semibold text-gray-900">{branchesById.get(selected.branch_id) || "—"}</div>
                    <div className="text-xs text-gray-500 mt-2">Requested</div>
                    <div className="text-sm text-gray-700">{fmtDateTime(selected.requested_at)}</div>
                    <div className="text-xs text-gray-500 mt-2">Status</div>
                    <div className="text-sm text-gray-700">{selected.status || "Pending"}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Purpose</div>
                  <div className="text-sm font-semibold text-gray-900">{selected.type || "—"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Description</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{selected.description || "—"}</div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-gray-500" />
                    <div className="font-semibold text-gray-900">Schedule</div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selected.scheduled_at ? `Currently scheduled: ${fmtDateTime(selected.scheduled_at)}` : "No schedule set yet."}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Date & time</label>
                      <input
                        type="datetime-local"
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        value={scheduleForm.scheduled_at_local}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, scheduled_at_local: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Location (optional)</label>
                      <input
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        placeholder="e.g., Bishop office / Online meeting"
                        value={scheduleForm.location}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  {selected.scheduled_at && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-600 mb-1">Reschedule reason (required if changing schedule)</label>
                      <textarea
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        rows={3}
                        value={scheduleForm.reschedule_reason}
                        onChange={(e) => setScheduleForm((p) => ({ ...p, reschedule_reason: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={closeView}
                      className="px-4 py-2 rounded-md border text-sm hover:bg-gray-50"
                      disabled={saving}
                    >
                      Close
                    </button>
                    <button
                      onClick={saveSchedule}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> {selected.scheduled_at ? "Update & Approve" : "Approve & Schedule"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
