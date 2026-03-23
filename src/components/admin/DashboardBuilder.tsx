"use client";
import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { SortableWidget } from '@/components/dashboard/SortableWidget';
import api from '@/lib/api';

export default function DashboardBuilder({
    widgets: controlledWidgets,
    initialWidgets = [],
    availableWidgets, // Optional: if provided, use it. If not, fetch.
    onChange,
    selectedPermissions = []
}: any) {
    // Local state for uncontrolled or hybrid usage
    const [localWidgets, setLocalWidgets] = useState<any[]>(initialWidgets || []);
    const [localLibrary, setLocalLibrary] = useState<any[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);

    // If availableWidgets prop is missing/undefined, we handle fetching.
    // If it's passed (even empty array), we use it.
    const shouldFetchLibrary = availableWidgets === undefined;

    useEffect(() => {
        if (shouldFetchLibrary) {
            setLoadingLibrary(true);
            api.get('/admin/dashboard/widgets')
                .then(res => setLocalLibrary(res.data.data || []))
                .catch(err => console.error("Failed to fetch widgets", err))
                .finally(() => setLoadingLibrary(false));
        }
    }, [shouldFetchLibrary]);

    const library = availableWidgets || localLibrary;

    // Filter library based on permissions
    const filteredLibrary = selectedPermissions.length > 0
        ? library.filter((w: any) => {
            if (!w.module) return true;
            const moduleSlug = w.module;
            return selectedPermissions.some((p: string) => p.startsWith(moduleSlug) || p === `menu.${moduleSlug}`);
        })
        : library;

    // Determine applied widgets (Controlled vs Uncontrolled)
    const assignedWidgets = controlledWidgets || localWidgets;

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const updateWidgets = (newWidgets: any[]) => {
        if (onChange) {
            onChange(newWidgets);
        } else {
            setLocalWidgets(newWidgets);
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = assignedWidgets.findIndex((i: any) => (i.uniqueId || i.id) === active.id);
            const newIndex = assignedWidgets.findIndex((i: any) => (i.uniqueId || i.id) === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(assignedWidgets, oldIndex, newIndex);
                updateWidgets(newOrder);
            }
        }
    };

    const addWidget = (widget: any) => {
        const uniqueId = `${widget.key}-${Date.now()}`;
        const newWidget = {
            ...widget,
            uniqueId: uniqueId,
            id: uniqueId, // Fallback
            widget_id: widget.id, // Reference to source widget
            layout_config: widget.default_size || { w: 1, h: 1 }
        };
        const newState = [...assignedWidgets, newWidget];
        updateWidgets(newState);
    };

    const removeWidget = (index: number) => {
        const newWidgets = [...assignedWidgets];
        newWidgets.splice(index, 1);
        updateWidgets(newWidgets);
    };

    const updateWidgetSize = (index: number, newSize: any) => {
        const newWidgets = [...assignedWidgets];
        newWidgets[index] = { ...newWidgets[index], layout_config: newSize };
        updateWidgets(newWidgets);
    };

    return (
        <div className="flex h-full min-h-[500px]">
            {/* Sidebar: Available Widgets */}
            <div className="w-1/4 min-w-[250px] border-r border-slate-200 dark:border-slate-700 p-4 overflow-y-auto bg-gray-50 dark:bg-slate-900/50">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Available Widgets</h3>

                {loadingLibrary && <div className="text-xs text-center p-4">Loading widgets...</div>}

                <div className="space-y-3">
                    {filteredLibrary.map((widget: any) => (
                        <div key={widget.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors group"
                            onClick={() => addWidget(widget)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Squares2X2Icon className="w-4 h-4 text-gray-400 group-hover:text-emerald-500" />
                                    <span className="text-sm font-medium dark:text-gray-200">{widget.name}</span>
                                </div>
                                <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-emerald-500" />
                            </div>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{widget.description}</p>
                        </div>
                    ))}
                    {!loadingLibrary && filteredLibrary.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-4">No widgets available.</p>
                    )}
                </div>
            </div>

            {/* Main Area: Canvas */}
            <div className="flex-1 p-8 bg-slate-100 dark:bg-slate-950 overflow-y-auto">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={assignedWidgets.map((w: any) => w.uniqueId || w.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-4 gap-4 max-w-6xl mx-auto auto-rows-[150px]">
                            {assignedWidgets.map((widget: any, index: number) => (
                                <SortableWidget
                                    key={widget.uniqueId || widget.id} // Must match id passed to SortableContext
                                    item={widget}
                                    index={index}
                                    removeWidget={removeWidget}
                                    updateWidgetSize={updateWidgetSize}
                                />
                            ))}
                            {assignedWidgets.length === 0 && (
                                <div className="col-span-4 h-64 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-gray-400">
                                    Drag and drop widgets here
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}
