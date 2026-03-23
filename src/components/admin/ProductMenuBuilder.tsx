"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Check, EyeOff, LayoutTemplate, Pencil } from "lucide-react";
import { TENANT_MENU, SUPER_ADMIN_MENU } from "@/lib/nav";

interface MenuBuilderProps {
    config: any;
    setConfig: (config: any) => void;
    availableModules: string[];
    isSystemTemplate?: boolean;
}

export default function ProductMenuBuilder({ config, setConfig, availableModules, isSystemTemplate = false }: MenuBuilderProps) {
    const [baseMenu, setBaseMenu] = useState<any[]>([]);

    useEffect(() => {
        // 1. Load Base Menu Structure
        // For now, we defaults to TENANT_MENU (Hotel Context) unless specified otherwise.
        // Ideally, we might want to let the user Choose "Base Structure".
        const source = isSystemTemplate ? SUPER_ADMIN_MENU : TENANT_MENU;

        // 2. Merge with existing config if present
        // If config.items exists, it means we have saved state.
        // But for a visual builder, we often want to show "All Possible Items" and let user toggle them.

        // Strategy:
        // - Flatten the Source Menu
        // - Map to Config State (visible: true/false, label_override: string)

        if (!config?.items || config.items.length === 0) {
            // First time init: Copy structure
            const initConfig = source.map(item => ({
                slug: item.name.toLowerCase().replace(/ /g, '_'),
                original_name: item.name,
                visible: true,
                children: item.children ? item.children.map((child: any) => ({
                    slug: child.name.toLowerCase().replace(/ /g, '_'),
                    original_name: child.name,
                    visible: true
                })) : []
            }));
            setConfig({ items: initConfig });
        }
    }, []);

    const toggleItem = (index: number, childIndex: number | null = null) => {
        const newItems = [...(config?.items || [])];
        if (childIndex !== null) {
            newItems[index].children[childIndex].visible = !newItems[index].children[childIndex].visible;
        } else {
            newItems[index].visible = !newItems[index].visible;
        }
        setConfig({ ...config, items: newItems });
    };

    const updateLabel = (index: number, childIndex: number | null, value: string) => {
        const newItems = [...(config?.items || [])];
        if (childIndex !== null) {
            newItems[index].children[childIndex].label_override = value;
        } else {
            newItems[index].label_override = value;
        }
        setConfig({ ...config, items: newItems });
    };

    if (!config?.items) return <div>Initializing Menu Builder...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold mb-4">Nav Structure & Visibility</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between text-xs font-semibold text-slate-500 uppercase">
                    <span>Menu Item</span>
                    <span className="pr-4">Custom Label (Optional)</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {config.items.map((item: any, i: number) => (
                        <MenuItemRow
                            key={i}
                            item={item}
                            index={i}
                            onToggle={() => toggleItem(i)}
                            onChangeLabel={(v: string) => updateLabel(i, null, v)}
                            onChildToggle={(childIndex: number) => toggleItem(i, childIndex)}
                            onChildChangeLabel={(childIndex: number, v: string) => updateLabel(i, childIndex, v)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function MenuItemRow({ item, index, onToggle, onChangeLabel, onChildToggle, onChildChangeLabel }: any) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className={`transition-colors ${!item.visible ? 'opacity-50' : ''}`}>
            {/* Parent Row */}
            <div className="flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center flex-1 gap-3">
                    <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-600">
                        {item.children?.length > 0 && (expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                    </button>

                    <button
                        onClick={onToggle}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${item.visible ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                    >
                        {item.visible ? <Check size={14} /> : <EyeOff size={14} />}
                    </button>

                    <span className={`font-medium ${!item.visible && 'line-through text-slate-400'}`}>
                        {item.original_name}
                    </span>
                </div>

                <div className="w-1/3">
                    <input
                        type="text"
                        placeholder={item.original_name}
                        value={item.label_override || ''}
                        onChange={(e) => onChangeLabel(e.target.value)}
                        className="w-full text-sm p-1.5 rounded border border-slate-200 dark:border-slate-600 bg-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Children */}
            {expanded && item.children?.length > 0 && (
                <div className="bg-slate-50/50 dark:bg-slate-900/20 pl-10 pr-3 pb-2 border-l-2 border-slate-100 dark:border-slate-700 ml-4 mb-2">
                    {item.children.map((child: any, cIndex: number) => (
                        <div key={cIndex} className={`flex items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 ${!child.visible && 'opacity-60'}`}>
                            <div className="flex items-center flex-1 gap-3">
                                <button
                                    onClick={() => onChildToggle(cIndex)}
                                    className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${child.visible ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                                >
                                    {child.visible ? <Check size={12} /> : <EyeOff size={12} />}
                                </button>
                                <span className={`text-sm ${!child.visible && 'line-through text-slate-400'}`}>
                                    {child.original_name}
                                </span>
                            </div>
                            <div className="w-1/3">
                                <input
                                    type="text"
                                    placeholder={child.original_name}
                                    value={child.label_override || ''}
                                    onChange={(e) => onChildChangeLabel(cIndex, e.target.value)}
                                    className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-600 bg-transparent focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
