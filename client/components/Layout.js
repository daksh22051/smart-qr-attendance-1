import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, RefreshCw } from "lucide-react";

const navItems = [
  { href: "/", label: "Patient Registration", icon: "👤" },
  { href: "/reception", label: "Reception Dashboard", icon: "🧾", badge: 3 },
  { href: "/display", label: "Live Queue", icon: "🖥️", badge: 5 },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/pharmacy-orders", label: "Pharmacy Orders", icon: "💊" }
];

const helpItems = [
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/help", label: "Help", icon: "❓" },
  { href: "/about", label: "About System", icon: "ℹ️" }
];

export default function Layout({ children }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const currentUser = {
    name: "Dr. Ayesha",
    role: "General Medicine"
  };
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!notificationRef.current) return;
      const clickedNotification = notificationRef.current.contains(event.target);
      const clickedProfile = profileRef.current?.contains(event.target);
      if (!clickedNotification) setShowNotifications(false);
      if (!clickedProfile) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredNav = useMemo(() => {
    if (!search) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const notifications = alerts.length
    ? alerts.map((alert, index) => ({
        id: alert.id || index,
        text: alert.text,
        time: alert.time || "Just now"
      }))
    : [
        { id: 1, text: "✅ All systems normal", time: "Just now" }
      ];

  useEffect(() => {
    let active = true;
    const loadAlerts = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/ai/alerts`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        // ignore
      }
    };

    const loadInsights = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"}/api/ai/analytics-insights`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setInsights(data);
        }
      } catch (error) {
        // ignore
      }
    };

    loadAlerts();
    loadInsights();
    const interval = setInterval(() => {
      loadAlerts();
      loadInsights();
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 800);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
      document.cookie = "token=; Max-Age=0; path=/";
    }
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f8fbff] via-[#fdf7ff] to-[#fffaf2] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-rose-100/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-12 w-12 rotate-12 rounded-2xl bg-white/40 shadow-lg" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/3 h-10 w-10 rotate-45 bg-white/35 shadow-lg" />
      <div className="pointer-events-none absolute top-16 right-24 h-8 w-8 rounded-full bg-white/40" />
      <aside
        className={`hidden lg:flex flex-col p-5 transition-all ${collapsed ? "w-24" : "w-64"} bg-white/90 border-r border-slate-200 shadow-sm`}
      >
        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between gap-2">
          <div className={`transition-all ${collapsed ? "hidden" : "block"}`}>
            <h1 className="text-xl font-semibold text-slate-800">Smart Clinic</h1>
            <p className="text-xs text-slate-500">Queue Manager</p>
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-600 shadow flex items-center justify-center"
          >
            {collapsed ? "➡" : "⬅"}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-3 mt-3">
          <div className="text-xs uppercase text-slate-400">Clinic Status</div>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            System Active
          </div>
          <div className={`mt-2 text-xs text-slate-500 ${collapsed ? "hidden" : "block"}`}>
            Active Queue → 5 patients
          </div>
          <div className={`text-xs text-slate-500 ${collapsed ? "hidden" : "block"}`}>
            Doctor Available → 2
          </div>
        </div>

        <div className={`mt-3 bg-white border border-slate-200 rounded-3xl p-3 ${collapsed ? "hidden" : "block"}`}>
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
            placeholder="Search page..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <nav className="flex-1 mt-4 space-y-2">
          {filteredNav.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition ${
                  isActive
                    ? "bg-slate-100 border-slate-200 shadow font-semibold text-slate-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    {item.label}
                    {item.badge ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-clinic-100 text-clinic-700">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 bg-white border border-slate-200 rounded-3xl p-3 text-xs text-slate-500 flex items-center gap-2">
          Live Queue
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Updating
        </div>

        <div className="mt-3 space-y-2">
          {helpItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <span>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ))}
        </div>
      </aside>
      <main className="flex-1 relative">
        <header className="lg:hidden p-4">
          <div className="glass-panel p-3 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1 rounded-full text-sm bg-white/70 text-slate-700 shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <div className="p-6">
          <div className="relative">
            <div className="pointer-events-none absolute -top-6 right-0 h-32 w-32 rounded-full bg-purple-200/30 blur-2xl" />
            <div className="pointer-events-none absolute top-16 left-10 h-12 w-12 rounded-full bg-pink-200/30" />
            <div className="pointer-events-none absolute top-0 left-1/2 h-10 w-10 rotate-12 bg-orange-200/20" />
          </div>
          <div className="relative max-w-[1400px] mx-auto">
            <div className="glass-panel p-6 mb-8 overflow-visible">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Smart Clinic Dashboard</h2>
                  <p className="text-slate-600 text-sm">Real-time patient flow management</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {insights && (
                    <div className="hidden lg:flex flex-col px-4 py-2 rounded-2xl bg-white/70 border border-white/60 shadow text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">AI Insights</span>
                      <span>Peak Hours → {insights.peakHours}</span>
                      <span>Avg Consultation → {insights.averageConsultation}</span>
                      <span>Busiest Doctor → {insights.busiestDoctor}</span>
                    </div>
                  )}
                  <Link href="/#patient-registration" className="btn-gradient px-5 py-2 text-sm" title="Add Patient">
                    <span className="inline-flex items-center gap-2">
                      <Plus size={18} /> Add Patient
                    </span>
                  </Link>
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={() => setShowNotifications((prev) => !prev)}
                      className="h-11 w-11 rounded-full bg-white/70 border border-white/60 shadow flex items-center justify-center hover:scale-[1.02] transition"
                      title="Notifications"
                    >
                      <div className="relative">
                        <Bell size={20} className="text-slate-700" />
                        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center">
                          {Math.min(9, notifications.length)}
                        </span>
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="h-11 w-11 rounded-full bg-white/70 border border-white/60 shadow flex items-center justify-center hover:scale-[1.02] transition"
                    title="Refresh Queue"
                    disabled={isRefreshing}
                  >
                    <RefreshCw size={20} className={`text-slate-700 ${isRefreshing ? "animate-spin" : ""}`} />
                  </button>
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setShowProfileMenu((prev) => !prev)}
                      className="h-11 w-11 rounded-full bg-white/80 border border-white/60 shadow flex items-center justify-center"
                      title="Profile"
                    >
                      <span className="text-sm font-semibold text-slate-600">RC</span>
                    </button>
                    <AnimatePresence>
                      {showProfileMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute right-0 mt-3 w-56 rounded-2xl bg-white border border-slate-200 shadow-lg p-2 text-sm text-slate-600"
                        >
                          <div className="px-3 py-2">
                            <div className="text-sm font-semibold text-slate-800">{currentUser.name}</div>
                            <div className="text-xs text-slate-500">{currentUser.role}</div>
                          </div>
                          <div className="my-2 h-px bg-slate-100" />
                          <button
                            onClick={() => router.push("/profile")}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4 text-clinic-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <circle cx="12" cy="8" r="4" />
                              <path d="M4 20c2-4 14-4 16 0" />
                            </svg>
                            My Profile
                          </button>
                          <button
                            onClick={() => router.push("/settings")}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M12 6v12" />
                              <path d="M6 12h12" />
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                            Settings
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M16 17l5-5-5-5" />
                              <path d="M21 12H9" />
                              <path d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" />
                            </svg>
                            Logout
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
            {children}
          </div>
        </div>
        {showNotifications && (
          <div className="fixed top-[90px] right-[40px] w-80 rounded-2xl bg-white border border-slate-200 p-4 z-[9999] shadow-lg">
            <div className="text-sm font-semibold text-slate-700">Notifications</div>
            <ul className="mt-3 space-y-3 text-sm text-slate-600 max-h-80 overflow-y-auto">
              {notifications.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div>
                    <div>{item.text}</div>
                    <div className="text-xs text-slate-400">{item.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
