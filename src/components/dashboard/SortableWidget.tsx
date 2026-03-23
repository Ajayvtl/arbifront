import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XMarkIcon, Squares2X2Icon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

type SortableWidgetProps = {
    item: any;
    index: number;
    removeWidget: (index: number) => void;
    updateWidgetSize: (index: number, size: { w: number; h: number }) => void;
};

export function SortableWidget({ item, index, removeWidget, updateWidgetSize }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.uniqueId || item.widget_id }); // Ensure unique ID for DnD

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1
    };

    const toggleSize = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Prevent drag start
        // Simple toggle for now: 1x1 -> 2x1 -> 2x2 -> 1x1
        const w = item.layout_config?.w || 1;
        const h = item.layout_config?.h || 1;

        let newW = w, newH = h;
        if (w === 1 && h === 1) { newW = 2; newH = 1; }
        else if (w === 2 && h === 1) { newW = 2; newH = 2; }
        else if (w === 2 && h === 2) { newW = 4; newH = 1; } // Full width
        else { newW = 1; newH = 1; }

        updateWidgetSize(index, { w: newW, h: newH });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-center items-center group cursor-grab active:cursor-grabbing hover:border-emerald-500 transition-colors
                ${item.layout_config?.w ? `col-span-${item.layout_config.w}` : 'col-span-1'}
                ${item.layout_config?.h ? `row-span-${item.layout_config.h}` : 'row-span-1'}
            `}
        >
            {/* Delete Button */}
            <button
                onClick={(e) => { e.stopPropagation(); removeWidget(index); }}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded z-10"
            >
                <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Resize Button */}
            <button
                onClick={toggleSize}
                className="absolute bottom-2 right-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-50 rounded z-10"
                title="Resize Widget"
            >
                <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>

            <Squares2X2Icon className="w-8 h-8 text-gray-300 mb-2 pointer-events-none" />
            <span className="text-sm font-medium text-gray-900 dark:text-white text-center pointer-events-none">{item.name}</span>
            <span className="text-xs text-gray-400 mt-1 uppercase pointer-events-none">{item.type}</span>
            <div className="mt-2 text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded pointer-events-none">
                {item.layout_config?.w || 1}x{item.layout_config?.h || 1}
            </div>
        </div>
    );
}
