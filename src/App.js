// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminSignup from "./pages/AdminSignup";
import AuthCallback from "./pages/AuthCallback";
import ProfileSetup from "./pages/ProfileSetup";
import AdminDashboard from "./pages/AdminDashboard";
import RequireAdmin from "./routes/RequireAdmin";
import Login from "./pages/Login"; // ✅ new

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🌟 Home */}
        <Route
          path="/"
          element={
            <div style={{ padding: 40, textAlign: "center" }}>
              <h1>Welcome to E-Elyon</h1>
              <p>
                Go to{" "}
                <a href="/login" className="text-blue-600 underline">
                  /login
                </a>{" "}
                to sign in or{" "}
                <a href="/admin-signup" className="text-blue-600 underline">
                  /admin-signup
                </a>{" "}
                to register the first admin.
              </p>
            </div>
          }
        />

        {/* 🌟 Login page */}
        <Route path="/login" element={<Login />} />

        {/* 🌟 Admin sign-up (first admin only) */}
        <Route path="/admin-signup" element={<AdminSignup />} />

        {/* 🌟 OAuth callback — Supabase redirects here after Google auth */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 🌟 Profile setup — collects required user details */}
        <Route path="/profile-setup" element={<ProfileSetup />} />

        {/* 🌟 Protected admin dashboard */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />

        {/* 🌟 Catch-all: redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
