"use client";

import { useEffect, useState } from "react";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import Toolbox, { DraggableItem } from "@/components/invoice-builder/Toolbox";
import Canvas, { BuilderElement } from "@/components/invoice-builder/Canvas";
import PropertiesPanel from "@/components/invoice-builder/PropertiesPanel";

export default function InvoiceBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const [template, setTemplate] = useState<any>(null);
    const [components, setComponents] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeDragItem, setActiveDragItem] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        if (params.id) fetchTemplate(params.id as string);
    }, [params.id]);

    const fetchTemplate = async (id: string) => {
        try {
            const res = await api.get(`/system/finance/templates/${id}`);
            setTemplate(res.data.data);
            // Parse Layout JSON or init empty
            const layout = res.data.data.layout_json || {};
            // If new/empty, maybe seed basic
            if (layout.components) {
                setComponents(layout.components);
            } else {
                setComponents([
                    { id: 'h-1', type: 'header' },
                    { id: 'd-1', type: 'details' },
                    { id: 'i-1', type: 'items' }
                ]);
            }
        } catch (error) {
            toast.error("Failed to load template");
        }
    };

    const handleDragStart = (event: any) => {
        const { active } = event;
        // Determine if dragging existing component or toolbox item
        if (active.data.current?.isToolboxItem) {
            setActiveDragItem({ type: 'toolbox', ...active.data.current });
        } else {
            const comp = components.find(c => c.id === active.id);
            setActiveDragItem({ type: 'sortable', ...comp });
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        // 1. Dragging from Toolbox to Canvas
        if (active.data.current?.isToolboxItem && over.id === 'canvas') {
            const newItem = {
                id: `${active.data.current.type}-${Date.now()}`,
                type: active.data.current.type,
                data: {}
            };
            setComponents((items) => [...items, newItem]);
            return;
        }

        // 2. Reordering in Canvas
        if (active.id !== over.id) {
            setComponents((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/system/finance/templates/${template.id}`, {
                ...template,
                layout_json: { components }
            });
            toast.success("Template saved");
        } catch (error) {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (!template) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Top Bar */}
            <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="font-bold text-slate-800 dark:text-white">{template.name}</h1>
                        <p className="text-xs text-slate-400">Drag and drop components to build layout</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white gap-2">
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Template
                </Button>
            </div>

            {/* Builder Area */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 flex overflow-hidden">
                    <Toolbox />
                    <Canvas
                        components={components}
                        setComponents={setComponents}
                        selectedId={selectedId}
                        setSelectedId={setSelectedId}
                    />
                    <PropertiesPanel
                        selectedId={selectedId}
                        components={components}
                        setComponents={setComponents}
                    />
                </div>

                <DragOverlay>
                    {activeDragItem ? (
                        activeDragItem.type === 'toolbox' ? (
                            <div className="p-3 bg-white border border-emerald-500 rounded shadow-lg opacity-80 w-48">
                                Dragging {activeDragItem.type}
                            </div>
                        ) : (
                            <div className="p-4 bg-white border border-emerald-500 rounded opacity-80 w-64">
                                {activeDragItem.type.toUpperCase()} Component
                            </div>
                        )
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
