import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { ShieldCheck, Ban, ScrollText, Eye, CheckCircle2, Info } from "lucide-react";
import { BRANCHES } from "../../lib/financeUtils";

export default function BishopUserRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);
  const [modal, setModal] = useState({ open: false, userId: null, targetRole: null, action: null, reason: "" });
  const [bulkSelection, setBulkSelection] = useState([]);
  const [pastorTab, setPastorTab] = useState("assign");
  const [pastorAssignments, setPastorAssignments] = useState([]);
  const [mainTab, setMainTab] = useState("assignments");
  const [members, setMembers] = useState([]);
  const [memberFilter, setMemberFilter] = useState({ branch: "", status: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, branch, role, status, approval_status, last_modified, branch_risk");
        const normalized = (!error && data && data.length) ? data : demoUsers();
        if (mounted) setUsers(normalized);
        const { data: logData } = await supabase
          .from("audit_logs")
          .select("id, ts, action, previous_role, new_role, approved_by, reason")
          .order("ts", { ascending: false });
        if (mounted) setLogs(logData && logData.length ? logData : demoLogs());

        const { data: pastorData } = await supabase
          .from("pastor_assignments")
          .select("id, pastor_id, branch")
          .order("id", { ascending: true });
        if (mounted) setPastorAssignments(pastorData && pastorData.length ? pastorData : demoPastorAssignments());

        const { data: memberData } = await supabase
          .from("members")
          .select("id, name, branch, status, avatar")
          .order("name", { ascending: true });
        if (mounted) setMembers(memberData && memberData.length ? memberData : demoMembers());
      } catch (_) {
        if (mounted) {
          setUsers(demoUsers());
          setLogs(demoLogs());
          setPastorAssignments(demoPastorAssignments());
          setMembers(demoMembers());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => users.filter((u) => (filterRole ? u.role === filterRole : true) && (filterStatus ? (u.approval_status || "Pending") === filterStatus || (u.status === filterStatus) : true)), [users, filterRole, filterStatus]);

  function openModal(userId, action, targetRole = null) {
    setModal({ open: true, userId, action, targetRole, reason: "" });
  }

  async function approveHighRole(userId, role, reason) {
    setSaving(true);
    const ts = new Date().toISOString();
    try {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role, approval_status: "Approved", last_modified: ts } : u));
      await supabase.from("users").update({ role, approval_status: "Approved", last_modified: ts }).eq("id", userId);
      await supabase.from("audit_logs").insert({ ts, action: `Role changed to ${role}`, user_id: userId, previous_role: getUser(userId)?.role, new_role: role, approved_by: "Bishop", reason });
    } finally {
      setSaving(false);
      setModal({ open: false, userId: null, targetRole: null, action: null, reason: "" });
    }
  }

  async function suspendUser(userId, reason) {
    setSaving(true);
    const ts = new Date().toISOString();
    try {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "Suspended", approval_status: "Approved", last_modified: ts } : u));
      await supabase.from("users").update({ status: "Suspended", approval_status: "Approved", last_modified: ts }).eq("id", userId);
      await supabase.from("audit_logs").insert({ ts, action: `Account suspended`, user_id: userId, approved_by: "Bishop", reason });
    } finally {
      setSaving(false);
      setModal({ open: false, userId: null, targetRole: null, action: null, reason: "" });
    }
  }

  async function reinstateUser(userId, reason) {
    setSaving(true);
    const ts = new Date().toISOString();
    try {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: "Active", approval_status: "Approved", last_modified: ts } : u));
      await supabase.from("users").update({ status: "Active", approval_status: "Approved", last_modified: ts }).eq("id", userId);
      await supabase.from("audit_logs").insert({ ts, action: `Account reinstated`, user_id: userId, approved_by: "Bishop", reason });
    } finally {
      setSaving(false);
      setModal({ open: false, userId: null, targetRole: null, action: null, reason: "" });
    }
  }

  function getUser(id) {
    return users.find((u) => u.id === id);
  }

  function branchRiskTag(risk) {
    if (risk === "High") return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">🔴 High</span>;
    if (risk === "Medium") return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">🟡 High Turnover</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">🟢 Normal</span>;
  }

  function toggleBulk(id) {
    setBulkSelection((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function bulkApprove(reason) {
    for (const id of bulkSelection) {
      const u = getUser(id);
      if (!u) continue;
      await approveHighRole(id, u.role, reason || "Bulk approval");
    }
    setBulkSelection([]);
  }

  async function bulkReject(reason) {
    for (const id of bulkSelection) {
      const ts = new Date().toISOString();
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, approval_status: "Rejected", last_modified: ts } : u));
      await supabase.from("users").update({ approval_status: "Rejected", last_modified: ts }).eq("id", id);
      await supabase.from("audit_logs").insert({ ts, action: `Role request rejected`, user_id: id, approved_by: "Bishop", reason: reason || "Bulk rejection" });
    }
    setBulkSelection([]);
    setModal({ open: false, userId: null, targetRole: null, action: null, reason: "" });
  }

  async function assignPastorToBranch(pastorId, branch) {
    const existing = pastorAssignments.find((p) => p.pastor_id === pastorId);
    const record = { pastor_id: pastorId, branch };
    setPastorAssignments((prev) => {
      if (existing) return prev.map((p) => p.pastor_id === pastorId ? { ...p, branch } : p);
      return [...prev, { id: Date.now(), ...record }];
    });
    try {
      if (existing) {
        await supabase.from("pastor_assignments").update({ branch }).eq("pastor_id", pastorId);
      } else {
        await supabase.from("pastor_assignments").insert(record);
      }
    } catch (err) {
      console.warn("assignPastorToBranch error", err?.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User & Role Management</h1>
              <p className="text-gray-600 text-sm">Manage assignments, roles, and membership across the organization.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setMainTab("assignments")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  mainTab === "assignments" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Assignments
              </button>
              <button
                onClick={() => setMainTab("pastors")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  mainTab === "pastors" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pastor Assignments
              </button>
              <button
                onClick={() => setMainTab("members")}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  mainTab === "members" ? "border-b-2 border-emerald-600 text-emerald-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Members
              </button>
            </div>

            <div className="p-6 space-y-6">
              {mainTab === "assignments" && (
                <>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-gray-600">RBAC enforced. Certain role changes require Bishop approval. All changes are audit-logged.</p>
                    <div className="flex items-center gap-2">
                      <select className="border rounded-md px-3 py-2 text-sm" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Finance Head">Finance Head</option>
                        <option value="Pastor">Pastor</option>
                        <option value="Worker">Worker</option>
                      </select>
                      <select className="border rounded-md px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="Pending">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                      <button onClick={() => setShowLogs(true)} className="inline-flex items-center gap-1 border border-gray-200 px-3 py-2 rounded-md text-sm bg-white shadow-sm hover:bg-gray-50">
                        <ScrollText size={16} /> View Audit Log
                      </button>
                    </div>
                  </div>

          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between text-sm text-gray-700 border border-gray-100">
            <div className="flex items-center gap-2"><Info size={16} className="text-amber-600" /> Role change thresholds are enforced (Worker→Pastor, Pastor→Admin, Admin→Finance Head require Bishop approval).</div>
            <div className="flex items-center gap-3">
              {loading && <span className="text-gray-500">Loading…</span>}
              <button disabled={bulkSelection.length === 0} onClick={() => setModal({ open: true, action: "bulk-approve", userId: null, targetRole: null, reason: "" })} className="bg-emerald-600 text-white px-3 py-2 rounded-md disabled:opacity-50 shadow-sm hover:bg-emerald-700">Bulk Approve</button>
              <button disabled={bulkSelection.length === 0} onClick={() => setModal({ open: true, action: "bulk-reject", userId: null, targetRole: null, reason: "" })} className="bg-rose-600 text-white px-3 py-2 rounded-md disabled:opacity-50 shadow-sm hover:bg-rose-700">Bulk Reject</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      <input type="checkbox" onChange={(e) => setBulkSelection(e.target.checked ? filtered.map((u) => u.id) : [])} checked={bulkSelection.length === filtered.length && filtered.length > 0} />
                    </th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Branch</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Approval Status</th>
                    <th className="px-4 py-3 font-semibold">Last Modified</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={bulkSelection.includes(u.id)} onChange={() => toggleBulk(u.id)} />
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{u.full_name || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{u.email || "-"}</td>
                      <td className="px-4 py-3 text-gray-700 flex items-center gap-2">{u.branch || "-"} {branchRiskTag(u.branch_risk)}</td>
                      <td className="px-4 py-3 text-gray-700">{u.role || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{u.status || "Active"}</td>
                      <td className="px-4 py-3 text-gray-700">{u.approval_status || "Pending"}</td>
                      <td className="px-4 py-3 text-gray-700">{u.last_modified ? new Date(u.last_modified).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            className="inline-flex items-center gap-1 border border-gray-200 px-3 py-1 rounded-md hover:bg-gray-50"
                            onClick={() => setDrawerUser(u)}
                          >
                            <Eye size={16} /> View Details
                          </button>
                          {u.role !== "Admin" && (
                            <button
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                              onClick={() => openModal(u.id, "approve", "Admin")}
                              disabled={saving}
                            >
                              <ShieldCheck size={16} /> Approve Admin
                            </button>
                          )}
                          {u.role === "Admin" && (
                            <button
                              className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                              onClick={() => openModal(u.id, "approve", "Finance Head")}
                              disabled={saving}
                            >
                              <ShieldCheck size={16} /> Approve Finance Head
                            </button>
                          )}
                          {u.status === "Suspended" ? (
                            <button
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                              onClick={() => openModal(u.id, "reinstate")}
                              disabled={saving}
                            >
                              <CheckCircle2 size={16} /> Reinstate
                            </button>
                          ) : (
                            <button
                              className="inline-flex items-center gap-1 bg-rose-600 text-white px-3 py-1 rounded-md hover:bg-rose-700 disabled:opacity-50"
                              onClick={() => openModal(u.id, "suspend")}
                              disabled={saving}
                            >
                              <Ban size={16} /> Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-xs text-gray-500" colSpan={6}>No users match the filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-4">Restrictions: Cannot edit personal data or bypass audit logs.</p>
          </div>

                </>
              )}

              {mainTab === "pastors" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Pastor Branch Assignments</h3>
                      <p className="text-sm text-gray-600">Assign pastors to lead and guide specific branches (read-only on personal data).</p>
                    </div>
                    <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
                      <button className={`px-3 py-2 ${pastorTab === "assign" ? "bg-emerald-50 text-emerald-700" : "bg-white text-gray-700"}`} onClick={() => setPastorTab("assign")}>Assign</button>
                      <button className={`px-3 py-2 ${pastorTab === "view" ? "bg-emerald-50 text-emerald-700" : "bg-white text-gray-700"}`} onClick={() => setPastorTab("view")}>Current Assignments</button>
                    </div>
                  </div>

            {pastorTab === "assign" && (
              <div className="space-y-2 text-sm text-gray-700">
                {users.filter((u) => u.role === "Pastor").map((p) => (
                  <div key={`pastor-${p.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-semibold text-gray-900">{p.full_name}</p>
                      <p className="text-xs text-gray-500">Current: {pastorAssignments.find((x) => x.pastor_id === p.id)?.branch || "Unassigned"}</p>
                    </div>
                    <select
                      className="border rounded-md px-2 py-1"
                      value={pastorAssignments.find((x) => x.pastor_id === p.id)?.branch || ""}
                      onChange={(e) => assignPastorToBranch(p.id, e.target.value)}
                    >
                      <option value="">Select branch</option>
                      {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                ))}
                {users.filter((u) => u.role === "Pastor").length === 0 && (
                  <div className="text-xs text-gray-500">No pastors available for assignment.</div>
                )}
              </div>
            )}

                  {pastorTab === "view" && (
                    <div className="space-y-2 text-sm text-gray-700">
                      {pastorAssignments.length > 0 ? pastorAssignments.map((a) => {
                        const pastor = getUser(a.pastor_id);
                        return (
                          <div key={`assign-${a.id}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                            <span>{pastor?.full_name || "Pastor"} → {a.branch}</span>
                            <span className="text-xs text-gray-500">Pastoral oversight</span>
                          </div>
                        );
                      }) : <div className="text-xs text-gray-500">No assignments yet.</div>}
                    </div>
                  )}
                </>
              )}

              {mainTab === "members" && (
                <MembersView members={members} memberFilter={memberFilter} setMemberFilter={setMemberFilter} />
              )}
            </div>
          </div>

          <AuditLogModal open={showLogs} onClose={() => setShowLogs(false)} logs={logs} />
          <ReasonModal modal={modal} setModal={setModal} onConfirm={(reason) => {
            if (modal.action === "approve") approveHighRole(modal.userId, modal.targetRole, reason);
            else if (modal.action === "suspend") suspendUser(modal.userId, reason);
            else if (modal.action === "reinstate") reinstateUser(modal.userId, reason);
            else if (modal.action === "bulk-reject") bulkReject(reason);
            else if (modal.action === "bulk-approve") bulkApprove(reason);
          }} onClose={() => setModal({ open: false, userId: null, targetRole: null, action: null, reason: "" })} />
          <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
        </main>
      </div>
    </div>
  );
}

function demoUsers() {
  return [
    { id: 1, full_name: "Alice Admin", email: "alice@example.com", branch: "Sampaloc (Main Branch)", role: "Admin", status: "Active", approval_status: "Approved", branch_risk: "Low", last_modified: new Date().toISOString() },
    { id: 2, full_name: "Frank Finance", email: "frank@example.com", branch: "Cavite", role: "Finance Head", status: "Active", approval_status: "Approved", branch_risk: "Low", last_modified: new Date().toISOString() },
    { id: 3, full_name: "Paul Pastor", email: "paul@example.com", branch: "Vizal Pampanga", role: "Pastor", status: "Active", approval_status: "Pending", branch_risk: "Medium", last_modified: new Date().toISOString() },
    { id: 4, full_name: "Wendy Worker", email: "wendy@example.com", branch: "Bustos", role: "Worker", status: "Suspended", approval_status: "Rejected", branch_risk: "High", last_modified: new Date().toISOString() },
  ];
}

function demoLogs() {
  return [
    { id: 1, ts: new Date().toISOString(), action: "Role changed to Admin", previous_role: "Pastor", new_role: "Admin", approved_by: "Bishop", reason: "Elevated for regional oversight" },
    { id: 2, ts: new Date().toISOString(), action: "Account suspended", previous_role: "Worker", new_role: "Worker", approved_by: "Bishop", reason: "Policy violation" },
  ];
}

function demoPastorAssignments() {
  return [
    { id: 1, pastor_id: 3, branch: "Vizal Pampanga" },
  ];
}

function demoMembers() {
  return [
    { id: 1, name: "Arianne Alvarez", branch: "Main", status: "Active", avatar: "https://i.pravatar.cc/150?img=1" },
    { id: 2, name: "Jose Adrian Suriaga", branch: "Bustos", status: "Active", avatar: "https://i.pravatar.cc/150?img=13" },
    { id: 3, name: "Sophia Toreffiel", branch: "Cavite", status: "Active", avatar: "https://i.pravatar.cc/150?img=5" },
    { id: 4, name: "Nicos Nicolas", branch: "San Roque", status: "Active", avatar: "https://i.pravatar.cc/150?img=8" },
    { id: 5, name: "Janna Mendez", branch: "Main", status: "Active", avatar: "https://i.pravatar.cc/150?img=9" },
    { id: 6, name: "Trishia Kyle Bagtas", branch: "Bustos", status: "Inactive", avatar: "https://i.pravatar.cc/150?img=10" },
    { id: 7, name: "JC Cruz", branch: "Cavite", status: "Inactive", avatar: "https://i.pravatar.cc/150?img=14" },
    { id: 8, name: "Jasper Bernabe", branch: "Main", status: "Inactive", avatar: "https://i.pravatar.cc/150?img=15" },
    { id: 9, name: "Vanessa Ortiz", branch: "San Roque", status: "Inactive", avatar: "https://i.pravatar.cc/150?img=20" },
    { id: 10, name: "Ava Powell", branch: "Bustos", status: "Inactive", avatar: "https://i.pravatar.cc/150?img=23" },
  ];
}

function MembersView({ members, memberFilter, setMemberFilter }) {
  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (memberFilter.branch && m.branch !== memberFilter.branch) return false;
      if (memberFilter.status && m.status !== memberFilter.status) return false;
      return true;
    });
  }, [members, memberFilter]);

  const activeMembers = filtered.filter((m) => m.status === "Active");
  const inactiveMembers = filtered.filter((m) => m.status === "Inactive");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={memberFilter.branch}
            onChange={(e) => setMemberFilter({ ...memberFilter, branch: e.target.value })}
          >
            <option value="">All Branches</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={memberFilter.status}
            onChange={(e) => setMemberFilter({ ...memberFilter, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:bg-emerald-700">
          Add Member
        </button>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Active Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {activeMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
        {activeMembers.length === 0 && <p className="text-sm text-gray-500">No active members.</p>}
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Inactive Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {inactiveMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
        {inactiveMembers.length === 0 && <p className="text-sm text-gray-500">No inactive members.</p>}
      </div>
    </div>
  );
}

function MemberCard({ member }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 text-center">
        <h4 className="text-sm font-semibold text-gray-900">{member.name}</h4>
        <button className="text-xs text-emerald-600 hover:underline mt-1">View Account</button>
      </div>
    </div>
  );
}

function ReasonModal({ modal, setModal, onClose, onConfirm }) {
  if (!modal.open) return null;
  const actionLabel = modal.action === "approve" ? `Approve ${modal.targetRole}` : modal.action === "suspend" ? "Suspend" : modal.action === "reinstate" ? "Reinstate" : modal.action === "bulk-reject" ? "Bulk Reject" : "Bulk Approve";
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{actionLabel}</h3>
        <p className="text-sm text-gray-600">Approving this role grants elevated privileges. Please provide a justification.</p>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm"
          rows={3}
          value={modal.reason}
          onChange={(e) => setModal({ ...modal, reason: e.target.value })}
          placeholder="Enter reason for approval/rejection"
        />
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 text-sm border rounded-md" onClick={onClose}>Cancel</button>
          <button className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-md" disabled={!modal.reason} onClick={() => onConfirm(modal.reason)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function AuditLogModal({ open, onClose, logs }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>Close</button>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Previous Role</th>
                <th className="px-3 py-2">New Role</th>
                <th className="px-3 py-2">Approved By</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-gray-700">{new Date(l.ts).toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-700">{l.previous_role || "-"}</td>
                  <td className="px-3 py-2 text-gray-700">{l.new_role || "-"}</td>
                  <td className="px-3 py-2 text-gray-700">{l.approved_by || "-"}</td>
                  <td className="px-3 py-2 text-gray-700">{l.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserDrawer({ user, onClose }) {
  if (!user) return null;
  return (
    <div className="fixed inset-0 bg-black/20 flex justify-end z-40">
      <div className="w-full max-w-md bg-white h-full shadow-xl p-6 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
          <button className="text-sm text-gray-500" onClick={onClose}>Close</button>
        </div>
        <Detail label="Name" value={user.full_name} />
        <Detail label="Email" value={user.email} />
        <Detail label="Branch" value={user.branch} />
        <Detail label="Role" value={user.role} />
        <Detail label="Status" value={user.status} />
        <Detail label="Approval Status" value={user.approval_status || "Pending"} />
        <Detail label="Last Modified" value={user.last_modified ? new Date(user.last_modified).toLocaleString() : "—"} />
        <div className="border-t pt-3 mt-3 text-xs text-gray-500">Read-only: account history, attendance summary, ministry involvement, permissions overview.</div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="text-sm text-gray-800">
      <p className="text-gray-500">{label}</p>
      <p className="font-semibold">{value || "-"}</p>
    </div>
  );
}
