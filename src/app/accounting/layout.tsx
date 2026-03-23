"use client";

import { ReactNode } from 'react';

export default function AccountingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {children}
        </div>
    );
}
