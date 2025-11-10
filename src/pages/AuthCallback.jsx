import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Completing sign-in…");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        // ❌ Authentication failed
        if (error || !user) {
          console.error(error);
          setMsg("❌ Authentication failed. Redirecting to login…");
          setTimeout(() => navigate("/login"), 1500);
          return;
        }

        // ✅ Check if the user already exists in 'users' table
        const { data: existingUser, error: queryErr } = await supabase
          .from("users")
          .select("role, is_active")
          .eq("email", user.email)
          .maybeSingle();

        if (queryErr) throw queryErr;

        // 🆕 No existing record → new signup → go to Profile Setup
        if (!existingUser) {
          setMsg("Welcome! Please complete your profile.");
          setTimeout(() => navigate("/profile-setup"), 1200);
          return;
        }

        // 🚫 Account inactive
        if (!existingUser.is_active) {
          setMsg("Your account is not active. Contact the admin.");
          return;
        }

        // ✅ Existing ADMIN user → go to dashboard
        if (existingUser.role === "ADMIN") {
          setMsg("✅ Welcome back, Admin!");
          setTimeout(() => navigate("/admin"), 1000);
          return;
        }

        // ✅ Existing non-admin user (if ever added later)
        setMsg("✅ Welcome back!");
        setTimeout(() => navigate("/"), 1000);
      } catch (e) {
        console.error(e);
        setMsg("Unexpected error occurred. Redirecting to login…");
        setTimeout(() => navigate("/login"), 1500);
      }
    })();
  }, [navigate]);

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui" }}>
      <h2>{msg}</h2>
    </main>
  );
}
