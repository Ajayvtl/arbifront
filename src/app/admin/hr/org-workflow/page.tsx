"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type OrgNode = {
    node_key: string;
    node_name: string;
    node_type: string;
    parent_node_key?: string | null;
    position_order: number;
    role_id?: number | null;
    department_id?: number | null;
    is_active?: boolean;
};

type FlowStage = { stage: number; actor: string; action: string; sla_hours: number };
type Flow = {
    id?: number;
    process_key: string;
    name: string;
    request_type: string;
    stage_chain: FlowStage[];
    escalation_sla_hours: number;
    auto_escalate: boolean;
};

function SortableNode({
    node,
    onName
}: {
    node: OrgNode;
    onName: (key: string, name: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.node_key });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                    <input
                        className="w-full bg-transparent font-semibold outline-none"
                        value={node.node_name}
                        onChange={(e) => onName(node.node_key, e.target.value)}
                    />
                    <p className="text-xs text-slate-500">{node.node_type}</p>
                </div>
                <button
                    className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700"
                    {...attributes}
                    {...listeners}
                >
                    Drag
                </button>
            </div>
        </div>
    );
}

export default function OrgWorkflowPage() {
    const [nodes, setNodes] = useState<OrgNode[]>([]);
    const [flows, setFlows] = useState<Flow[]>([]);
    const [useCases, setUseCases] = useState<any[]>([]);
    const [inbox, setInbox] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor));

    const nodeIds = useMemo(() => nodes.map((n) => n.node_key), [nodes]);

    const loadAll = async () => {
        try {
            const [h, f, u] = await Promise.all([
                api.get("/org-workflow/hierarchy"),
                api.get("/org-workflow/flows"),
                api.get("/org-workflow/use-cases")
            ]);

            const serverNodes = (h.data?.data || []) as OrgNode[];
            setNodes(serverNodes.length ? serverNodes : [
                { node_key: "owner", node_name: "Owner", node_type: "owner", position_order: 0 },
                { node_key: "department", node_name: "Department", node_type: "department", parent_node_key: "owner", position_order: 1 },
                { node_key: "department_head", node_name: "Department Head", node_type: "department_head", parent_node_key: "department", position_order: 2 },
                { node_key: "custom_role", node_name: "Custom Role", node_type: "custom_role", parent_node_key: "department_head", position_order: 3 },
                { node_key: "custom_supervisor", node_name: "Custom Supervisor", node_type: "custom_supervisor", parent_node_key: "custom_role", position_order: 4 },
                { node_key: "staff", node_name: "Staff", node_type: "staff", parent_node_key: "custom_supervisor", position_order: 5 }
            ]);
            setFlows((f.data?.data || []) as Flow[]);
            setUseCases(u.data?.data || []);
            try {
                const ib = await api.get("/org-workflow/requests/inbox");
                setInbox(ib.data?.data || []);
            } catch {
                setInbox([]);
            }
        } catch (error) {
            toast.error("Failed to load org workflow");
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = nodes.findIndex((n) => n.node_key === active.id);
        const newIndex = nodes.findIndex((n) => n.node_key === over.id);
        const next = arrayMove(nodes, oldIndex, newIndex).map((n, i) => ({ ...n, position_order: i }));
        setNodes(next);
    };

    const saveHierarchy = async () => {
        try {
            setSaving(true);
            await api.put("/org-workflow/hierarchy", { nodes });
            toast.success("Hierarchy saved");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save hierarchy");
        } finally {
            setSaving(false);
        }
    };

    const createFlowFromUseCase = async (uc: any) => {
        try {
            await api.post("/org-workflow/flows", {
                process_key: uc.process_key,
                name: `${uc.domain} - ${uc.request_type}`,
                request_type: uc.request_type,
                stage_chain: uc.stage_chain || [],
                escalation_sla_hours: 24,
                auto_escalate: true,
                trigger_rules: {}
            });
            toast.success("Flow created");
            loadAll();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to create flow");
        }
    };

    const applyAction = async (id: number, action: "approve" | "reject") => {
        try {
            await api.post(`/org-workflow/requests/${id}/action`, { action, comments: `Action from org workflow inbox` });
            toast.success(`Request ${action}d`);
            loadAll();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to apply action");
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Organization Workflow Designer</h1>
                    <p className="text-sm text-slate-500">Owner -&gt; Department -&gt; Heads -&gt; Custom Roles -&gt; Supervisors -&gt; Staff with request diversion and approvals.</p>
                </div>
                <button
                    onClick={saveHierarchy}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                    {saving ? "Saving..." : "Save Hierarchy"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h2 className="font-bold mb-3 dark:text-white">Hierarchy (Drag & Drop)</h2>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {nodes.map((n) => (
                                    <SortableNode
                                        key={n.node_key}
                                        node={n}
                                        onName={(k, name) => setNodes((prev) => prev.map((x) => x.node_key === k ? { ...x, node_name: name } : x))}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </section>

                <section className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <h2 className="font-bold mb-3 dark:text-white">Process Use Cases</h2>
                    <div className="space-y-3">
                        {useCases.map((u) => (
                            <div key={u.process_key} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                <p className="font-semibold dark:text-white">{u.domain}: {u.request_type}</p>
                                <p className="text-xs text-slate-500 mb-2">{u.hierarchy_chain?.join(" -> ")}</p>
                                <button
                                    onClick={() => createFlowFromUseCase(u)}
                                    className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                                >
                                    Add Template Flow
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h2 className="font-bold mb-3 dark:text-white">Approval Flows (Live)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900 text-slate-500 uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left">Process</th>
                                <th className="px-3 py-2 text-left">Request Type</th>
                                <th className="px-3 py-2 text-left">Stages</th>
                                <th className="px-3 py-2 text-left">SLA (hrs)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {flows.map((f) => (
                                <tr key={f.id || `${f.process_key}-${f.request_type}`}>
                                    <td className="px-3 py-2 dark:text-white">{f.name}</td>
                                    <td className="px-3 py-2 dark:text-white">{f.request_type}</td>
                                    <td className="px-3 py-2 dark:text-white">{Array.isArray(f.stage_chain) ? f.stage_chain.length : 0}</td>
                                    <td className="px-3 py-2 dark:text-white">{f.escalation_sla_hours}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <h2 className="font-bold mb-3 dark:text-white">My Approval Inbox</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900 text-slate-500 uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left">Process</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Stage</th>
                                <th className="px-3 py-2 text-left">Requester</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {inbox.map((r: any) => (
                                <tr key={r.id}>
                                    <td className="px-3 py-2 dark:text-white">{r.process_key}</td>
                                    <td className="px-3 py-2 dark:text-white">{r.request_type}</td>
                                    <td className="px-3 py-2 dark:text-white">{r.current_stage}</td>
                                    <td className="px-3 py-2 dark:text-white">{r.requested_by_name || `User #${r.requested_by}`}</td>
                                    <td className="px-3 py-2 text-right">
                                        <button onClick={() => applyAction(r.id, "approve")} className="px-2 py-1 text-xs rounded bg-green-600 text-white mr-2">Approve</button>
                                        <button onClick={() => applyAction(r.id, "reject")} className="px-2 py-1 text-xs rounded bg-red-600 text-white">Reject</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {inbox.length === 0 && <p className="text-sm text-slate-500 py-3">No pending approvals assigned to you.</p>}
                </div>
            </section>
        </div>
    );
}
