import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { supabase } from "../../lib/supabaseClient";
import BishopCounseling from "../bishop/Counseling";

export default function Counseling() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [branchId, setBranchId] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const authUser = auth?.user;
        if (!authUser?.id) throw new Error("Not authenticated. Please login again.");

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
          throw new Error("No user record found for this account (users table)."
          );
        }

        const pastorRow =
          rows.find((r) => String(r.role || "").toUpperCase() === "PASTOR") || rows[0];

        if (String(pastorRow.role || "").toUpperCase() !== "PASTOR") {
          throw new Error("Access denied. This page is for Pastor accounts only.");
        }

        const bId = pastorRow?.user_details?.branch_id || null;
        if (!bId) {
          throw new Error(
            "Your account has no branch assigned yet. Please contact the Bishop to assign your branch."
          );
        }

        if (!mounted) return;
        setBranchId(Number(bId));
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr(e?.message || "Failed to load pastor branch context.");
        setBranchId(null);
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
          <main className="p-8">
            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              Loading counseling requests...
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
          <main className="p-8">
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6">
              {err}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <BishopCounseling
      branchScopeIds={[branchId]}
      defaultBranchFilter={String(branchId)}
      roleLabel="Pastor"
      allBranchesLabel="My Branch"
    />
  );
}
