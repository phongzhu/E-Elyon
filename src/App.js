// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminSignup from "./pages/AdminSignup";
import AuthCallback from "./pages/AuthCallback";
import ProfileSetup from "./pages/ProfileSetup";
import AdminDashboard from "./pages/AdminDashboard";
import RequireAdmin from "./routes/RequireAdmin";
import Login from "./pages/Login";
import Branding from "./pages/Branding";
import Profile from "./pages/Profile";
import { BrandingProvider } from "./context/BrandingContext";

function App() {
  return (
    <BrandingProvider>
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

          {/* 🌟 Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin-signup" element={<AdminSignup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* 🌟 Profile Setup */}
          <Route path="/profile-setup" element={<ProfileSetup />} />

          {/* 🌟 Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />

          {/* 🌟 Branding */}
          <Route
            path="/branding"
            element={
              <RequireAdmin>
                <Branding />
              </RequireAdmin>
            }
          />

          {/* 🌟 Profile Page */}
         <Route
              path="/profile"
              element={
                <RequireAdmin>
                  <Profile />
                </RequireAdmin>
              }
            />

          {/* Optional redirect for uppercase */}
          <Route path="/Profile" element={<Navigate to="/profile" replace />} />

          {/* 🌟 Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BrandingProvider>
  );
}

export default App;
