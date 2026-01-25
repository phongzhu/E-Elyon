import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!email.trim()) return setErr("Email is required.");
    if (!/^\d{6}$/.test(otp.trim())) return setErr("OTP must be exactly 6 digits.");
    if (newPassword.length < 8) return setErr("Password must be at least 8 characters.");
    if (newPassword !== confirm) return setErr("Passwords do not match.");

    setLoading(true);

    try {
      // ✅ verify the 6-digit OTP
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;

      // ✅ now update password (user is authenticated)
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updErr) throw updErr;

      setMsg("✅ Password updated! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg space-y-5">
        <h2 className="text-2xl font-bold text-center">Reset Password</h2>

        {msg && <div className="p-3 bg-green-100 text-green-800 rounded">{msg}</div>}
        {err && <div className="p-3 bg-red-100 text-red-800 rounded">{err}</div>}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block mb-2 font-semibold">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">6-digit OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full p-3 border rounded tracking-widest text-center text-lg"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border rounded"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Confirm Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full p-3 border rounded"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded font-bold disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
