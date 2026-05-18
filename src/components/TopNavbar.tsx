"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { Bell, Menu, Moon, Search, Sun, Type, User, Monitor, LogOut, Settings, Globe, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from '@/lib/api';
import { usePathname } from "next/navigation";
import { getCompanyRoleScope } from "@/lib/companyRoleScope";

export default function TopNavbar() {
    const { user, logout, currentHotel, availableHotels } = useAuth();
    const pathname = usePathname();
    const { isDarkMode, toggleTheme, increaseFontSize, decreaseFontSize, toggleSidebar, sidebarCollapsed } = useTheme();
    const { settings, setResult } = useSettings();
    const [ipAddress, setIpAddress] = useState<string>('Loading...');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const [workspaceMode, setWorkspaceMode] = useState<"platform" | "tenant">("platform");
    const [mounted, setMounted] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const superAdminCanSwitchWorkspace = user?.role_id === 1 && availableHotels.length > 0;
    const companyRoleScope = mounted ? getCompanyRoleScope(user) : "unknown";
    const isPlatformWorkspace = user?.role_id === 1
        ? workspaceMode === "platform"
        : !currentHotel;
    const workspaceLabel = isPlatformWorkspace ? "Platform Workspace" : "Tenant Workspace";
    const contextLabel = isPlatformWorkspace ? (user?.role_name || "System User") : (currentHotel?.hotel_name || "Tenant");

    const segmentLabelMap: Record<string, string> = {
        admin: "Admin",
        settings: "Settings",
        products: "Products",
        finance: "Finance",
        platform: "Platform",
        hotel: "Hotel",
        maintenance: "Maintenance",
        dashboard: "Dashboard",
        users: "Users",
        roles: "Roles",
        hr: "HR",
        attendance: "Attendance",
        payroll: "Payroll",
        accounting: "Accounting"
    };

    const breadcrumbs = pathname
        .split("/")
        .filter(Boolean)
        .map((seg, idx, arr) => {
            const href = `/${arr.slice(0, idx + 1).join("/")}`;
            if (seg === "developer" && companyRoleScope === "admin") {
                return { href, label: "Admin" };
            }
            const mapped = segmentLabelMap[seg];
            const label = mapped || seg.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
            return { href, label };
        });

    useEffect(() => {
        setMounted(true);
        const savedMode = localStorage.getItem("workspace_mode");
        if (savedMode === "tenant" || savedMode === "platform") {
            setWorkspaceMode(savedMode);
        }

        // Mock IP fetch
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => setIpAddress(data.ip))
            .catch(() => setIpAddress('127.0.0.1'));

        // Close dropdowns on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setShowLangMenu(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleWorkspaceSwitch = (mode: "platform" | "tenant") => {
        setWorkspaceMode(mode);
        localStorage.setItem("workspace_mode", mode);
        if (mode === "platform") {
            window.location.href = "/admin/dashboard";
            return;
        }
        if (currentHotel) {
            window.location.href = "/";
            return;
        }
        window.location.href = "/select-hotel";
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.data.list);
            setUnreadCount(data.data.unread);
        } catch (e) {
            console.error("Failed to load notifications");
        }
    };

    useEffect(() => {
        if (user && currentHotel) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, currentHotel]);

    const markRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (e) { }
    };

    const markAllRead = async () => {
        try {
            await api.put(`/notifications/read-all`);
            fetchNotifications();
        } catch (e) { }
    };

    return (
        <header className={`h-16 fixed top-0 right-0 ${sidebarCollapsed ? 'left-20' : 'left-72'} bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 flex items-center justify-between px-6 transition-all duration-300`}>
            {/* Left: Sidebar Toggle & Search */}
            <div className="flex items-center gap-4 min-w-0">
                <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors">
                    <Menu size={20} />
                </button>
                <div className="hidden xl:flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${isPlatformWorkspace
                        ? "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-800"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800"
                        }`}>
                        {workspaceLabel}
                    </span>
                    {superAdminCanSwitchWorkspace && (
                        <select
                            value={workspaceMode}
                            onChange={(e) => handleWorkspaceSwitch(e.target.value as "platform" | "tenant")}
                            className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Switch workspace context"
                        >
                            <option value="platform">Platform</option>
                            <option value="tenant">Tenant</option>
                        </select>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{contextLabel}</span>
                    {breadcrumbs.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                            <ChevronRight size={12} />
                            {breadcrumbs.map((crumb, idx) => (
                                <span key={crumb.href} className="flex items-center gap-1 truncate">
                                    {idx > 0 && <ChevronRight size={12} />}
                                    <span className={idx === breadcrumbs.length - 1 ? "text-slate-700 dark:text-slate-200 font-semibold truncate" : "truncate"}>
                                        {crumb.label}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative hidden md:block group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Global Search..."
                        className="pl-10 pr-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 w-64 transition-all"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* IP Address */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
                    <Monitor size={12} className="text-emerald-500" />
                    <span className="tracking-wide">{ipAddress}</span>
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>

                {/* Font Size */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button onClick={decreaseFontSize} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400 transition-colors"><Type size={14} /></button>
                    <button onClick={increaseFontSize} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400 transition-colors"><Type size={18} /></button>
                </div>

                {/* Language / Currency Switcher */}
                {availableHotels.length > 1 && (
                    <Link
                        href="/select-hotel"
                        className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-xs font-semibold"
                        title="Switch branch context"
                    >
                        <Monitor size={14} />
                        Switch Branch
                    </Link>
                )}

                <div className="relative" ref={langRef}>
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        title="Language & Currency"
                    >
                        <Globe size={20} />
                    </button>

                    {showLangMenu && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 animate-in fade-in slide-in-from-top-2 z-50">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Language</h3>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {['en', 'hi', 'gu', 'mr', 'bn', 'ar'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => { setResult('language', lang); setShowLangMenu(false); }}
                                        className={`px-2 py-1.5 text-sm rounded-md transition-colors ${settings.language === lang ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        {lang === 'en' ? 'English' :
                                            lang === 'hi' ? 'हिंदी' :
                                                lang === 'gu' ? 'ગુજરાતી' :
                                                    lang === 'mr' ? 'मराठी' :
                                                        lang === 'bn' ? 'বাংলা' : 'العربية'}
                                    </button>
                                ))}
                            </div>

                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Currency</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['INR', 'USD', 'EUR', 'AED'].map(curr => (
                                    <button
                                        key={curr}
                                        onClick={() => { setResult('currency', curr); setShowLangMenu(false); }}
                                        className={`px-2 py-1.5 text-sm rounded-md transition-colors ${settings.currency === curr ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifMenu(!showNotifMenu)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 relative transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                        )}
                    </button>

                    {showNotifMenu && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800 dark:text-white">Notifications</h3>
                                <button onClick={markAllRead} className="text-xs text-blue-500 hover:underline">Mark all read</button>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">No notifications</div>
                                ) : (
                                    notifications.map((notif: any) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => markRead(notif.id)}
                                            className={`p-4 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 text-right">
                                                {new Date(notif.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative ml-1" ref={profileRef}>
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                {mounted ? (user?.name || 'User') : 'User'}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-500 font-bold">
                                {mounted ? (user?.role_name || 'Admin') : 'Admin'}
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden">
                            {mounted && user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                (mounted ? (user?.name?.charAt(0) || 'U') : 'U')
                            )}
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 md:hidden">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">{mounted ? user?.name : ''}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{mounted ? user?.email : ''}</p>
                            </div>

                            <Link
                                href="/profile"
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <User size={16} /> Profile
                            </Link>
                            <Link
                                href="/settings/roles"
                                onClick={() => setShowProfileMenu(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Settings size={16} /> Settings
                            </Link>
                            <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
