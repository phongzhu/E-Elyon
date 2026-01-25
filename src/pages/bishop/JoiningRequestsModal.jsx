import React, { useEffect, useMemo, useState } from "react";
import { useBranding } from "../../context/BrandingContext";
import { supabase } from "../../lib/supabaseClient";

export default function JoiningRequestsModal({ open, onClose }) {
  const { branding } = useBranding();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  // ===== Branding tokens (fallbacks) =====
  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#9C0808";
  const tertiaryText = branding?.tertiary_text || "#ffffff";

  const bg1 = branding?.primary_bg || "#ffffff";
  const bg2 = branding?.secondary_bg || "#F9FAFB";

  const text1 = branding?.primary_text || "#111827";
  const text2 = branding?.secondary_text || "#6B7280";

  const fontFamily = branding?.font_family || "Inter";
  const fontSize = branding?.font_size || 16;

  // change this if your Main branch id is different
  const MAIN_BRANCH_ID = 2;

  useEffect(() => {
    if (!open) return;
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setErr("");

      // 1) Get all branch_ministry_ids for Main branch
      const bmIds = await getBranchMinistryIds(MAIN_BRANCH_ID);

      if (bmIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // 2) Fetch pending requests with ministry + branch info
      const { data, error } = await supabase
        .from("user_ministries")
        .select(
          `
          user_ministry_id,
          user_id,
          branch_ministry_id,
          status,
          assigned_at,
          user:users (
            user_id,
            email,
            user_details:users_details (
              first_name,
              last_name,
              branch_id
            )
          ),
          branch_ministry:branch_ministries (
            branch_ministry_id,
            branch:branches ( branch_id, name ),
            ministry:ministries ( id, name )
          )
        `
        )
        .eq("status", "Pending")
        .in("branch_ministry_id", bmIds)
        .order("user_ministry_id", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load joining requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get all branch_ministry_id for a branch
  const getBranchMinistryIds = async (branchId) => {
    try {
      const { data, error } = await supabase
        .from("branch_ministries")
        .select("branch_ministry_id")
        .eq("branch_id", Number(branchId));

      if (error) throw error;
      return (data || []).map((r) => r.branch_ministry_id);
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const handleAction = async (user_ministry_id, action) => {
    setActionLoading((prev) => ({ ...prev, [user_ministry_id]: true }));
    setErr("");

    try {
      if (action === "accept") {
        const { error } = await supabase
          .from("user_ministries")
          .update({ status: "Active", assigned_at: new Date().toISOString() })
          .eq("user_ministry_id", user_ministry_id);

        if (error) throw error;
      } else if (action === "reject") {
        const { error } = await supabase
          .from("user_ministries")
          .delete()
          .eq("user_ministry_id", user_ministry_id);

        if (error) throw error;
      }

      await fetchRequests();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Action failed.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [user_ministry_id]: false }));
    }
  };

  const rows = useMemo(() => {
    return (requests || []).map((r) => {
      const first = r.user?.user_details?.first_name || "";
      const last = r.user?.user_details?.last_name || "";
      const fullName = `${first} ${last}`.trim() || "-";

      const email = r.user?.email || "-";

      const branchName = r.branch_ministry?.branch?.name || "Main Branch";
      const ministryName = r.branch_ministry?.ministry?.name || `#${r.branch_ministry_id}`;

      return {
        id: r.user_ministry_id,
        fullName,
        email,
        ministryLabel: `${branchName} • ${ministryName}`,
      };
    });
  }, [requests]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden"
        style={{
          background: bg1,
          fontFamily,
          fontSize,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: bg2 }}
        >
          <div className="space-y-0.5">
            <h2 className="font-bold" style={{ color: text1 }}>
              Joining Requests
            </h2>
            <p className="text-xs" style={{ color: text2 }}>
              Main Branch (Branch ID: {MAIN_BRANCH_ID})
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-sm font-semibold px-3 py-1 rounded-lg"
            style={{
              color: text2,
              background: bg2,
              border: `1px solid ${bg2}`,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {err && (
            <div
              className="rounded-lg p-3 text-sm mb-4"
              style={{
                background: "#fff1f2",
                border: `1px solid ${secondary}`,
                color: secondary,
              }}
            >
              {err}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10" style={{ color: text2 }}>
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10" style={{ color: text2 }}>
              No joining requests found.
            </div>
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: bg2 }}
            >
              {/* Scroll inside modal if many rows */}
              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full text-sm text-left">
                  <thead
                    className="sticky top-0 z-10"
                    style={{ background: bg2, color: text2 }}
                  >
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Ministry</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t" style={{ borderColor: bg2 }}>
                        <td className="px-4 py-3" style={{ color: text1 }}>
                          {r.fullName}
                        </td>
                        <td className="px-4 py-3" style={{ color: text2 }}>
                          {r.email}
                        </td>
                        <td className="px-4 py-3" style={{ color: text2 }}>
                          {r.ministryLabel}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            className="px-3 py-1.5 rounded-lg mr-2 text-xs font-semibold disabled:opacity-60"
                            style={{
                              background: primary,
                              color: tertiaryText,
                            }}
                            disabled={!!actionLoading[r.id]}
                            onClick={() => handleAction(r.id, "accept")}
                          >
                            Accept
                          </button>

                          <button
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                            style={{
                              background: secondary,
                              color: tertiaryText,
                            }}
                            disabled={!!actionLoading[r.id]}
                            onClick={() => handleAction(r.id, "reject")}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 text-xs border-t"
                style={{ borderColor: bg2, color: text2, background: bg1 }}
              >
                Tip: “Accept” sets status to <b>Active</b>. “Reject” deletes the request row.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
