"use client";

import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

const DialogContext = React.createContext<DialogProps>({
    open: false,
    onOpenChange: () => { },
    children: null
});

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange, children }}>
            {children}
        </DialogContext.Provider>
    );
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) {
    const { onOpenChange } = React.useContext(DialogContext);
    return (
        <div onClick={() => onOpenChange && onOpenChange(true)} className="inline-block cursor-pointer">
            {children}
        </div>
    );
}

export function DialogContent({ children, className }: { children: React.ReactNode, className?: string }) {
    const { open, onOpenChange } = React.useContext(DialogContext);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${className}`}>
                <button
                    onClick={() => onOpenChange && onOpenChange(false)}
                    className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-50"
                >
                    <X size={20} className="text-slate-500" />
                </button>
                {children}
            </div>
        </div>
    );
}
