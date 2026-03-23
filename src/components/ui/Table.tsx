import React from 'react';

export function Table({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    {children}
                </table>
            </div>
        </div>
    );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
    return (
        <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                {children}
            </tr>
        </thead>
    );
}

export function TableHead({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) {
    return (
        <th className={`px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${className}`} {...props}>
            {children}
        </th>
    );
}

export function TableBody({ children }: { children: React.ReactNode }) {
    return (
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {children}
        </tbody>
    );
}

export function TableRow({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement> & { children: React.ReactNode }) {
    return (
        <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group ${className}`} {...props}>
            {children}
        </tr>
    );
}

export function TableCell({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) {
    return (
        <td className={`px-6 py-4 ${className}`} {...props}>
            {children}
        </td>
    );
}
