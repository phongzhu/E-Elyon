// src/pages/Bishop/Ministries.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import { Search } from "lucide-react";

export default function Ministries() {
  // =========================
  // State
  // =========================
  const [err, setErr] = useState("");

  const [loadingMinistries, setLoadingMinistries] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("ALL"); // ALL | branch_id

  const [searchQuery, setSearchQuery] = useState("");

  // Ministries list (branch_ministries joined to branches + ministries)
  const [ministryRows, setMinistryRows] = useState([]);

  // Selected branch_ministry row (membership is tied to branch_ministries)
  const [selectedBranchMinistry, setSelectedBranchMinistry] = useState(null);

  // Members of selected ministry
  const [ministryMembers, setMinistryMembers] = useState([]);

  // =========================
  // Helpers
  // =========================
  const safeFullName = (d) =>
    [d?.first_name, d?.middle_name, d?.last_name, d?.suffix]
      .filter(Boolean)
      .join(" ")
      .trim();

  const stripMemberSuffixEmail = (email = "") => {
    if (!email) return "";
    return String(email)
      .replace(/_member(?=@)/gi, "")
      .replace(/_member$/gi, "")
      .trim();
  };

  const fmtDateOnly = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  };

  // =========================
  // Fetchers
  // =========================
  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      setErr("");

      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load branches.");
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchMinistriesAcrossBranches = async (branchIdOrAll) => {
    try {
      setLoadingMinistries(true);
      setErr("");

      let q = supabase.from("branch_ministries").select(
        `
          branch_ministry_id,
          branch_id,
          ministry_id,
          is_active,
          lead_user_id,
          created_at,
          updated_at,
          ministry:ministries (
            id,
            name,
            description,
            min_age,
            max_age
          ),
          branch:branches (
            branch_id,
            name
          )
        `
      );

      if (branchIdOrAll !== "ALL") {
        q = q.eq("branch_id", Number(branchIdOrAll));
      }

      const { data: bmRows, error: bmErr } = await q;
      if (bmErr) throw bmErr;

      const rows = bmRows || [];
      const ids = rows.map((r) => r.branch_ministry_id);

      if (ids.length === 0) {
        setMinistryRows([]);
        setSelectedBranchMinistry(null);
        setMinistryMembers([]);
        return;
      }

      // membership counts
      const { data: umRows, error: umErr } = await supabase
        .from("user_ministries")
        .select("branch_ministry_id, status")
        .in("branch_ministry_id", ids);

      if (umErr) throw umErr;

      const counts = new Map(); // branch_ministry_id -> count (Active only)
      (umRows || []).forEach((r) => {
        const isActive = String(r.status || "").toLowerCase() === "active";
        if (!isActive) return;
        const k = r.branch_ministry_id;
        counts.set(k, (counts.get(k) || 0) + 1);
      });

      const mapped = rows
        .map((r) => ({
          ...r,
          ministry_name: r?.ministry?.name || "-",
          branch_name: r?.branch?.name || "-",
          member_count: counts.get(r.branch_ministry_id) || 0,
        }))
        .sort((a, b) => {
          const bn = String(a.branch_name).localeCompare(String(b.branch_name));
          if (bn !== 0) return bn;
          return String(a.ministry_name).localeCompare(String(b.ministry_name));
        });

      setMinistryRows(mapped);

      // keep selection if still exists after filtering
      setSelectedBranchMinistry((prev) => {
        if (!prev) return null;
        const still = mapped.find(
          (x) => x.branch_ministry_id === prev.branch_ministry_id
        );
        return still || null;
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load ministries.");
      setMinistryRows([]);
      setSelectedBranchMinistry(null);
      setMinistryMembers([]);
    } finally {
      setLoadingMinistries(false);
    }
  };

  const fetchMembersForBranchMinistry = async (branchMinistryId) => {
    if (!branchMinistryId) return;

    try {
      setLoadingMembers(true);
      setErr("");

      const { data, error } = await supabase
        .from("user_ministries")
        .select(
          `
          user_ministry_id,
          role,
          status,
          assigned_at,
          unassigned_at,
          is_primary,
          user:users (
            user_id,
            email,
            role,
            is_active,
            user_details_id,
            user_details:users_details (
              user_details_id,
              first_name,
              middle_name,
              last_name,
              suffix,
              contact_number,
              branch_id,
              branch:branches ( branch_id, name )
            )
          )
        `
        )
        .eq("branch_ministry_id", Number(branchMinistryId))
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((r) => {
        const u = r.user || null;
        const d = u?.user_details || null;

        return {
          user_ministry_id: r.user_ministry_id,
          ministry_role: r.role || "-",
          status: r.status || "-",
          assigned_at: r.assigned_at || null,
          is_primary: !!r.is_primary,

          user_id: u?.user_id || null,
          email: stripMemberSuffixEmail(u?.email || ""),
          account_role: u?.role || "-",
          account_active: !!u?.is_active,

          full_name: safeFullName(d) || "-",
          contact_number: d?.contact_number || "-",
          branch_name: d?.branch?.name || "-",
        };
      });

      setMinistryMembers(mapped);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load ministry members.");
      setMinistryMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // =========================
  // Init
  // =========================
  useEffect(() => {
    let mounted = true;

    (async () => {
      await fetchBranches();
      if (!mounted) return;
      await fetchMinistriesAcrossBranches("ALL");
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMinistriesAcrossBranches(branchFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  useEffect(() => {
    if (!selectedBranchMinistry?.branch_ministry_id) {
      setMinistryMembers([]);
      return;
    }
    fetchMembersForBranchMinistry(selectedBranchMinistry.branch_ministry_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchMinistry?.branch_ministry_id]);

  // =========================
  // Filtering
  // =========================
  const filteredMinistryRows = useMemo(() => {
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
    if (!q) return ministryMembers;

    return ministryMembers.filter((m) => {
      const name = String(m.full_name || "").toLowerCase();
      const email = String(m.email || "").toLowerCase();
      const branch = String(m.branch_name || "").toLowerCase();
      return name.includes(q) || email.includes(q) || branch.includes(q);
    });
  }, [ministryMembers, searchQuery]);

  // =========================
  // UI
  // =========================
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="w-full space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Church Ministries
              </h1>
              <p className="text-sm text-gray-600">
                Bishop view: ministries across all branches. Filter by branch,
                then select a ministry to see members.
              </p>
            </div>

            {err && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
                {err}
              </div>
            )}

            {/* Search + Branch Filter */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ministry, branch, member name, or email"
                  className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xs font-semibold text-gray-500">
                  Branch Filter:
                </div>
                <select
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  disabled={loadingBranches}
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={String(b.branch_id)}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="ml-auto text-xs text-gray-500">
                  {loadingMinistries
                    ? "Loading ministries..."
                    : `${filteredMinistryRows.length} ministry record(s)`}
                </div>
              </div>
            </div>

            {/* Left Ministries, Right Members */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Ministries list */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">
                    Ministries (by Branch)
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Click one to view included members.
                  </p>
                </div>

                <div className="max-h-[560px] overflow-auto">
                  {loadingMinistries ? (
                    <div className="p-6 text-center text-gray-600">
                      Loading...
                    </div>
                  ) : filteredMinistryRows.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No ministries found.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left">Branch</th>
                          <th className="px-4 py-3 text-left">Ministry</th>
                          <th className="px-4 py-3 text-center">Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMinistryRows.map((r) => {
                          const selected =
                            selectedBranchMinistry?.branch_ministry_id ===
                            r.branch_ministry_id;

                          return (
                            <tr
                              key={r.branch_ministry_id}
                              className={`border-t cursor-pointer ${
                                selected ? "bg-emerald-50" : "hover:bg-gray-50"
                              }`}
                              onClick={() => setSelectedBranchMinistry(r)}
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">
                                  {r.branch_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {r.branch_id}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">
                                  {r.ministry_name}
                                </div>
                                {r?.ministry?.description ? (
                                  <div className="text-xs text-gray-500 line-clamp-2">
                                    {r.ministry.description}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No description
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                  {r.member_count}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Members list */}
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      Members in Ministry
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedBranchMinistry
                        ? `${selectedBranchMinistry.branch_name} • ${selectedBranchMinistry.ministry_name}`
                        : "Select a ministry on the left."}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedBranchMinistry
                      ? loadingMembers
                        ? "Loading..."
                        : `${filteredMembers.length} member(s)`
                      : ""}
                  </div>
                </div>

                {!selectedBranchMinistry ? (
                  <div className="p-10 text-center text-gray-500">
                    Select a ministry to display members.
                  </div>
                ) : loadingMembers ? (
                  <div className="p-10 text-center text-gray-600">
                    Loading members…
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-10 text-center text-gray-500">
                    No members assigned to this ministry yet.
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Member</th>
                          <th className="px-4 py-3 font-semibold">Email</th>
                          <th className="px-4 py-3 font-semibold">
                            Ministry Role
                          </th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Assigned</th>
                          <th className="px-4 py-3 font-semibold">Primary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMembers.map((m) => (
                          <tr
                            key={m.user_ministry_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">
                                {m.full_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {m.branch_name}
                              </div>
                            </td>
                            <td className="px-4 py-3">{m.email || "-"}</td>
                            <td className="px-4 py-3">
                              {m.ministry_role || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                  String(m.status || "").toLowerCase() ===
                                  "active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {fmtDateOnly(m.assigned_at)}
                            </td>
                            <td className="px-4 py-3">
                              {m.is_primary ? (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedBranchMinistry && (
                  <div className="px-5 py-3 border-t text-xs text-gray-500">
                    Data source: <b>user_ministries</b> joined through{" "}
                    <b>branch_ministries</b>.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
