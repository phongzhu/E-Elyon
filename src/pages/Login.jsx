import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // --- Email/Password Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) throw error;
      if (!data?.user) throw new Error("Login failed. Please check your credentials.");

      setMsg("✅ Login successful! Redirecting...");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- Google OAuth Login ---
  const handleGoogle = async () => {
    try {
      setErr("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setErr("Google login failed: " + e.message);
    }
  };

  return (
    <main className="max-w-md mx-auto my-16 font-[Inter]">
      <h1 className="text-3xl font-bold text-center mb-4">Welcome Back</h1>
      <p className="text-center text-gray-600 mb-6">
        Log in to access your admin dashboard.
      </p>

      <form onSubmit={handleLogin} className="bg-gray-50 p-6 rounded-xl shadow-sm grid gap-4">
        <div>
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full border p-2 rounded-lg mt-1"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label>Password</label>
          <input
            type="password"
            name="password"
            required
            value={form.password}
            onChange={handleChange}
            className="w-full border p-2 rounded-lg mt-1"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium mt-3"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        {err && <p className="text-red-600 text-sm">{err}</p>}
        {msg && <p className="text-green-600 text-sm">{msg}</p>}
      </form>

      <div className="text-center mt-6">
        <p className="text-gray-500 mb-2">or</p>
        <button
          onClick={handleGoogle}
          className="w-full border border-gray-300 hover:bg-gray-100 py-2 px-4 rounded-lg font-medium"
        >
          Continue with Google
        </button>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don’t have an account?{" "}
        <a href="/admin-signup" className="text-blue-600 hover:underline">
          Create one
        </a>
      </p>
    </main>
  );
}
