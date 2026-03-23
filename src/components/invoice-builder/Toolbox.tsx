"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Type, Image, AlignJustify, GripVertical, Table, Layout, CreditCard } from "lucide-react";

const TOOLBOX_ITEMS = [
    { id: 'logo', type: 'logo', icon: Image, label: "Company Logo" },
    { id: 'header', type: 'header', icon: Type, label: "Invoice Title" },
    { id: 'details', type: 'details', icon: Layout, label: "Invoice Details (No, Date)" },
    { id: 'billTo', type: 'billTo', icon: AlignJustify, label: "Bill To / Ship To" },
    { id: 'items', type: 'items', icon: Table, label: "Line Items Table" },
    { id: 'payment', type: 'payment', icon: CreditCard, label: "Payment Info" },
    { id: 'footer', type: 'footer', icon: Type, label: "Footer / Notes" },
    { id: 'spacer', type: 'spacer', icon: Layout, label: "Spacer (Empty)" },
    { id: 'divider', type: 'divider', icon: AlignJustify, label: "Divider Line" },
];

export function DraggableItem({ id, icon: Icon, label }: any) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `toolbox-${id}`,
        data: { type: id, isToolboxItem: true }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm cursor-grab hover:border-emerald-500 hover:shadow-md transition-all mb-2"
        >
            <GripVertical size={16} className="text-slate-400" />
            <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded text-emerald-600">
                <Icon size={18} />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        </div>
    );
}

export default function Toolbox() {
    return (
        <div className="w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 h-full overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Components</h3>
            <div className="space-y-1">
                {TOOLBOX_ITEMS.map((item) => (
                    <DraggableItem key={item.id} {...item} />
                ))}
            </div>

            <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                <h4 className="text-emerald-800 dark:text-emerald-400 font-semibold mb-1">Drag & Drop</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    Drag items from here onto the canvas to build your invoice layout.
                </p>
            </div>
        </div>
    );
}
