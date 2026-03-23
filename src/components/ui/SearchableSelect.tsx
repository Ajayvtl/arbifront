"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming cn is available since clsx/tailwind-merge are in package.json

interface Option {
    value: string | number;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: any) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    label,
    className,
    disabled = false
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value == value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.subLabel?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={cn("flex flex-col gap-1.5 w-full", className)} ref={wrapperRef}>
            {label && (
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    className={cn(
                        "flex items-center justify-between w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white cursor-pointer transition-all",
                        disabled && "opacity-50 cursor-not-allowed",
                        !disabled && "hover:border-slate-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    )}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                >
                    <span className={cn("truncate", !selectedOption && "text-slate-400")}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown size={16} className="text-slate-400" />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-white"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">No results found</div>
                            ) : (
                                filteredOptions.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={cn(
                                            "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:text-slate-200",
                                            opt.value == value && "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium"
                                        )}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearch("");
                                        }}
                                    >
                                        <div className="flex flex-col">
                                            <span>{opt.label}</span>
                                            {opt.subLabel && <span className="text-xs text-slate-500 dark:text-slate-400">{opt.subLabel}</span>}
                                        </div>
                                        {opt.value == value && <Check size={16} className="text-emerald-600" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
