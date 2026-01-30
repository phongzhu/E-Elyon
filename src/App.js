// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { BrandingProvider } from "./context/BrandingContext";

// Auth / setup
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminSignup from "./pages/admin/AdminSignup";
import AuthCallback from "./pages/AuthCallback";
import ProfileSetup from "./pages/ProfileSetup";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AccountManagement from "./pages/admin/AccountManagement";
import Branding from "./pages/admin/Branding";
import Profile from "./pages/admin/Profile";
import AuditLog from "./pages/admin/AuditLog";
import DatabaseSettings from "./pages/admin/DatabaseSettings";
import RequireAdmin from "./routes/RequireAdmin";

// Bishop
import BishopDashboard from "./pages/bishop/BishopDashboard";
import BishopUserRoles from "./pages/bishop/UserRoles";
import BishopMembership from "./pages/bishop/Membership";
import BishopEvents from "./pages/bishop/Events";
import BishopFinance from "./pages/bishop/Finance";
import BishopFinanceAccounts from "./pages/bishop/FinanceAccounts";
import BishopTasks from "./pages/bishop/Tasks";
import BishopAnalytics from "./pages/bishop/Analytics";
import BishopCounseling from "./pages/bishop/Counseling";
import Ministries from "./pages/bishop/Ministries";
import ManageMinistryActivity from "./pages/bishop/Manage_Ministry_Activity";
import RequireBishop from "./routes/RequireBishop";

// Pastor
import PastorDashboard from "./pages/pastor/PastorDashboard";
import Membership from "./pages/pastor/Membership";
import Events from "./pages/pastor/Events";
import Finance from "./pages/pastor/Finance";
import Tasks from "./pages/pastor/Tasks";
import Counseling from "./pages/pastor/Counseling";
import UserManagement from "./pages/pastor/UserManagement";
import PastorMinistries from "./pages/pastor/Ministries";
import RequirePastor from "./routes/requirePastor";

// Finance role
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import FinanceAccounts from "./pages/finance/FinanceAccounts";
import FinanceFunds from "./pages/finance/Funds";
import FinanceStipends from "./pages/finance/Stipends";
import FinanceTasks from "./pages/finance/Tasks";
import FinanceReports from "./pages/finance/Reports";

// Staff / CEO
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffTasks from "./pages/staff/Tasks";
import CEODashboard from "./pages/ceo/CEODashboard";

function App() {
  return (
    <BrandingProvider>
      <BrowserRouter>
        <Routes>
          {/* 🌟 Home - Redirect to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 🌟 Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAdmin>
                <AccountManagement />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/backup"
            element={
              <RequireAdmin>
                <DatabaseSettings />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequireAdmin>
                <AuditLog />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAdmin>
                <Branding />
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

          {/* 🌟 Audit Log alias */}
          <Route
            path="/audit_log"
            element={
              <RequireAdmin>
                <AuditLog />
              </RequireAdmin>
            }
          />

          {/* 🌟 Database Settings alias */}
          <Route
            path="/database"
            element={
              <RequireAdmin>
                <DatabaseSettings />
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

          {/* 🌟 Account Management */}
          {/* Temporary public preview route (no auth) - remove when finished testing */}
          <Route
            path="/account-management-preview"
            element={<AccountManagement />}
          />
          <Route
            path="/admin/account-management"
            element={
              <RequireAdmin>
                <AccountManagement />
              </RequireAdmin>
            }
          />

          {/* 🌟 Role-Based Dashboards */}
          {/* Bishop */}
          <Route path="/bishop" element={<BishopDashboard />} />
          <Route path="/bishop/dashboard" element={<BishopDashboard />} />
          <Route path="/bishop/roles" element={<BishopUserRoles />} />
          <Route path="/bishop/membership" element={<BishopMembership />} />
          <Route path="/bishop/events" element={<BishopEvents />} />

          <Route
            path="/bishop/ministries"
            element={
              <RequireBishop>
                <Ministries />
              </RequireBishop>
            }
          />

          <Route
            path="/bishop/manage-ministry-activity"
            element={
              <RequireBishop>
                <ManageMinistryActivity />
              </RequireBishop>
            }
          />

          <Route path="/bishop/finance" element={<BishopFinance />} />
          <Route path="/bishop/finance-accounts" element={<BishopFinanceAccounts />} />
          <Route path="/bishop/tasks" element={<BishopTasks />} />
          <Route path="/bishop/analytics" element={<BishopAnalytics />} />
          <Route path="/bishop/counseling" element={<BishopCounseling />} />

          {/* Pastor */}
          <Route
            path="/pastor"
            element={
              <RequirePastor>
                <PastorDashboard />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/dashboard"
            element={
              <RequirePastor>
                <PastorDashboard />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/membership"
            element={
              <RequirePastor>
                <Membership />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/events"
            element={
              <RequirePastor>
                <Events />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/ministries"
            element={
              <RequirePastor>
                <PastorMinistries />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/finance"
            element={
              <RequirePastor>
                <Finance />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/tasks"
            element={
              <RequirePastor>
                <Tasks />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/counseling"
            element={
              <RequirePastor>
                <Counseling />
              </RequirePastor>
            }
          />
          <Route
            path="/pastor/user-management"
            element={
              <RequirePastor>
                <UserManagement />
              </RequirePastor>
            }
          />

          {/* Finance */}
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/finance/dashboard" element={<FinanceDashboard />} />
          <Route path="/finance/accounts" element={<FinanceAccounts />} />
          <Route path="/finance/funds" element={<FinanceFunds />} />
          <Route path="/finance/stipends" element={<FinanceStipends />} />
          <Route path="/finance/tasks" element={<FinanceTasks />} />
          <Route path="/finance/reports" element={<FinanceReports />} />

          {/* Staff */}
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/tasks" element={<StaffTasks />} />

          {/* CEO */}
          <Route path="/ceo" element={<CEODashboard />} />

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
