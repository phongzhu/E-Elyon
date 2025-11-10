// src/pages/AdminSignup.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminSignup() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const signInWithGoogle = async () => {
    try {
      setErr("");
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/profile-setup`, // go to setup after Google
        },
      });
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setErr(e.message || "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "10vh auto", fontFamily: "Inter, system-ui" }}>
      <h1>Admin Sign Up</h1>
      <p>
        Continue with Google to create or activate the <b>first Admin account</b>.
      </p>

      <button
        onClick={signInWithGoogle}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: "pointer",
          width: "100%",
          marginTop: 12,
        }}
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>

      {err && <p style={{ color: "crimson", marginTop: 10 }}>{err}</p>}

      <p style={{ fontSize: 12, color: "#666", marginTop: 12 }}>
        * The first person to sign in becomes <b>ADMIN</b>. Everyone else becomes <b>USER</b>.
      </p>
    </main>
  );
}
