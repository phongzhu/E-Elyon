import React, { useState, useEffect } from "react";
import {
  Home,
  LogOut,
  X,
  ChevronRight,
  ChevronDown,
  Database,
  FileText,
  UserCircle,
  DollarSign,
  ClipboardList,
  Users,
  Settings,
  UserCog,
  Users2,
  Calendar,
  Briefcase,
  MessageSquare,
  PieChart,
  Receipt,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  Clock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBranding } from "../context/BrandingContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", collapsed);
  }, [collapsed]);

  const handleLogout = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;

      if (authUser?.email) {
        const { data: userRecord } = await supabase
          .from("users")
          .select("user_id")
          .eq("email", authUser.email)
          .single();

        if (userRecord) {
          await supabase.rpc("record_user_action", {
            p_user_id: userRecord.user_id,
            p_action: "LOGOUT",
            p_description: "User logged out successfully",
          });
        }
      }

      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err.message);
      navigate("/login");
    }
  };

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#1e40af";
  const tertiary = branding?.tertiary_color || "#3b82f6";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";

  // Menu config per role (uses exact spec with JSX icons)
  const menuConfig = {
    admin: [
      { path: "/admin/dashboard", name: "Home", icon: <Home size={20} /> },
      {
        path: "/admin/users",
        name: "User and Role Management",
        icon: <Users size={20} />,
      },
      {
        path: "/admin/backup",
        name: "Database Settings",
        icon: <Database size={20} />,
      },
      {
        path: "/admin/audit",
        name: "Audit Trail",
        icon: <FileText size={20} />,
      },
      {
        path: "/branding",
        name: "System Configuration",
        icon: <Settings size={20} />,
      },
    ],
    bishop: [
      { path: "/bishop/dashboard", name: "Home", icon: <Home size={20} /> },
      {
        path: "/bishop/roles",
        name: "User and Role Management",
        icon: <UserCog size={20} />,
      },
      {
        path: "/bishop/membership",
        name: "Attendance and Membership",
        icon: <Users2 size={20} />,
      },
      {
        path: "/bishop/events",
        name: "Activity and Events",
        icon: <Calendar size={20} />,
      },
      {
        path: "/bishop/ministries",
        name: "Manage Ministries",
        icon: <Briefcase size={20} />,
        // Commented out dropdown until Manage Ministry Activity page is created
        // dropdown: [
        //   { path: "/bishop/ministries", name: "Ministries" },
        //   {
        //     path: "/bishop/manage-ministry-activity",
        //     name: "Manage Ministry Activity",
        //   },
        // ],
      },
      {
        path: "/bishop/finance",
        name: "Finance Oversight",
        icon: <DollarSign size={20} />,
      },
      {
        path: "/bishop/transfer-approvals",
        name: "Transfer Approvals",
        icon: <ArrowLeftRight size={20} />,
      },
      {
        path: "/bishop/analytics",
        name: "Reports and Analytics",
        icon: <PieChart size={20} />,
      },
      {
        path: "/bishop/counseling",
        name: "Counseling/Prayer Request",
        icon: <MessageSquare size={20} />,
      },
    ],
    pastor: [
      { path: "/pastor/dashboard", name: "Home", icon: <Home size={20} /> },
      {
        path: "/pastor/membership",
        name: "Attendance and Membership",
        icon: <Users2 size={20} />,
      },
      {
        path: "/pastor/events",
        name: "Activity and Events",
        icon: <Calendar size={20} />,
      },
      {
        path: "/pastor/ministries",
        name: "Manage Ministries",
        icon: <Briefcase size={20} />,
      },
      {
        path: "/pastor/finance",
        name: "Finance Overview",
        icon: <DollarSign size={20} />,
      },
      {
        path: "/pastor/tasks",
        name: "My Tasks",
        icon: <ClipboardList size={20} />,
      },
      {
        path: "/pastor/user-management",
        name: "User Management",
        icon: <UserCog size={20} />,
      },
      {
        path: "/pastor/counseling",
        name: "Counseling/Prayer Request",
        icon: <MessageSquare size={20} />,
      },
    ],
    finance: [
      { path: "/finance/dashboard", name: "Finance Dashboard", icon: <Home size={20} /> },
      {
        name: "Donations",
        icon: <DollarSign size={20} />,
        dropdown: [
          { path: "/finance/cash-entry", name: "Cash Entry" },
          { path: "/finance/offering-records", name: "Offering Records" },
        ],
      },
      {
        name: "Expense Management",
        icon: <Receipt size={20} />,
        dropdown: [
          { path: "/finance/expenses", name: "Expense Entry" },
          { path: "/finance/utilities", name: "Utility Tracker" },
          { path: "/finance/approval-queue", name: "Approval Queue" },
        ],
      },
      {
        name: "Fund Management",
        icon: <Wallet size={20} />,
        dropdown: [
          { path: "/finance/funds", name: "Accounts & Balances" },
          { path: "/finance/stipends", name: "Stipends" },
          { path: "/finance/transfers", name: "Transfer Funds" },
          { path: "/finance/transfer-approval-queue", name: "Approval Queue" },
        ],
      },
      {
        name: "Financial Reports",
        icon: <Clock size={20} />,
        dropdown: [
          { path: "/finance/reports", name: "Statement Reports" },
          { path: "/finance/donations", name: "Donation Reports" },
          { path: "/finance/transfer-reports", name: "Transfer Reports" },
          { path: "/finance/audit-trail", name: "Audit Trail" },
        ],
      },
    ],
    staff: [
      { path: "/staff/dashboard", name: "Home", icon: <Home size={20} /> },
      { path: "/staff/tasks", name: "My Tasks", icon: <FileText size={20} /> },
    ],
    ceo: [{ path: "/ceo", name: "Home", icon: <Home size={20} /> }],
  };

  // Resolve items for current role
  const getMenuItems = () => {
    const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
    return menuConfig[role] || menuConfig.admin;
  };

  const getRoleName = () => {
    const userRole = localStorage.getItem("userRole") || "admin";
    const roleNames = {
      admin: "Admin",
      bishop: "Bishop",
      pastor: "Pastor",
      finance: "Finance",
      staff: "Staff",
      ceo: "CEO",
    };
    return roleNames[userRole] || "Admin";
  };

  const menuItems = getMenuItems();
  const roleName = getRoleName();
  // Dropdown open state for sidebar dropdowns (only one open at a time)
  const [openDropdown, setOpenDropdown] = useState(() => {
    const saved = localStorage.getItem("sidebarOpenDropdown");
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    if (openDropdown !== null) {
      localStorage.setItem("sidebarOpenDropdown", openDropdown.toString());
    } else {
      localStorage.removeItem("sidebarOpenDropdown");
    }
  }, [openDropdown]);

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-72"
      } h-screen flex flex-col transition-all duration-300 shadow-2xl relative sticky top-0`}
      style={{
        backgroundColor: primary,
        color: text,
        fontFamily: font,
      }}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
        style={{
          backgroundColor: tertiary,
          color: text,
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <X size={14} />}
      </button>

      {/* Header */}
      <div className="p-6 border-b border-white/10">
        {!collapsed ? (
          <div className="text-center">
            {branding?.logo_icon ? (
              <img
                src={branding.logo_icon}
                alt="Logo"
                className="w-16 h-16 mx-auto mb-3 rounded-xl object-contain"
              />
            ) : (
              <div
                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
                style={{ backgroundColor: tertiary, color: text }}
              >
                E
              </div>
            )}
            <h3 className="font-bold text-lg">{roleName} Panel</h3>
            <p className="text-xs opacity-70 mt-1">Manage your system</p>
          </div>
        ) : (
          <div
            className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl font-bold"
            style={{
              backgroundColor: tertiary,
              color: text,
            }}
          >
            E
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item, idx) => {
          if (item.dropdown) {
            // Check if any dropdown item is active
            const isActive = item.dropdown.some((d) =>
              location.pathname.startsWith(d.path)
            );
            const isDropdownOpen = openDropdown === idx;
            return (
              <div key={item.name} className="mb-1">
                <button
                  className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all duration-200 group ${
                    isActive
                      ? "shadow-lg scale-[1.02] bg-white/10"
                      : "hover:scale-[1.02] hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: isActive ? secondary : "transparent",
                  }}
                  onClick={() => setOpenDropdown(isDropdownOpen ? null : idx)}
                >
                  <div
                    className={`transition-transform ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  >
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <span className={isActive ? "font-semibold" : ""}>
                      {item.name}
                    </span>
                  )}
                  {!collapsed && (
                    <ChevronDown
                      size={16}
                      className={`ml-auto transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
                {isDropdownOpen && !collapsed && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.dropdown.map((d) => (
                      <button
                        key={d.path}
                        className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                          ${
                            location.pathname === d.path
                              ? "bg-white/30 text-white"
                              : "hover:bg-white/10 text-white/80"
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(d.path);
                        }}
                        style={{ fontFamily: font }}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all duration-200 group ${
                isActive
                  ? "shadow-lg scale-[1.02]"
                  : "hover:scale-[1.02] hover:bg-white/5"
              }`}
              style={{
                backgroundColor: isActive ? secondary : "transparent",
              }}
            >
              <div
                className={`transition-transform ${
                  isActive ? "scale-110" : "group-hover:scale-110"
                }`}
              >
                {item.icon}
              </div>
              {!collapsed && (
                <span className={isActive ? "font-semibold" : ""}>
                  {item.name}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        {!collapsed && (
          <div className="mb-3 p-3 rounded-lg bg-white/5 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: tertiary }}
            >
              <UserCircle size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{roleName} User</p>
              <p className="text-xs opacity-70">
                {localStorage.getItem("userEmail") || "user@example.com"}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 p-3 rounded-xl w-full transition-all duration-200 hover:scale-[1.02] shadow-lg"
          style={{
            backgroundColor: tertiary,
            color: text,
          }}
        >
          <LogOut size={20} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
