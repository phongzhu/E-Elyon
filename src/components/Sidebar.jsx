import React, { useEffect, useMemo, useState } from "react";
import {
  Home,
  LogOut,
  X,
  ChevronRight,
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
  Wallet,
  Layers,
  ListChecks,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useBranding } from "../context/BrandingContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { branding } = useBranding();

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
      console.error("Logout error:", err?.message || err);
      navigate("/login");
    }
  };

  const primary = branding?.primary_color || "#0f172a";
  const secondary = branding?.secondary_color || "#1e40af";
  const tertiary = branding?.tertiary_color || "#3b82f6";
  const text = branding?.tertiary_text_color || "#ffffff";
  const font = branding?.font_family || "Inter";

  const sizes = useMemo(
    () => ({
      wOpen: "w-[clamp(16rem,22vw,18rem)]",
      wClosed: "w-20",

      btnPad:
        "px-[clamp(0.55rem,1.0vw,0.85rem)] py-[clamp(0.50rem,0.9vw,0.75rem)]",
      btnGap: "gap-[clamp(0.55rem,0.9vw,0.75rem)]",
      icon: 18,

      text: "text-[clamp(0.78rem,0.95vw,0.92rem)]",
      subText: "text-[clamp(0.74rem,0.9vw,0.88rem)]",
      headerTitle: "text-[clamp(0.95rem,1.2vw,1.05rem)]",
      headerSub: "text-[clamp(0.70rem,0.9vw,0.78rem)]",
    }),
    []
  );

  const menuConfig = useMemo(
    () => ({
      admin: [
        {
          path: "/admin/dashboard",
          name: "Home",
          icon: <Home size={sizes.icon} />,
        },
        {
          path: "/admin/users",
          name: "User and Role Management",
          icon: <Users size={sizes.icon} />,
        },
        {
          path: "/admin/backup",
          name: "Database Settings",
          icon: <Database size={sizes.icon} />,
        },
        {
          path: "/admin/audit",
          name: "Audit Trail",
          icon: <FileText size={sizes.icon} />,
        },
        {
          path: "/branding",
          name: "System Configuration",
          icon: <Settings size={sizes.icon} />,
        },
      ],

      bishop: [
        {
          path: "/bishop/dashboard",
          name: "Home",
          icon: <Home size={sizes.icon} />,
        },
        {
          path: "/bishop/roles",
          name: "User and Role Management",
          icon: <UserCog size={sizes.icon} />,
        },
        {
          path: "/bishop/membership",
          name: "Attendance and Membership",
          icon: <Users2 size={sizes.icon} />,
        },
        {
          path: "/bishop/events",
          name: "Activity and Events",
          icon: <Calendar size={sizes.icon} />,
        },
        {
          name: "Manage Ministries",
          icon: <Briefcase size={sizes.icon} />,
          dropdown: [
            {
              path: "/bishop/ministries",
              name: "Ministries",
              icon: <Layers size={sizes.icon} />,
            },
            {
              path: "/bishop/manage-ministry-activity",
              name: "Ministry Activities",
              icon: <ListChecks size={sizes.icon} />,
            },
          ],
        },
        {
          path: "/bishop/finance",
          name: "Finance Oversight",
          icon: <DollarSign size={sizes.icon} />,
        },
        {
          path: "/bishop/finance-accounts",
          name: "Finance Accounts",
          icon: <Wallet size={sizes.icon} />,
        },
        {
          path: "/bishop/analytics",
          name: "Reports and Analytics",
          icon: <PieChart size={sizes.icon} />,
        },
        {
          path: "/bishop/counseling",
          name: "Counseling/Prayer Request",
          icon: <MessageSquare size={sizes.icon} />,
        },
      ],

      pastor: [
        {
          path: "/pastor/dashboard",
          name: "Home",
          icon: <Home size={sizes.icon} />,
        },
        {
          path: "/pastor/membership",
          name: "Attendance and Membership",
          icon: <Users2 size={sizes.icon} />,
        },
        {
          path: "/pastor/events",
          name: "Activity and Events",
          icon: <Calendar size={sizes.icon} />,
        },
        {
          path: "/pastor/ministries",
          name: "Manage Ministries",
          icon: <Briefcase size={sizes.icon} />,
        },
        {
          path: "/pastor/finance",
          name: "Finance Overview",
          icon: <DollarSign size={sizes.icon} />,
        },
        {
          path: "/pastor/tasks",
          name: "My Tasks",
          icon: <ClipboardList size={sizes.icon} />,
        },
        {
          path: "/pastor/user-management",
          name: "User Management",
          icon: <UserCog size={sizes.icon} />,
        },
        {
          path: "/pastor/counseling",
          name: "Counseling/Prayer Request",
          icon: <MessageSquare size={sizes.icon} />,
        },
      ],

      finance: [
        {
          path: "/finance/dashboard",
          name: "Home",
          icon: <Home size={sizes.icon} />,
        },
        {
          path: "/finance/accounts",
          name: "Finance Accounts",
          icon: <Wallet size={sizes.icon} />,
        },
        {
          path: "/finance/funds",
          name: "Church Fund Management",
          icon: <Database size={sizes.icon} />,
        },
        {
          path: "/finance/stipends",
          name: "Church Stipends",
          icon: <DollarSign size={sizes.icon} />,
        },
        {
          path: "/finance/tasks",
          name: "Assignment Control",
          icon: <ClipboardList size={sizes.icon} />,
        },
        {
          path: "/finance/reports",
          name: "Reports and Analytics",
          icon: <PieChart size={sizes.icon} />,
        },
      ],

      staff: [
        {
          path: "/staff/dashboard",
          name: "Home",
          icon: <Home size={sizes.icon} />,
        },
        {
          path: "/staff/tasks",
          name: "My Tasks",
          icon: <FileText size={sizes.icon} />,
        },
      ],

      ceo: [{ path: "/ceo", name: "Home", icon: <Home size={sizes.icon} /> }],
    }),
    [sizes.icon]
  );

  const role = (localStorage.getItem("userRole") || "admin").toLowerCase();
  const menuItems = menuConfig[role] || menuConfig.admin;

  const roleName = useMemo(() => {
    const roleNames = {
      admin: "Admin",
      bishop: "Bishop",
      pastor: "Pastor",
      finance: "Finance",
      staff: "Staff",
      ceo: "CEO",
    };
    return roleNames[role] || "Admin";
  }, [role]);

  useEffect(() => {
    const idx = menuItems.findIndex(
      (it) =>
        it.dropdown &&
        it.dropdown.some((d) => location.pathname.startsWith(d.path))
    );
    if (idx !== -1) setOpenDropdown(idx);
  }, [location.pathname, menuItems]);

  const buttonClass = (active) =>
    [
      "w-full flex items-center justify-start text-left rounded-xl font-semibold transition-all duration-200",
      sizes.btnPad,
      sizes.btnGap,
      sizes.text,
      "whitespace-nowrap",
      active ? "shadow-lg" : "hover:translate-x-[2px] hover:bg-white/5",
    ].join(" ");

  const labelClass =
    "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left";

  return (
    // ✅ Outer aside allows overflow so the floating toggle isn't clipped
    <aside
      className={`${
        collapsed ? sizes.wClosed : sizes.wOpen
      } h-dvh relative sticky top-0`}
      style={{
        backgroundColor: primary,
        color: text,
        fontFamily: font,
        overflow: "visible",
      }}
    >
      {/* ✅ Inner wrapper keeps your “NO SCROLL” rule */}
      <div
        className="h-dvh flex flex-col shadow-2xl"
        style={{
          backgroundColor: primary,
          overflow: "hidden",
        }}
      >
        {/* ✅ Collapse Button (no more clipped edges) */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-20 -right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-50"
          style={{
            backgroundColor: tertiary,
            color: text,
            // ring/border makes it clean against any background
            boxShadow: "0 8px 20px rgba(0,0,0,.35)",
            border: `2px solid ${primary}`,
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <X size={14} />}
        </button>

        {/* Header */}
        <div className="px-4 py-4 border-b border-white/10">
          {!collapsed ? (
            <div className="text-center">
              {branding?.logo_icon ? (
                <img
                  src={branding.logo_icon}
                  alt="Logo"
                  className="w-14 h-14 mx-auto mb-2 rounded-xl object-contain"
                />
              ) : (
                <div
                  className="w-14 h-14 mx-auto mb-2 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
                  style={{ backgroundColor: tertiary, color: text }}
                >
                  E
                </div>
              )}
              <h3 className={`font-bold ${sizes.headerTitle}`}>
                {roleName} Panel
              </h3>
              <p className={`${sizes.headerSub} opacity-70 mt-1`}>
                Manage your system
              </p>
            </div>
          ) : (
            <div
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: tertiary, color: text }}
            >
              E
            </div>
          )}
        </div>

        {/* Menu (LEFT aligned, no scroll) */}
        <nav
          className="flex-1 pl-4 pr-3 py-3 space-y-1 text-left"
          style={{ overflow: "hidden" }}
        >
          {menuItems.map((item, idx) => {
            if (item.dropdown) {
              const isActive = item.dropdown.some((d) =>
                location.pathname.startsWith(d.path)
              );
              const isOpen = openDropdown === idx;

              return (
                <div key={item.name} className="space-y-1">
                  <button
                    className={buttonClass(isActive)}
                    style={{
                      backgroundColor: isActive ? secondary : "transparent",
                    }}
                    onClick={() => setOpenDropdown(isOpen ? null : idx)}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    {!collapsed && (
                      <span className={labelClass}>{item.name}</span>
                    )}
                    {!collapsed && (
                      <ChevronRight
                        size={16}
                        className={`shrink-0 transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    )}
                  </button>

                  {isOpen && !collapsed && (
                    <div className="space-y-1">
                      {item.dropdown.map((d) => {
                        const childActive = location.pathname.startsWith(
                          d.path
                        );
                        return (
                          <button
                            key={d.path}
                            onClick={() => navigate(d.path)}
                            className={buttonClass(childActive)}
                            style={{
                              backgroundColor: childActive
                                ? secondary
                                : "transparent",
                            }}
                          >
                            <div className="shrink-0">{d.icon}</div>
                            <span className={`${labelClass} ${sizes.subText}`}>
                              {d.name}
                            </span>
                          </button>
                        );
                      })}
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
                className={buttonClass(isActive)}
                style={{
                  backgroundColor: isActive ? secondary : "transparent",
                }}
              >
                <div className="shrink-0">{item.icon}</div>
                {!collapsed && <span className={labelClass}>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/10">
          {!collapsed && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-white/5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: tertiary }}
              >
                <UserCircle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {roleName} User
                </p>
                <p className="text-xs opacity-70 truncate">
                  {localStorage.getItem("userEmail") || "user@example.com"}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.01] shadow-lg px-3 py-2"
            style={{ backgroundColor: tertiary, color: text }}
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
