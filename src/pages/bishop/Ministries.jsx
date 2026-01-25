// src/pages/bishop/Ministries.jsx
import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useBranding } from "../../context/BrandingContext";

const JoiningRequestsModal = lazy(() => import("./JoiningRequestsModal"));

export default function Ministries() {
  const { branding } = useBranding();

  // =========================
  // State
  // =========================
  const [err, setErr] = useState("");

  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("ALL");

  const [searchQuery, setSearchQuery] = useState("");

  const [ministryRows, setMinistryRows] = useState([]);
  const [selectedBM, setSelectedBM] = useState(null);
  const [members, setMembers] = useState([]);

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Joining Requests Modal
  const [joiningOpen, setJoiningOpen] = useState(false);

  const [addForm, setAddForm] = useState({
    branch_id: "",
    name: "",
    description: "",
    min_age: "",
    max_age: "",
    is_active: true,
  });

  const [editForm, setEditForm] = useState({
    branch_ministry_id: null,
    ministry_id: null,
    ministry_name: "",
    branch_name: "",
    description: "",
    min_age: "",
    max_age: "",
    is_active: true,
    lead_user_id: "",
  });

  // =========================
  // Helpers
  // =========================
  const safeName = (d) =>
    [d?.first_name, d?.middle_name, d?.last_name, d?.suffix].filter(Boolean).join(" ").trim();

  const stripEmail = (e) =>
    String(e || "").replace(/_member(?=@)/gi, "").replace(/_member$/gi, "");

  const StatusPill = ({ active }) => (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#9C0808";
  const bg1 = branding?.primary_bg || "#FFFFFF";
  const bg2 = branding?.secondary_bg || "#F9FAFB";
  const text1 = branding?.primary_text || "#111827";
  const text2 = branding?.secondary_text || "#6B7280";
  const btnText = branding?.tertiary_text || "#FFFFFF";

  // =========================
  // Fetch branches
  // =========================
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (e) {
      setErr(e?.message || "Failed to load branches.");
    }
  };

  // =========================
  // Fetch ministries
  // =========================
  const fetchMinistries = async () => {
    try {
      setErr("");

      let q = supabase.from("branch_ministries").select(`
        branch_ministry_id,
        branch_id,
        ministry_id,
        is_active,
        lead_user_id,
        ministry:ministries (
          id,
          name,
          description,
          min_age,
          max_age
        ),
        branch:branches ( name )
      `);

      if (branchFilter !== "ALL") q = q.eq("branch_id", Number(branchFilter));

      const { data, error } = await q;
      if (error) throw error;

      // member counts (Active only)
      const ids = (data || []).map((r) => r.branch_ministry_id);
      const counts = {};
      if (ids.length) {
        const { data: um, error: umErr } = await supabase
          .from("user_ministries")
          .select("branch_ministry_id, status")
          .in("branch_ministry_id", ids);

        if (!umErr) {
          (um || []).forEach((r) => {
            const active = String(r.status || "").toLowerCase() === "active";
            if (!active) return;
            counts[r.branch_ministry_id] = (counts[r.branch_ministry_id] || 0) + 1;
          });
        }
      }

      const mapped = (data || []).map((r) => ({
        ...r,
        ministry_name: r.ministry?.name || "-",
        branch_name: r.branch?.name || "-",
        member_count: counts[r.branch_ministry_id] || 0,
      }));

      setMinistryRows(mapped);

      // keep selection if still exists
      setSelectedBM((prev) => {
        if (!prev) return null;
        const still = mapped.find((x) => x.branch_ministry_id === prev.branch_ministry_id);
        return still || null;
      });
    } catch (e) {
      setErr(e?.message || "Failed to load ministries.");
      setMinistryRows([]);
      setSelectedBM(null);
      setMembers([]);
    }
  };

  // =========================
  // Fetch members
  // =========================
  const fetchMembers = async (branchMinistryId) => {
    if (!branchMinistryId) return;

    try {
      setErr("");

      const { data, error } = await supabase
        .from("user_ministries")
        .select(`
          user_ministry_id,
          role,
          status,
          is_primary,
          user:users (
            user_id,
            email,
            user_details:users_details (
              first_name,
              middle_name,
              last_name,
              suffix,
              contact_number
            )
          )
        `)
        .eq("branch_ministry_id", branchMinistryId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      setMembers(
        (data || []).map((r) => ({
          id: r.user_ministry_id,
          full_name: safeName(r.user?.user_details) || "-",
          email: stripEmail(r.user?.email) || "-",
          ministry_role: r.role || "-",
          status: r.status || "-",
          primary: !!r.is_primary,
          contact_number: r.user?.user_details?.contact_number || "-",
        }))
      );
    } catch (e) {
      setErr(e?.message || "Failed to load members.");
      setMembers([]);
    }
  };

  // =========================
  // Add ministry
  // =========================
  const addMinistry = async () => {
    try {
      setSaving(true);
      setErr("");

      if (!addForm.branch_id || !addForm.name.trim()) {
        setErr("Branch and ministry name are required.");
        return;
      }

      // find existing ministry by name (case-insensitive)
      const { data: existing, error: findErr } = await supabase
        .from("ministries")
        .select("id")
        .ilike("name", addForm.name.trim())
        .limit(1);

      if (findErr) throw findErr;

      let ministryId = existing?.[0]?.id;

      // create ministry if not exists
      if (!ministryId) {
        const { data: m, error: mErr } = await supabase
          .from("ministries")
          .insert({
            name: addForm.name.trim(),
            description: addForm.description || null,
            min_age: addForm.min_age === "" ? null : Number(addForm.min_age),
            max_age: addForm.max_age === "" ? null : Number(addForm.max_age),
          })
          .select("id")
          .single();

        if (mErr) throw mErr;
        ministryId = m.id;
      }

      // create branch_ministries
      const { error: bmErr } = await supabase.from("branch_ministries").insert({
        branch_id: Number(addForm.branch_id),
        ministry_id: Number(ministryId),
        is_active: !!addForm.is_active,
      });

      if (bmErr) throw bmErr;

      setAddOpen(false);
      setAddForm({
        branch_id: "",
        name: "",
        description: "",
        min_age: "",
        max_age: "",
        is_active: true,
      });

      await fetchMinistries();
    } catch (e) {
      setErr(e?.message || "Failed to add ministry.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Edit ministry
  // =========================
  const saveEdit = async () => {
    try {
      setSaving(true);
      setErr("");

      const { error: mErr } = await supabase
        .from("ministries")
        .update({
          description: editForm.description || null,
          min_age: editForm.min_age === "" ? null : Number(editForm.min_age),
          max_age: editForm.max_age === "" ? null : Number(editForm.max_age),
        })
        .eq("id", editForm.ministry_id);

      if (mErr) throw mErr;

      const { error: bmErr } = await supabase
        .from("branch_ministries")
        .update({
          is_active: !!editForm.is_active,
          lead_user_id: editForm.lead_user_id === "" ? null : Number(editForm.lead_user_id),
        })
        .eq("branch_ministry_id", editForm.branch_ministry_id);

      if (bmErr) throw bmErr;

      setEditOpen(false);
      await fetchMinistries();
    } catch (e) {
      setErr(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Delete (remove from branch)
  // =========================
  const removeMinistryFromBranch = async (branchMinistryId) => {
    const ok = window.confirm(
      "Remove this ministry from the branch?\n\nThis will also unassign ALL members in this branch ministry.\n\nThis cannot be undone."
    );
    if (!ok) return;

    try {
      setErr("");

      const { error } = await supabase
        .from("branch_ministries")
        .delete()
        .eq("branch_ministry_id", Number(branchMinistryId));

      if (error) throw error;

      if (selectedBM?.branch_ministry_id === branchMinistryId) {
        setSelectedBM(null);
        setMembers([]);
      }

      setEditOpen(false);
      await fetchMinistries();
    } catch (e) {
      setErr(e?.message || "Failed to remove ministry.");
    }
  };

  // =========================
  // Effects
  // =========================
  useEffect(() => {
    (async () => {
      await fetchBranches();
      await fetchMinistries();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMinistries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  useEffect(() => {
    if (selectedBM?.branch_ministry_id) fetchMembers(selectedBM.branch_ministry_id);
    else setMembers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBM?.branch_ministry_id]);

  // =========================
  // Filtering
  // =========================
  const filteredMinistries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ministryRows;

    return ministryRows.filter((r) => {
      const a = String(r.ministry_name || "").toLowerCase();
      const b = String(r.branch_name || "").toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [ministryRows, searchQuery]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;

    return members.filter((m) => {
      const a = String(m.full_name || "").toLowerCase();
      const b = String(m.email || "").toLowerCase();
      return a.includes(q) || b.includes(q);
    });
  }, [members, searchQuery]);

  // =========================
  // UI
  // =========================
  return (
    <div
      className="flex min-h-screen"
      style={{
        background: `linear-gradient(to bottom, ${bg1}, ${bg2})`,
        fontFamily: branding?.font_family || "Inter",
        fontSize: branding?.font_size || 16,
      }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {/* no full page scroll */}
        <main className="flex-1 p-6 md:p-8 overflow-hidden">
          <div className="w-full h-full space-y-6 flex flex-col min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold" style={{ color: text1 }}>
                  Church Ministries
                </h1>
                <p className="text-sm" style={{ color: text2 }}>
                  Bishop view: ministries across branches. Select a ministry to view members.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow-sm"
                  style={{ background: primary, color: btnText }}
                >
                  <Plus size={16} /> Add Ministry
                </button>

                <button
                  onClick={() => setJoiningOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow-sm"
                  style={{ background: secondary, color: btnText }}
                >
                  View Joining Request
                </button>
              </div>
            </div>

            {err && (
              <div
                className="rounded-lg p-3 text-sm"
                style={{ background: "#fff1f2", border: `1px solid ${secondary}`, color: secondary }}
              >
                {err}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search ministry, branch, member name, or email"
                    className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={String(b.branch_id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Ministries table */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col min-h-0">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Ministries</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Click a row to load members. Use Action column to edit.
                  </p>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  {filteredMinistries.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No ministries found.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Branch</th>
                          <th className="px-4 py-3 text-left font-semibold">Ministry</th>
                          <th className="px-4 py-3 text-center font-semibold">Members</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMinistries.map((r) => {
                          const selected = selectedBM?.branch_ministry_id === r.branch_ministry_id;
                          return (
                            <tr
                              key={r.branch_ministry_id}
                              onClick={() => setSelectedBM(r)}
                              className={`cursor-pointer ${selected ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                            >
                              <td className="px-4 py-4 align-top">
                                <div className="font-semibold text-gray-900">{r.branch_name}</div>
                                <div className="text-[11px] text-gray-500 mt-1">Branch ID: {r.branch_id}</div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="font-semibold text-gray-900">{r.ministry_name}</div>
                                {r?.ministry?.description ? (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {r.ministry.description}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 mt-1">No description</div>
                                )}
                              </td>

                              <td className="px-4 py-4 text-center align-top">
                                <span className="inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                  {r.member_count}
                                </span>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <StatusPill active={!!r.is_active} />
                              </td>

                              <td className="px-4 py-4 text-right align-top">
                                <button
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditForm({
                                      branch_ministry_id: r.branch_ministry_id,
                                      ministry_id: r.ministry_id,
                                      ministry_name: r.ministry_name,
                                      branch_name: r.branch_name,
                                      description: r.ministry?.description || "",
                                      min_age: r.ministry?.min_age ?? "",
                                      max_age: r.ministry?.max_age ?? "",
                                      is_active: !!r.is_active,
                                      lead_user_id: r.lead_user_id ?? "",
                                    });
                                    setEditOpen(true);
                                  }}
                                >
                                  <Pencil size={14} /> Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="px-5 py-3 border-t text-xs text-gray-500">
                  Max-height applied via panel scroll (not page scroll).
                </div>
              </div>

              {/* Members table */}
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col min-h-0">
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900">Members</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedBM
                        ? `${selectedBM.branch_name} • ${selectedBM.ministry_name}`
                        : "Select a ministry from the left."}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedBM ? `${filteredMembers.length} member(s)` : ""}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  {!selectedBM ? (
                    <div className="p-10 text-center text-gray-500">Select a ministry to display members.</div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No members assigned</div>
                  ) : (
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Member</th>
                          <th className="px-4 py-3 font-semibold">Email</th>
                          <th className="px-4 py-3 font-semibold">Contact</th>
                          <th className="px-4 py-3 font-semibold">Ministry Role</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Primary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMembers.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-gray-900">{m.full_name}</div>
                            </td>
                            <td className="px-4 py-4">{m.email}</td>
                            <td className="px-4 py-4">{m.contact_number}</td>
                            <td className="px-4 py-4">{m.ministry_role}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                  String(m.status || "").toLowerCase() === "active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {m.primary ? (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {selectedBM && (
                  <div className="px-5 py-3 border-t text-xs text-gray-500">
                    Data source: <b>user_ministries</b> (joined to users_details)
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ADD MODAL */}
      {addOpen && (
        <Modal title="Add Ministry" onClose={() => setAddOpen(false)}>
          <MinistryAddForm
            form={addForm}
            setForm={setAddForm}
            branches={branches}
            saving={saving}
            onSave={addMinistry}
          />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editOpen && (
        <Modal title="Edit Ministry" onClose={() => setEditOpen(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
              <div className="font-semibold text-gray-900">{editForm.ministry_name}</div>
              <div className="text-xs text-gray-600">{editForm.branch_name}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                className="w-full border rounded-xl p-3 text-sm"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Min Age</label>
                <input
                  type="number"
                  className="w-full border rounded-xl p-3 text-sm"
                  value={editForm.min_age}
                  onChange={(e) => setEditForm((p) => ({ ...p, min_age: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Max Age</label>
                <input
                  type="number"
                  className="w-full border rounded-xl p-3 text-sm"
                  value={editForm.max_age}
                  onChange={(e) => setEditForm((p) => ({ ...p, max_age: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editForm.is_active}
                onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              Active in this branch
            </label>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => removeMinistryFromBranch(editForm.branch_ministry_id)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <Trash2 size={16} /> Delete
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center justify-center px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: primary }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* JOINING REQUESTS MODAL */}
      <Suspense fallback={null}>
        {joiningOpen && (
          <JoiningRequestsModal open={joiningOpen} onClose={() => setJoiningOpen(false)} />
        )}
      </Suspense>
    </div>
  );
}

/* =========================
   Components
========================= */

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function MinistryAddForm({ form, setForm, branches, onSave, saving }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Branch *</label>
        <select
          className="w-full border rounded-xl p-3 text-sm bg-white"
          value={form.branch_id}
          onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
        >
          <option value="">Select branch</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={String(b.branch_id)}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Ministry Name *</label>
        <input
          className="w-full border rounded-xl p-3 text-sm"
          placeholder="e.g., Youth Movers"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
        <textarea
          className="w-full border rounded-xl p-3 text-sm"
          rows={3}
          placeholder="Optional description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Min Age</label>
          <input
            type="number"
            className="w-full border rounded-xl p-3 text-sm"
            value={form.min_age}
            onChange={(e) => setForm((p) => ({ ...p, min_age: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Max Age</label>
          <input
            type="number"
            className="w-full border rounded-xl p-3 text-sm"
            value={form.max_age}
            onChange={(e) => setForm((p) => ({ ...p, max_age: e.target.value }))}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!form.is_active}
          onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
        />
        Active in this branch
      </label>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Ministry"}
      </button>
    </div>
  );
}
