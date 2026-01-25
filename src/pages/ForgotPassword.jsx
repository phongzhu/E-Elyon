import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // ✅ send user to your reset page after they open email (optional)
          emailRedirectTo: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;

      setMsg("✅ OTP sent to your email. Please check your inbox.");
      // Optional: move user to reset form immediately
      setTimeout(() => navigate("/reset-password", { state: { email: email.trim() } }), 800);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg space-y-5">
        <h2 className="text-2xl font-bold text-center">Forgot Password</h2>

        {msg && <div className="p-3 bg-green-100 text-green-800 rounded">{msg}</div>}
        {err && <div className="p-3 bg-red-100 text-red-800 rounded">{err}</div>}

        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block mb-2 font-semibold">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded font-bold disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      </div>
    </div>
  );
}
