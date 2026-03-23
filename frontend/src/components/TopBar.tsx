import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "projects", label: "Projects", path: "/projects" },
  { id: "workbench", label: "Workbench", path: "/workbench" },
  { id: "notes", label: "Notes", path: "/notes" },
  { id: "schedule", label: "Schedule", path: "/schedule" },
  { id: "journal", label: "Journal", path: "/journal" },
];

const routeMatches = (pathname: string, path: string) => {
  if (path === "/") {
    return pathname === "/";
  }

  return pathname === path || pathname.startsWith(`${path}/`);
};

const Icons = {
  Bolt: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M13 2.25a.75.75 0 01.71.99L12 8.25h4.25a.75.75 0 01.56 1.25l-7.5 8.25a.75.75 0 01-1.28-.69l1.44-4.81H5.25a.75.75 0 01-.58-1.22l7.75-8.5a.75.75 0 01.58-.28z" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 4.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 4.5zm0 10.5a3 3 0 100-6 3 3 0 000 6zm0 4.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 19.5zm7.5-7.5a.75.75 0 01.75.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM2.25 12a.75.75 0 01.75-.75H4.5a.75.75 0 010 1.5H3A.75.75 0 012.25 12zm15.03 5.28a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM4.66 4.66a.75.75 0 011.06 0l1.06 1.06A.75.75 0 015.72 6.78L4.66 5.72a.75.75 0 010-1.06zm13.68 0a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM5.72 17.22a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0z" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M14.91 2.4a.75.75 0 01.3 1.02 8.25 8.25 0 108.09 12.37.75.75 0 011.06.9A9.75 9.75 0 1114.1 1.95a.75.75 0 01.81.45z" />
    </svg>
  ),
  Gear: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M11.08 2.25c-.92 0-1.7.66-1.85 1.57l-.09.55a.8.8 0 01-.52.6c-.16.06-.32.13-.48.2a.8.8 0 01-.8-.07l-.45-.32a1.88 1.88 0 00-2.42.2l-.04.04a1.88 1.88 0 00-.2 2.41l.32.46a.8.8 0 01.07.8c-.07.16-.14.32-.2.48a.8.8 0 01-.6.52l-.55.09a1.88 1.88 0 00-1.57 1.85v.06c0 .92.66 1.7 1.57 1.85l.55.09a.8.8 0 01.6.52c.06.16.13.32.2.48a.8.8 0 01-.07.8l-.32.45a1.88 1.88 0 00.2 2.42l.04.04a1.88 1.88 0 002.41.2l.46-.32a.8.8 0 01.8-.07c.16.07.32.14.48.2a.8.8 0 01.52.6l.09.55c.15.91.93 1.57 1.85 1.57h.06c.92 0 1.7-.66 1.85-1.57l.09-.55a.8.8 0 01.52-.6c.16-.06.32-.13.48-.2a.8.8 0 01.8.07l.45.32a1.88 1.88 0 002.42-.2l.04-.04a1.88 1.88 0 00.2-2.41l-.32-.46a.8.8 0 01-.07-.8c.07-.16.14-.32.2-.48a.8.8 0 01.6-.52l.55-.09c.91-.15 1.57-.93 1.57-1.85v-.06c0-.92-.66-1.7-1.57-1.85l-.55-.09a.8.8 0 01-.6-.52 7.63 7.63 0 00-.2-.48.8.8 0 01.07-.8l.32-.45a1.88 1.88 0 00-.2-2.42l-.04-.04a1.88 1.88 0 00-2.41-.2l-.46.32a.8.8 0 01-.8.07 7.63 7.63 0 00-.48-.2.8.8 0 01-.52-.6l-.09-.55a1.88 1.88 0 00-1.85-1.57h-.06zM12 15a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, profile, setShowSettings, toggleDarkMode } = useTheme();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const currentNavItem = useMemo(() => {
    return NAV_ITEMS.find((item) => routeMatches(location.pathname, item.path)) || NAV_ITEMS[0];
  }, [location.pathname]);

  const avatarUrl = useMemo(() => {
    const storedProfile = localStorage.getItem("profile");
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        if (parsed.customAvatar) {
          return parsed.customAvatar;
        }
      } catch (error) {
        console.error("Failed to parse profile:", error);
      }
    }

    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${
      profile.avatar || user?.username || "vibelife"
    }`;
  }, [profile.avatar, user?.username]);

  const isVisible = isHovered;

  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex justify-center px-3 md:px-5 pointer-events-none">
      <div className="relative w-full max-w-7xl">
        <div
          className={`absolute left-1/2 top-0 -translate-x-1/2 pointer-events-auto ${
            isVisible ? "h-36 md:h-40" : "h-8 md:h-10"
          } w-[min(82vw,72rem)]`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 10 : -88,
            }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={`relative mx-auto overflow-hidden rounded-[20px] border border-white/18 bg-white/22 px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-[18px] dark:border-white/8 dark:bg-slate-950/18 ${
              isVisible ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent dark:via-white/18" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_52%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_52%)]" />
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-left transition-colors hover:bg-white/18 dark:hover:bg-white/6"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-emerald-500 text-white shadow-sm">
                    <Icons.Bolt />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black uppercase tracking-[0.24em] text-gray-900 dark:text-white">
                      VibeLife
                    </div>
                    <div className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                      Workspace
                    </div>
                  </div>
                </button>

                <div className="hidden min-w-0 px-1 md:block">
                  <div className="truncate text-[11px] font-medium uppercase tracking-[0.28em] text-gray-500/90 dark:text-gray-400">
                    {currentNavItem.label}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="flex min-w-max items-center gap-1.5 px-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = routeMatches(location.pathname, item.path);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? "bg-black/70 text-white dark:bg-white/85 dark:text-slate-950"
                            : "bg-transparent text-gray-700 hover:bg-white/18 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/8 dark:hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="rounded-full p-2 text-gray-700 transition-colors hover:bg-white/18 dark:text-gray-200 dark:hover:bg-white/8"
                  title="切换主题"
                >
                  {isDark ? <Icons.Sun /> : <Icons.Moon />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="rounded-full p-2 text-gray-700 transition-colors hover:bg-white/18 dark:text-gray-200 dark:hover:bg-white/8"
                  title="设置"
                >
                  <Icons.Gear />
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="overflow-hidden rounded-full border border-white/18 transition-transform hover:scale-[1.03] dark:border-white/8"
                  title="个人资料"
                >
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="h-8 w-8 bg-white object-cover dark:bg-black"
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
