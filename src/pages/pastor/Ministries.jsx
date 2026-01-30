// src/pages/pastor/Ministries.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import BishopMinistries from "../bishop/Ministries";

export default function PastorMinistries() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scopeBranchIds, setScopeBranchIds] = useState([]);

  const loadPastorBranchId = async () => {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;

    const authUser = auth?.user;
    if (!authUser?.id)
      throw new Error("Not authenticated. Please login again.");

    const { data: rows, error: userErr } = await supabase
      .from("users")
      .select(
        `
          user_id,
          email,
          role,
          user_details_id,
          auth_user_id,
          user_details:users_details (
            user_details_id,
            branch_id,
            branch:branches ( branch_id, name )
          )
        `
      )
      .eq("auth_user_id", authUser.id);

    if (userErr) throw userErr;
    if (!rows || rows.length === 0) {
      throw new Error("No user record found for this account (users table).");
    }

    const pastorRow =
      rows.find((r) => String(r.role || "").toUpperCase() === "PASTOR") ||
      rows[0];

    if (String(pastorRow.role || "").toUpperCase() !== "PASTOR") {
      throw new Error("Access denied. This page is for Pastor accounts only.");
    }

    const branchId = pastorRow?.user_details?.branch_id || null;
    if (!branchId) {
      throw new Error(
        "Your account has no branch assigned yet. Please contact the Bishop to assign your branch."
      );
    }

    return Number(branchId);
  };

  const loadScopeBranchIds = async (branchId) => {
    // Always include the pastor's assigned branch.
    const ids = new Set([Number(branchId)]);

    // Try common parent column names for satellite branches.
    const candidates = [
      "parent_branch_id",
      "main_branch_id",
      "mother_branch_id",
      "cluster_branch_id",
      "group_branch_id",
    ];

    for (const col of candidates) {
      const { data, error } = await supabase
        .from("branches")
        .select("branch_id")
        .eq(col, Number(branchId));

      if (error) {
        // Column likely doesn't exist in this schema; try next.
        continue;
      }

      (data || []).forEach((b) => {
        if (b?.branch_id != null) ids.add(Number(b.branch_id));
      });

      // If we found any satellites for this column, stop trying others.
      if ((data || []).length > 0) break;
    }

    return Array.from(ids).filter((x) => !Number.isNaN(x));
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const branchId = await loadPastorBranchId();
        const scoped = await loadScopeBranchIds(branchId);

        if (!mounted) return;
        setScopeBranchIds(scoped);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.message || "Failed to load pastor branch context.");
        setScopeBranchIds([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 md:p-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              Loading ministries...
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 md:p-8">
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6">
              {err}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <BishopMinistries
      branchScopeIds={scopeBranchIds}
      defaultBranchFilter="ALL"
      roleLabel="Pastor"
      allBranchesLabel="All My Branches"
    />
  );
}
