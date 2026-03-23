"use client";

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    DragEndEvent,
    DragOverEvent,
    closestCorners
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { Clock, MoreHorizontal, User } from 'lucide-react';

const Card = ({ item, isOverlay = false }: any) => {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: item.id,
        data: {
            type: 'Task',
            item,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const overlayStyle = {
        cursor: 'grabbing',
        transform: CSS.Transform.toString(transform), // Keep position sync
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    };

    const priorityColor = {
        'critical': 'border-red-500 bg-red-50 dark:bg-red-900/10',
        'high': 'border-orange-500 bg-orange-50 dark:bg-orange-900/10',
        'normal': 'border-emerald-500 bg-white dark:bg-slate-800',
        'low': 'border-blue-500 bg-white dark:bg-slate-800'
    }[item.priority as string] || 'border-slate-200 bg-white dark:bg-slate-800';

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 p-4 rounded-xl border-2 border-dashed border-emerald-500 h-[100px] w-full bg-slate-100 dark:bg-slate-800"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={isOverlay ? overlayStyle : style}
            {...attributes}
            {...listeners}
            className={`
                relative p-4 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing w-full
                dark:border-slate-700
                ${priorityColor}
                ${isOverlay ? 'z-50 rotate-2 scale-105' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    {item.request_type}
                </span>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><MoreHorizontal size={16} /></button>
            </div>

            <h4 className="font-semibold text-slate-800 dark:text-white mb-1 line-clamp-1">{item.item_name}</h4>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                <User size={14} />
                <span className="truncate max-w-[80px]">{item.guest_name || 'Guest'}</span>
                <span className="text-slate-300">|</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Rm {item.room_number || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className={`flex items-center gap-1 text-xs font-medium ${item.priority === 'critical' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                    <Clock size={12} />
                    {item.sla_minutes} min SLA
                </div>
            </div>
        </div>
    );
};


const Column = ({ id, title, items }: any) => {
    // We sort by ID to prevent jitter
    const itemIds = items.map((i: any) => i.id);

    // Using useSortable even for Column to allow it to recognize drops
    const { setNodeRef } = useSortable({
        id: id,
        data: {
            type: 'Column',
            accepts: ['Task'],
        },
    });

    return (
        <div ref={setNodeRef} className="flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl w-[320px] shrink-0 border border-slate-200 dark:border-slate-800 backdrop-blur-sm h-full max-h-full">
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{title}</h3>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
                </div>
            </div>
            <div className="p-3 flex-1 overflow-y-auto">
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 min-h-[100px]">
                        {items.map((item: any) => (
                            <Card key={item.id} item={item} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};

export default function KanbanBoard({ initialData, onStatusChange }: any) {
    // Local state for smooth drag, we sync with props on DragEnd
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        setItems(initialData);
    }, [initialData]);

    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find containers
        const activeItem = items.find(i => i.id === activeId);
        const overItem = items.find(i => i.id === overId);

        if (!activeItem) return;

        const activeContainer = activeItem.status;
        // If we drift over a column directly (id = open, in_progress, etc)
        const overContainer = overItem ? overItem.status : (['open', 'in_progress', 'resolved'].includes(overId as string) ? overId : null);

        if (!overContainer || activeContainer === overContainer) {
            return;
        }

        // Move item to new container visually immediately
        setItems((prev) => {
            return prev.map(item =>
                item.id === activeId ? { ...item, status: overContainer } : item
            );
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeItemStr = items.find(i => i.id === active.id);
        // The item status is already updated by DragOver? 
        // Yes, if we use handleDragOver logic correctly.
        // But for safety, let's verify.

        if (activeItemStr) {
            onStatusChange(active.id, activeItemStr.status);
        }
    };

    // Filter for rendering
    const columns = {
        'open': items.filter((i: any) => i.status === 'open'),
        'in_progress': items.filter((i: any) => i.status === 'in_progress'),
        'resolved': items.filter((i: any) => i.status === 'resolved'),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 overflow-x-auto pb-4 h-full items-start">
                <Column id="open" title="To Do" items={columns.open} />
                <Column id="in_progress" title="In Progress" items={columns.in_progress} />
                <Column id="resolved" title="Done" items={columns.resolved} />
            </div>

            {createPortal(
                <DragOverlay>
                    {activeId ? (
                        <Card item={items.find((i: any) => i.id === activeId)} isOverlay />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
