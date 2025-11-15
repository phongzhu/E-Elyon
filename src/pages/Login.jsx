import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  LogIn,
} from "lucide-react";
import { useBranding } from "../context/BrandingContext";

export default function Login() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 🎨 Theme colors pulled from ui_settings
  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#14532d";
  const tertiary = branding?.tertiary_color || "#16a34a";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";
  const bg = branding?.primary_background || "#f9fafb";

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 🔹 Email & Password Login
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
      const authUser = data?.user;
      if (!authUser) throw new Error("Login failed. Please check your credentials.");

      const { data: userRecord } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", form.email.trim())
        .maybeSingle();

      if (userRecord) {
        await supabase.rpc("record_user_action", {
          p_user_id: userRecord.user_id,
          p_action: "LOGIN",
          p_description: "User logged in successfully",
        });
      }

      setMsg("✅ Login successful! Redirecting...");
      setTimeout(() => navigate("/admin"), 1500);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Google OAuth
  const handleGoogle = async () => {
    try {
      setErr("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      setErr("Google login failed: " + e.message);
    }
  };

  return (
    <div
      className="min-h-screen flex transition-all"
      style={{
        fontFamily: font,
        backgroundColor: bg,
      }}
    >
      {/* 🔹 Left Branding Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primary}, ${tertiary})`,
        }}
      >
        <div className="absolute inset-0">
          <div
            className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: `${text}15` }}
          ></div>
          <div
            className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: `${text}15`, animationDelay: "1s" }}
          ></div>
        </div>

        {/* Branding Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            {branding?.logo_icon ? (
              <img
                src={branding.logo_icon}
                alt="Logo"
                className="w-24 h-24 rounded-2xl object-contain mb-6 shadow-xl border border-white/30"
              />
            ) : (
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-2xl mb-6"
                style={{ backgroundColor: `${text}30` }}
              >
                <span className="text-4xl font-bold">{branding?.system_name?.[0] || "E"}</span>
              </div>
            )}
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Welcome to
            <br />
            {branding?.system_name || "E-Elyon System"}
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-md">
            Your centralized dashboard for {branding?.description || "managing your church community"}.
          </p>

         
        </div>
      </div>

      {/* 🔹 Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl bg-white rounded-3xl p-10">
          {/* Logo (Mobile) */}
          <div className="lg:hidden text-center mb-8">
            {branding?.logo_icon ? (
              <img
                src={branding.logo_icon}
                alt="Logo"
                className="w-20 h-20 mx-auto mb-4 object-contain rounded-2xl"
              />
            ) : (
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ backgroundColor: primary, color: text }}
              >
                <span className="text-2xl font-bold">E</span>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="mb-10 text-center">
            <h2
              className="text-4xl font-bold mb-3"
              style={{ color: primary }}
            >
              Sign In
            </h2>
            <p className="text-lg text-gray-600">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Feedback Messages */}
          {msg && (
            <div
              className="mb-6 p-5 rounded-xl flex items-center gap-3 animate-pulse shadow-sm"
              style={{ backgroundColor: `${tertiary}15`, border: `2px solid ${tertiary}` }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: tertiary }} />
              <span className="font-medium" style={{ color: tertiary }}>
                {msg}
              </span>
            </div>
          )}
          {err && (
            <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="text-red-800 font-medium">{err}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:outline-none transition-all"
                  style={{
                    fontFamily: font,
                    "--tw-ring-color": tertiary,
                    outlineColor: tertiary,
                    boxShadow: `0 0 0 3px ${tertiary}20`,
                  }}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-14 py-4 text-base border-2 border-gray-200 rounded-xl focus:outline-none transition-all"
                  style={{
                    fontFamily: font,
                    "--tw-ring-color": tertiary,
                    outlineColor: tertiary,
                    boxShadow: `0 0 0 3px ${tertiary}20`,
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 border-2 rounded focus:ring-2"
                  style={{
                    accentColor: tertiary,
                    borderColor: tertiary,
                  }}
                />
                <span className="ml-3 text-base text-gray-700">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                className="text-base font-semibold"
                style={{ color: tertiary }}
              >
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              style={{
                background: `linear-gradient(to right, ${primary}, ${tertiary})`,
                color: text,
              }}
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-6 bg-white text-gray-500 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-4 py-4 px-6 rounded-xl font-semibold text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md border-2"
            style={{
              borderColor: `${tertiary}60`,
              color: "#444",
              backgroundColor: "#fff",
            }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Sign Up */}
          <p className="text-center text-base text-gray-600 mt-8">
            Don’t have an account?{" "}
            <a
              href="/admin-signup"
              className="font-bold hover:underline"
              style={{ color: tertiary }}
            >
              Create one now
            </a>
          </p>

          {/* Footer */}
          <div className="flex justify-center gap-8 mt-8 text-sm text-gray-500">
            <a href="/terms" className="hover:text-gray-700 transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy
            </a>
            <a href="/help" className="hover:text-gray-700 transition-colors">
              Help
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
