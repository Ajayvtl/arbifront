import React from 'react';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 m-8">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <Construction className="text-slate-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h1>
            <p className="text-slate-500 max-w-md">
                This module is currently under development as part of the Phase 4 rollout.
                Check back soon for updates.
            </p>
        </div>
    );
}
