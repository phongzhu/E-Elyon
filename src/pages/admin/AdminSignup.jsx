import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Shield,
  Crown,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useBranding } from "../../context/BrandingContext";

export default function AdminSignup() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { branding } = useBranding();

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#14532d";
  const tertiary = branding?.tertiary_color || "#16a34a";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";
  const bg = branding?.primary_background || "#f9fafb";

  const signInWithGoogle = async () => {
    try {
      setErr("");
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/profile-setup`,
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
    <div
      className="min-h-screen flex transition-all"
      style={{
        fontFamily: font,
        backgroundColor: bg,
      }}
    >
      {/* 🔹 Left Side - Branding & Info */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primary}, ${tertiary})`,
        }}
      >
        {/* Animated Background */}
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

        {/* Content */}
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
                <Crown className="w-10 h-10" />
              </div>
            )}
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Become the
            <br />
            System Administrator
          </h1>
          <p className="text-xl text-white/80 mb-12 max-w-md">
            Set up your admin account and gain full control over{" "}
            {branding?.system_name || "E-Elyon System"}.
          </p>

          <div className="space-y-4 max-w-md">
            {[
              {
                icon: Shield,
                title: "Full System Access",
                desc: "Complete control over all features and settings",
              },
              {
                icon: Users,
                title: "User Management",
                desc: "Manage users, roles, and permissions",
              },
              {
                icon: Sparkles,
                title: "Advanced Tools",
                desc: "Access analytics, reports, and customization options",
              },
            ].map(({ icon: Icon, title, desc }, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${text}20` }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-sm text-white/70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🔹 Right Side - Signup Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-10">
        <div
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-12 border border-gray-100"
          style={{
            fontFamily: font,
          }}
        >
          {/* Header */}
          <div className="mb-10 text-center">
            <h2
              className="text-4xl font-bold mb-3"
              style={{ color: primary }}
            >
              Admin Sign Up
            </h2>
            <p className="text-lg text-gray-600">
              Create the first admin account to get started
            </p>
          </div>

          {/* Error Message */}
          {err && (
            <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="text-red-800 font-medium">{err}</span>
            </div>
          )}

          {/* Info Banner */}
          <div
            className="mb-8 p-6 rounded-2xl border-2"
            style={{
              background: `${tertiary}10`,
              borderColor: `${tertiary}40`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${tertiary}25` }}
              >
                <Crown className="w-6 h-6" style={{ color: tertiary }} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2" style={{ color: primary }}>
                  First User Becomes Admin
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  The first person to sign up will receive{" "}
                  <span className="font-semibold" style={{ color: tertiary }}>
                    ADMIN
                  </span>{" "}
                  privileges with full access. All subsequent users will have{" "}
                  <span className="font-semibold text-gray-800">USER</span> access.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4" style={{ color: primary }}>
              What you'll get:
            </h3>
            <div className="space-y-3">
              {[
                "Complete administrative dashboard access",
                "User and role management capabilities",
                "System branding and customization tools",
                "Audit logs and security monitoring",
                "Database configuration and settings",
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: tertiary }}
                  />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Google Sign Up Button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 py-5 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            style={{
              background: `linear-gradient(to right, ${primary}, ${tertiary})`,
              color: text,
            }}
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Security Note */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <Shield className="w-5 h-5 text-gray-500 mt-0.5" />
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Secure sign-up:</span>{" "}
              Your data is encrypted and protected. We’ll never share your information.
            </p>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-base text-gray-600 mt-8">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-bold hover:underline"
              style={{ color: tertiary }}
            >
              Sign in instead
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
