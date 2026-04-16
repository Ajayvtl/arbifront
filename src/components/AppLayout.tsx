"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function LayoutContent({
    children,
    isAuthPage,
    pathname,
}: {
    children: React.ReactNode;
    isAuthPage: boolean;
    pathname: string;
}) {
    const { sidebarCollapsed } = useTheme();
    const { token, isLoading } = useAuth();
    const router = useRouter();
    const shouldHideNavigation = isAuthPage || pathname.startsWith('/dapp');

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const hasStoredToken = mounted && Boolean(localStorage.getItem('token'));

    useEffect(() => {
        if (!mounted || isLoading) return;
        
        if (!token && !hasStoredToken && !isAuthPage) {
            if (pathname.startsWith('/dapp')) {
                router.replace('/dapp/login');
                return;
            }
            if (pathname.startsWith('/developer')) {
                router.replace('/backend/login');
                return;
            }
            router.replace('/backend/login');
        }
    }, [isLoading, token, hasStoredToken, isAuthPage, pathname, router, mounted]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
            </div>
        );
    }

    // Prevent flashing of protected content only after mounting to avoid hydration mismatch
    if (mounted && !token && !hasStoredToken && !isAuthPage) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {!shouldHideNavigation && <Sidebar />}
            {!shouldHideNavigation && <TopNavbar />}
            <main className={`${!shouldHideNavigation ? (sidebarCollapsed ? 'ml-20' : 'ml-72') : ''} ${!shouldHideNavigation ? 'mt-16' : ''} min-h-screen transition-all duration-300`}>
                {children}
            </main>
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage =
        pathname === '/login' ||
        pathname === '/backend/login' ||
        pathname === '/developer/login' ||
        pathname === '/register' ||
        pathname === '/dapp/login';

    return (
        <ThemeProvider>
            <LayoutContent isAuthPage={isAuthPage} pathname={pathname}>
                {children}
            </LayoutContent>
        </ThemeProvider>
    );
}
