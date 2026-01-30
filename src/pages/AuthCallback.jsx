import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Completing sign-in…");
  const navigate = useNavigate();
  const processed = useRef(false); // ✅ prevents duplicate execution

  useEffect(() => {
    (async () => {
      // ✅ Stop if already handled once
      if (processed.current) return;
      processed.current = true;

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        // ❌ Authentication failed
        if (error || !user) {
          console.error(error);
          setMsg("❌ Authentication failed. Redirecting to login…");
          setTimeout(() => navigate("/login"), 1500);
          return;
        }

        // ✅ Check if user exists in your custom table
        const { data: existingUser, error: queryErr } = await supabase
          .from("users")
          .select("user_id, role, is_active")
          .eq("email", user.email)
          .maybeSingle();

        if (queryErr) throw queryErr;

        let userId = existingUser?.user_id;

        // 🆕 New signup — create record once
        if (!existingUser) {
          const { data: insertedUser, error: insertErr } = await supabase
            .from("users")
            .insert([
              {
                email: user.email,
                role: "MEMBER", // 👈 default to MEMBER
                is_active: true,
              },
            ])
            .select("user_id")
            .single();

          if (insertErr) throw insertErr;
          userId = insertedUser.user_id;

          // ✅ Log only SIGNUP (no LOGIN)
          await supabase.rpc("record_user_action", {
            p_user_id: userId,
            p_action: "SIGNUP",
            p_description: "User signed up via Google OAuth",
          });

          setMsg("Welcome! Please complete your profile.");
          setTimeout(() => navigate("/profile-setup"), 1200);
          return;
        }

        // 🚫 Inactive account
        if (!existingUser.is_active) {
          setMsg("Your account is not active. Contact the admin.");
          return;
        }

        // ✅ Log LOGIN only once
        if (userId) {
          await supabase.rpc("record_user_action", {
            p_user_id: userId,
            p_action: "LOGIN",
            p_description: "User logged in via Google OAuth",
          });
        }

        // ✅ Route by role
        if (existingUser.role === "ADMIN") {
          setMsg("✅ Welcome back, Admin!");
          setTimeout(() => navigate("/admin"), 1000);
          return;
        }

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
