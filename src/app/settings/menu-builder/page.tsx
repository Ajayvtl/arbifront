"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Shield, Plus, Save, GripVertical, Trash2, Smartphone } from "lucide-react";
import { IconMap } from "@/lib/iconMapping";

// Components
// SortableItem now accepts onChildDelete
function SortableItem({ id, item, onDelete, onEdit, onChildDelete, children }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = IconMap[item.icon] || Shield;

    return (
        <div ref={setNodeRef} style={style} className="bg-slate-800 rounded-lg mb-2 border border-slate-700">
            <div className="flex items-center p-3 gap-3">
                <div {...attributes} {...listeners} className="cursor-grab text-slate-500 hover:text-white">
                    <GripVertical size={20} />
                </div>
                <div className="p-2 bg-slate-700 rounded-md">
                    <Icon size={18} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.href || "Group"}</p>
                </div>
                <button onClick={() => onDelete(id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded">
                    <Trash2 size={18} />
                </button>
            </div>
            {/* Render children if any */}
            {item.children && (
                <div className="space-y-2 mt-2 border-l-2 border-slate-600 pl-4 pr-3 pb-3">
                    {item.children.map((child: any) => (
                        <div key={child.name} className="flex items-center gap-2 text-sm text-slate-400 p-2 bg-slate-800 rounded justify-between group/child">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                                {child.name}
                            </div>
                            <button
                                onClick={() => onChildDelete(item.name, child.name)}
                                className="text-red-400 hover:text-red-300 opacity-0 group-hover/child:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function MenuBuilderPage() {
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        api.get('/users/roles').then(res => {
            if (res.data && res.data.data) {
                setRoles(res.data.data);
            }
        });
    }, []);

    useEffect(() => {
        if (selectedRoleId) {
            setLoading(true);
            api.get(`/menus/${selectedRoleId}`)
                .then(res => {
                    let items = res.data.data;
                    if (typeof items === 'string') {
                        try {
                            items = JSON.parse(items);
                        } catch (e) {
                            console.error("Failed to parse menu items string", e);
                            items = [];
                        }
                    }

                    if (Array.isArray(items)) {
                        setMenuItems(items);
                    } else {
                        console.warn("API returned non-array for menu items:", res.data);
                        setMenuItems([]);
                    }
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Failed to load menu");
                    setMenuItems([]);
                })
                .finally(() => setLoading(false));
        }
    }, [selectedRoleId]);

    const handleSave = async () => {
        if (!selectedRoleId) return;
        try {
            await api.post(`/menus/${selectedRoleId}`, { structure: menuItems });
            toast.success("Menu saved successfully");
        } catch (error) {
            toast.error("Failed to save menu");
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setMenuItems((items) => {
                const oldIndex = items.findIndex(i => i.name === active.id); // Simple ID matching by name for now
                const newIndex = items.findIndex(i => i.name === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Helper to add mock item
    const addItem = () => {
        const newItem = {
            name: `New Item ${menuItems.length + 1}`,
            href: "/new",
            icon: "Shield"
        };
        setMenuItems([...menuItems, newItem]);
    };

    const handleChildDelete = (parentName: string, childName: string) => {
        setMenuItems(items => items.map(item => {
            if (item.name === parentName && item.children) {
                return {
                    ...item,
                    children: item.children.filter((child: any) => child.name !== childName)
                };
            }
            return item;
        }));
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-white">Menu Builder</h1>

            <div className="flex gap-4 mb-8">
                <select
                    className="bg-slate-800 border-none text-white rounded-lg p-3 w-64"
                    onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                    value={selectedRoleId || ""}
                >
                    <option value="" disabled>Select Role</option>
                    {roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>

                <button
                    onClick={handleSave}
                    disabled={!selectedRoleId}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50"
                >
                    <Save size={20} /> Save Changes
                </button>
            </div>

            {loading ? (
                <div className="text-white">Loading...</div>
            ) : selectedRoleId ? (
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={Array.isArray(menuItems) ? menuItems.map(i => i.name) : []} strategy={verticalListSortingStrategy}>
                            {menuItems?.map((item) => (
                                <SortableItem
                                    key={item.name}
                                    id={item.name}
                                    item={item}
                                    onDelete={(id: string) => setMenuItems(items => items.filter(i => i.name !== id))}
                                    onChildDelete={handleChildDelete}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    <button onClick={addItem} className="mt-4 w-full py-3 border-2 border-dashed border-slate-700 text-slate-500 rounded-lg hover:border-emerald-500 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2">
                        <Plus size={20} /> Add Item
                    </button>
                </div>
            ) : (
                <div className="text-slate-500 text-center py-20 bg-slate-900 rounded-xl border border-slate-800">
                    Select a role to edit its menu
                </div>
            )}
        </div>
    );
}
