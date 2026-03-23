"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function LayoutContent({ children, isAuthPage }: { children: React.ReactNode, isAuthPage: boolean }) {
    const { sidebarCollapsed } = useTheme();
    const { token, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !token && !isAuthPage) {
            router.replace('/login');
        }
    }, [isLoading, token, isAuthPage, router]);

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
            </div>
        );
    }

    // Prevent flashing of protected content
    if (!token && !isAuthPage) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {!isAuthPage && <Sidebar />}
            {!isAuthPage && <TopNavbar />}
            <main className={`${!isAuthPage ? (sidebarCollapsed ? 'ml-20' : 'ml-72') : ''} ${!isAuthPage ? 'mt-16' : ''} min-h-screen transition-all duration-300`}>
                {children}
            </main>
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/register';

    return (
        <ThemeProvider>
            <LayoutContent isAuthPage={isAuthPage}>
                {children}
            </LayoutContent>
        </ThemeProvider>
    );
}
