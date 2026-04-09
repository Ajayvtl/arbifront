"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LogOut, MapPin, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { IconMap } from "@/lib/iconMapping";
import { canViewModule, hasAnyPermission } from "@/lib/permissions";
import { useMemo, useState } from "react";
import { AppMenuItem, SUPER_ADMIN_MENU, TENANT_MENU, MLM_END_USER_MENU, COMPANY_ADMIN_MENU } from "@/lib/nav";

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user, availableHotels } = useAuth();
    const { sidebarCollapsed } = useTheme();
    const { settings, t } = useSettings();
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

    const toggleMenu = (name: string, currentState: boolean) => {
        setExpandedMenus(prev => ({ ...prev, [name]: !currentState }));
    };
    
    type SimRole = "off" | "platform_ops" | "platform_finance" | "tenant_manager";
    const [simRole, setSimRole] = useState<SimRole>("off");

    const simulationProfiles: Record<SimRole, { role_id: number; permissions: string[]; workspace: "platform" | "tenant" }> = useMemo(() => ({
        off: { role_id: user?.role_id || 0, permissions: user?.permissions || [], workspace: "platform" as const },
        platform_ops: {
            role_id: 99,
            permissions: ["menu.hotels", "menu.users", "menu.settings", "menu.admin_maintenance", "database.view", "database.manage", "packages.view"],
            workspace: "platform" as const
        },
        platform_finance: {
            role_id: 98,
            permissions: ["menu.finance_system", "finance_system.view", "finance_system.manage", "menu.accounting", "accounting.view"],
            workspace: "platform" as const
        },
        tenant_manager: {
            role_id: 97,
            permissions: ["menu.inventory", "menu.front_desk", "menu.finance_hotel", "menu.hr", "finance_hotel.view", "hr.view", "hr.manage_staff"],
            workspace: "tenant" as const
        }
    }), [user?.permissions, user?.role_id]);

    const effectiveUser = useMemo(() => {
        return user?.role_id === 1 && simRole !== "off"
            ? { ...user, role_id: simulationProfiles[simRole].role_id, permissions: simulationProfiles[simRole].permissions }
            : user;
    }, [user, simRole, simulationProfiles]);

    const effectiveWorkspace = useMemo(() => {
        const userWithHotel = user as (typeof user & { hotel_id?: number }) | null;
        if (user?.role_id === 1 && simRole !== "off") {
            return simulationProfiles[simRole].workspace;
        }
        return (user?.role_id === 1 || (!userWithHotel?.hotel_id && availableHotels.length === 0)) ? "platform" : "tenant";
    }, [user, simRole, simulationProfiles, availableHotels]);

    const menuItems = useMemo(() => {
        const isVisible = (item: AppMenuItem): boolean => {
            if (effectiveUser?.role_id === 1) return true; // Super Admin sees all

            if (Array.isArray(item.permissions) && item.permissions.length > 0) {
                if (!hasAnyPermission(effectiveUser, item.permissions)) return false;
            }

            // 1. Direct Module Check (Dynamic)
            if (item.module) {
                return canViewModule(effectiveUser, item.module);
            }

            // 2. Recursive Check (if no direct module)
            if (item.children) {
                return item.children.some((child: AppMenuItem) => isVisible(child));
            }

            // 3. Fallback / Public Items
            if (!item.module && !item.children) return true;

            return false;
        };

        const filterMenu = (menu: AppMenuItem[]): AppMenuItem[] => {
            return menu.reduce((acc: AppMenuItem[], item: AppMenuItem) => {
                if (isVisible(item)) {
                    const newItem = { ...item };
                    if (item.children) {
                        newItem.children = filterMenu(item.children); // Recursive filter
                        if (newItem.children.length === 0 && !newItem.href) {
                            return acc;
                        }
                    }
                    acc.push(newItem);
                }
                return acc;
            }, []);
        };

        if (effectiveUser?.role === "USER") return filterMenu(MLM_END_USER_MENU);
        if (effectiveUser?.role === "COMPANY_ADMIN") return filterMenu(COMPANY_ADMIN_MENU);
        if (effectiveWorkspace === "platform") return filterMenu(SUPER_ADMIN_MENU);
        return filterMenu(TENANT_MENU);
    }, [effectiveUser, effectiveWorkspace]);

    const settingsItems = [
        { name: "General", href: "/admin/settings/general", icon: "Settings", perm: "settings.view" },
        { name: "Departments", href: "/admin/settings/departments", icon: "Users", perm: "departments.view" },
        { name: "Notifications", href: "/admin/settings/notifications", icon: "Activity", perm: "notifications.view" },
    ].filter(item => {
        if (effectiveUser?.role === "USER") return false;
        if (effectiveUser?.role === "COMPANY_ADMIN") return false;
        // Keep super admin sidebar focused: dedicated platform menu already has required entries.
        if (effectiveUser?.role_id === 1) return false;
        return item.perm ? hasAnyPermission(effectiveUser, [item.perm, `menu.${item.perm.split('.')[0]}`]) : true;
    });

    const translateName = (name: string) => {
        if (!name) return "";
        const key = name.toLowerCase().replace(/ /g, '_').replace(/\(/g, '').replace(/\)/g, '');
        return t(key) !== key ? t(key) : name;
    };

    const renderMenuItem = (item: AppMenuItem, level: number = 0) => {
        // Check if any child is active (recursive)
        const isChildActiveRecursive = (currentItem: AppMenuItem): boolean => {
            if (currentItem.children) {
                return currentItem.children.some((child: AppMenuItem) =>
                    (child.href ? pathname.startsWith(child.href) : false) || isChildActiveRecursive(child)
                );
            }
            return false;
        };

        const isChildActive = isChildActiveRecursive(item);
        const isActive = item.exact
            ? pathname === item.href
            : (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && !item.children));

        // Base padding + level indentation
        const paddingLeftClass = level === 0 ? 'px-4' : level === 1 ? 'pl-12 pr-4' : 'pl-20 pr-4';

        // Resolve Icon
        const IconComponent = typeof item.icon === 'string' ? IconMap[item.icon] : null;
        let DefaultIcon = Shield;
        if (item.name === 'Finance') DefaultIcon = FileText;
        if (item.name === 'Logistics') DefaultIcon = MapPin;
        if (item.name === 'Admin') DefaultIcon = Shield;

        const iconElement = IconComponent ? <IconComponent size={level === 0 ? 22 : 18} /> : (item.icon || <DefaultIcon size={18} />);

        if (item.children) {
            const isExpanded = expandedMenus[item.name] !== undefined ? expandedMenus[item.name] : isChildActive;

            return (
                <div key={item.name} className="space-y-1">
                    <div
                        onClick={() => { if (!sidebarCollapsed) toggleMenu(item.name, isExpanded) }}
                        className={`flex items-center gap-4 ${paddingLeftClass} py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${!sidebarCollapsed ? 'cursor-pointer' : 'cursor-default'} ${isChildActive
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <span className={`relative z-10 ${isChildActive ? 'text-emerald-400' : ''}`}>
                            {iconElement}
                        </span>
                        {!sidebarCollapsed && <span className="relative z-10 font-medium tracking-wide whitespace-nowrap flex-1 select-none">{translateName(item.name)}</span>}
                        
                        {!sidebarCollapsed && (
                            <span className="relative z-10 text-slate-500">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                        )}
                    </div>

                    {!sidebarCollapsed && isExpanded && (
                        <div className="space-y-1 animate-in fade-in duration-200 slide-in-from-top-2">
                            {item.children.map((child: AppMenuItem) => renderMenuItem(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? translateName(item.name) : ''}
                className={`flex items-center gap-4 ${paddingLeftClass} py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/20"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
                <span className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {iconElement}
                </span>
                {!sidebarCollapsed && <span className="relative z-10 font-medium tracking-wide whitespace-nowrap">{translateName(item.name)}</span>}

                {/* Active Indicator */}
                {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>
                )}
            </Link>
        );
    };

    return (
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-slate-900 dark:bg-slate-950 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50 font-sans transition-all duration-300 border-r border-slate-800 dark:border-slate-900`}>
            {/* Logo Section */}
            <div className={`p-6 flex items-center gap-3 border-b border-slate-800/50 bg-slate-900/50 dark:bg-slate-950/50 backdrop-blur-xl ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 overflow-hidden">
                    {settings.logo ? (
                        <img src={settings.logo} alt={settings.brand_name} className="w-full h-full object-contain p-1" />
                    ) : (
                        <Shield className="text-emerald-600" size={24} />
                    )}
                </div>
                {!sidebarCollapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{settings.brand_name || 'HMIS Command Center'}</h1>
                        <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">{user?.role_name || 'Staff Member'}</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden py-6 custom-scrollbar">
                {(() => {
                    const sections = menuItems.reduce((acc: Record<string, AppMenuItem[]>, item) => {
                        const sectionKey = item.section || "Main Menu";
                        if (!acc[sectionKey]) acc[sectionKey] = [];
                        acc[sectionKey].push(item);
                        return acc;
                    }, {});
                    const sectionEntries = Object.entries(sections);

                    return sectionEntries.map(([section, items]) => (
                        <div key={section} className="space-y-2">
                            {!sidebarCollapsed && (
                                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    {translateName(section)}
                                </p>
                            )}
                            {items.map((item) => renderMenuItem(item))}
                        </div>
                    ));
                })()}

                <div className="mt-8 border-t border-slate-800/50 pt-4">
                    {user?.role_id === 1 && !sidebarCollapsed && (
                        <div className="px-4 mb-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role Simulation</p>
                            <select
                                value={simRole}
                                onChange={(e) => setSimRole(e.target.value as SimRole)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 px-2 py-2"
                                title="Menu preview only, does not change API access"
                            >
                                <option value="off">Off (Real Access)</option>
                                <option value="platform_ops">Platform Ops (Preview)</option>
                                <option value="platform_finance">Platform Finance (Preview)</option>
                                <option value="tenant_manager">Tenant Manager (Preview)</option>
                            </select>
                        </div>
                    )}
                    {!sidebarCollapsed && <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('settings')}</p>}
                    {settingsItems.map((item) => renderMenuItem(item))}
                </div>
            </nav>

            {/* User Profile / Logout */}
            <div className="p-3 border-t border-slate-800/50 bg-slate-900/50 dark:bg-slate-950/50 backdrop-blur-xl">
                <button
                    onClick={logout}
                    title={t('logout')}
                    className={`flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-200 group ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                        <LogOut size={20} />
                    </div>
                    {!sidebarCollapsed && <span className="font-medium whitespace-nowrap">{t('logout')}</span>}
                </button>
            </div>
        </aside>
    );
}
