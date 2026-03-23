"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, GripVertical, Settings } from "lucide-react";

// Individual Builder Element
export function BuilderElement({ id, component, onSelect, onDelete, isSelected }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Width Class Mapping
    const widthClass: any = {
        '100%': 'w-full',
        '50%': 'w-1/2',
        '33%': 'w-1/3',
        '66%': 'w-2/3',
        '25%': 'w-1/4'
    };
    const currentWidth = component.data?.width || '100%';
    const finalWidthClass = widthClass[currentWidth] || 'w-full';

    const renderContent = () => {
        switch (component.type) {
            case 'logo':
                return <div className="h-16 w-32 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-xs text-slate-400">LOGO</div>;
            case 'header':
                return <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">INVOICE</h1>;
            case 'details':
                return (
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-500">
                        <div>Invoice #: INV-001</div>
                        <div>Date: Jan 01, 2026</div>
                    </div>
                );
            case 'billTo':
                return (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</div>
                        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                );
            case 'items':
                return (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900">
                            <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Amount</th></tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <td className="p-2">Sample Item</td>
                                <td className="p-2 text-right">$0.00</td>
                            </tr>
                        </tbody>
                    </table>
                );
            case 'payment':
                return (
                    <div className="text-xs text-slate-500">
                        <p className="font-bold mb-1">Payment Details</p>
                        <p>Bank: Example Bank</p>
                    </div>
                );
            case 'footer':
                return <div className="text-center text-xs text-slate-400 mt-4 border-t pt-4">Thank you for your business.</div>;
            case 'spacer':
                return <div className="h-10 w-full bg-slate-50 dark:bg-slate-900 border-dashed border border-slate-300 rounded flex items-center justify-center text-xs text-slate-400">Spacer</div>;
            case 'divider':
                return <hr className="border-slate-200 dark:border-slate-700 my-4" />;
            default:
                return <div>Unknown Component</div>;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group p-4 border rounded-lg mb-4 transition-all ${finalWidthClass} ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 z-10' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
            {/* Controls */}
            <div className={`absolute right-2 top-2 z-20 flex gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <button
                    className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow border border-slate-200 dark:border-slate-700 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                    <Trash2 size={14} />
                </button>
                <div
                    {...listeners}
                    {...attributes}
                    className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                >
                    <GripVertical size={14} />
                </div>
            </div>

            {renderContent()}
        </div>
    );
}

export default function Canvas({ components, setComponents, selectedId, setSelectedId }: any) {
    const { setNodeRef } = useDroppable({ id: 'canvas' });

    const handleDelete = (id: string) => {
        setComponents((prev: any[]) => prev.filter(c => c.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    return (
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 p-8 overflow-y-auto flex justify-center">
            <div
                ref={setNodeRef}
                className="w-full max-w-[210mm] min-h-[297mm] bg-white dark:bg-slate-950 shadow-xl print:shadow-none p-10 flex flex-wrap content-start"
                onClick={() => setSelectedId(null)} // Deselect on click outside
            >
                {components.length === 0 && (
                    <div className="w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-10">
                        <p className="text-slate-400 text-sm">Drag components here</p>
                    </div>
                )}

                <SortableContext items={components.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
                    {components.map((component: any) => (
                        <BuilderElement
                            key={component.id}
                            id={component.id}
                            component={component}
                            isSelected={selectedId === component.id}
                            onSelect={() => setSelectedId(component.id)}
                            onDelete={() => handleDelete(component.id)}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
