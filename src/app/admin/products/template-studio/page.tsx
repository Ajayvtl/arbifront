"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CircleStackIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

type Subcategory = {
    id: number;
    name: string;
    category_id: number;
};

type Category = {
    id: number;
    name: string;
    subcategories?: Subcategory[];
};

type TemplateDb = {
    id: number;
    category_id: number | null;
    subcategory_id: number | null;
    host: string;
    database_name: string;
};

type TemplateVersion = {
    id: number;
    category_name: string;
    subcategory_name?: string | null;
    version_tag: string;
    database_name: string;
    status: "DRAFT" | "PUBLISHED" | "DEPRECATED";
};

type TemplateHistory = {
    id: number;
    created_at: string;
    action: string;
    category_name: string;
    subcategory_name?: string | null;
    version_tag: string;
};

type TemplatePolicy = {
    id: number;
    category_id: number;
    subcategory_id: number;
    category_name: string;
    subcategory_name?: string | null;
    template_version_id: number;
    version_tag: string;
    notes?: string | null;
};

export default function TemplateStudioPage() {
    const { user } = useAuth();
    const canView = hasAnyPermission(user, ['template_version.view', 'template_version.history', 'template_version.manage', 'menu.template_version']) || user?.role_id === 1;
    const canManage = hasAnyPermission(user, ['template_version.manage', 'template_version.publish']) || user?.role_id === 1;

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [templateDbs, setTemplateDbs] = useState<TemplateDb[]>([]);
    const [versions, setVersions] = useState<TemplateVersion[]>([]);
    const [history, setHistory] = useState<TemplateHistory[]>([]);
    const [policies, setPolicies] = useState<TemplatePolicy[]>([]);

    const [form, setForm] = useState({
        category_id: "",
        subcategory_id: "",
        category_db_id: "",
        version_tag: "",
        notes: ""
    });
    const [policyForm, setPolicyForm] = useState({
        category_id: "",
        subcategory_id: "",
        template_version_id: "",
        notes: ""
    });

    const activeSubcategories = useMemo(() => {
        return categories.find((c) => c.id == Number(form.category_id))?.subcategories || [];
    }, [categories, form.category_id]);

    const activePolicySubcategories = useMemo(() => {
        return categories.find((c) => c.id == Number(policyForm.category_id))?.subcategories || [];
    }, [categories, policyForm.category_id]);

    const filteredTemplateDbs = useMemo(() => {
        return templateDbs.filter((d) => {
            if (!form.category_id) return true;
            if (Number(d.category_id) !== Number(form.category_id)) return false;
            if (!form.subcategory_id) return true;
            return Number(d.subcategory_id || 0) === Number(form.subcategory_id);
        });
    }, [templateDbs, form.category_id, form.subcategory_id]);

    const load = async () => {
        try {
            const [catRes, dbRes, verRes, hisRes, polRes] = await Promise.all([
                api.get('/saas/categories'),
                api.get('/saas/template-databases'),
                api.get('/saas/template-versions'),
                api.get('/saas/template-versions/history?limit=100'),
                api.get('/saas/template-policies')
            ]);
            setCategories(catRes.data.data || []);
            setTemplateDbs(dbRes.data.data || []);
            setVersions(verRes.data.data || []);
            setHistory(hisRes.data.data || []);
            setPolicies(polRes.data.data || []);
        } catch {
            toast.error("Failed to load template studio");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const createDraft = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return toast.error("No permission");
        if (!form.notes.trim()) return toast.error("Action reason is required (use Notes)");
        try {
            await api.post('/saas/template-versions', {
                category_id: Number(form.category_id),
                subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null,
                category_db_id: Number(form.category_db_id),
                version_tag: form.version_tag.trim(),
                notes: form.notes || null,
                action_reason: form.notes || null
            });
            toast.success("Template draft created");
            setForm({ category_id: "", subcategory_id: "", category_db_id: "", version_tag: "", notes: "" });
            load();
        } catch {
            toast.error("Failed to create draft");
        }
    };

    const publishVersion = async (versionId: number) => {
        if (!canManage) return toast.error("No permission");
        const notes = (window.prompt("Publish reason (required):") || "").trim();
        if (!notes) return toast.error("Publish reason is required");
        try {
            await api.post(`/saas/template-versions/${versionId}/publish`, { notes, action_reason: notes || null });
            toast.success("Template version published");
            load();
        } catch {
            toast.error("Publish failed");
        }
    };

    const policyVersionOptions = useMemo(() => {
        return versions.filter((v) => {
            if (v.status !== 'PUBLISHED') return false;
            if (!policyForm.category_id) return false;
            const categoryName = categories.find(c => c.id === Number(policyForm.category_id))?.name || '';
            if (v.category_name !== categoryName) return false;
            const selectedSubName = activePolicySubcategories.find(s => s.id === Number(policyForm.subcategory_id || 0))?.name || '';
            if (!policyForm.subcategory_id) return !v.subcategory_name;
            return (v.subcategory_name || '') === selectedSubName;
        });
    }, [versions, policyForm.category_id, policyForm.subcategory_id, categories, activePolicySubcategories]);

    const savePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return toast.error("No permission");
        if (!policyForm.notes.trim()) return toast.error("Action reason is required (use Notes)");
        try {
            await api.put('/saas/template-policies/upsert', {
                category_id: Number(policyForm.category_id),
                subcategory_id: policyForm.subcategory_id ? Number(policyForm.subcategory_id) : null,
                template_version_id: Number(policyForm.template_version_id),
                notes: policyForm.notes || null,
                action_reason: policyForm.notes || null
            });
            toast.success("Template policy saved");
            setPolicyForm({ category_id: "", subcategory_id: "", template_version_id: "", notes: "" });
            load();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to save policy");
        }
    };

    const removePolicy = async (policyId: number) => {
        if (!canManage) return toast.error("No permission");
        const reason = (window.prompt("Delete reason (required):") || "").trim();
        if (!reason) return toast.error("Delete reason is required");
        try {
            await api.delete(`/saas/template-policies/${policyId}`, { data: { action_reason: reason } });
            toast.success("Template policy removed");
            load();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to remove policy");
        }
    };

    if (!canView) {
        return <div className="p-8"><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">Access denied for Template Studio.</div></div>;
    }
    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CircleStackIcon className="w-7 h-7 text-emerald-500" />
                    Template Studio
                </h1>
                <p className="text-sm text-gray-500">Draft, publish, and audit template versions.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <h2 className="font-semibold mb-4 dark:text-white">Create Draft</h2>
                <form onSubmit={createDraft} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Category</label>
                        <select className="w-full px-3 py-2 rounded border dark:bg-slate-900" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value, subcategory_id: "", category_db_id: "" })} required>
                            <option value="">Select</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Subcategory (Optional)</label>
                        <select className="w-full px-3 py-2 rounded border dark:bg-slate-900" value={form.subcategory_id} onChange={e => setForm({ ...form, subcategory_id: e.target.value, category_db_id: "" })} disabled={!form.category_id}>
                            <option value="">Default</option>
                            {activeSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Template DB Mapping</label>
                        <select className="w-full px-3 py-2 rounded border dark:bg-slate-900" value={form.category_db_id} onChange={e => setForm({ ...form, category_db_id: e.target.value })} required>
                            <option value="">Select</option>
                            {filteredTemplateDbs.map((d) => (
                                <option key={d.id} value={d.id}>{d.database_name} ({d.host})</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Version Tag" placeholder="v1.0.0" value={form.version_tag} onChange={e => setForm({ ...form, version_tag: e.target.value })} required />
                    <div className="md:col-span-2">
                        <Input label="Notes" placeholder="What changed in this draft" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                        <Button type="submit" disabled={!canManage}>Create Draft</Button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b dark:border-slate-700 font-semibold dark:text-white">Template Versions</div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900/40">
                        <tr>
                            <th className="px-4 py-3 text-left">Scope</th>
                            <th className="px-4 py-3 text-left">Version</th>
                            <th className="px-4 py-3 text-left">DB</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {versions.map((v) => (
                            <tr key={v.id} className="border-t dark:border-slate-700">
                                <td className="px-4 py-3">{v.category_name}{v.subcategory_name ? ` > ${v.subcategory_name}` : ''}</td>
                                <td className="px-4 py-3 font-mono">{v.version_tag}</td>
                                <td className="px-4 py-3">{v.database_name}</td>
                                <td className="px-4 py-3">{v.status}</td>
                                <td className="px-4 py-3 text-right">
                                    {v.status !== 'PUBLISHED' && (
                                        <Button onClick={() => publishVersion(v.id)} disabled={!canManage}>Publish</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {versions.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No template versions found</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b dark:border-slate-700 font-semibold dark:text-white">Publish History</div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900/40">
                        <tr>
                            <th className="px-4 py-3 text-left">When</th>
                            <th className="px-4 py-3 text-left">Action</th>
                            <th className="px-4 py-3 text-left">Scope</th>
                            <th className="px-4 py-3 text-left">Version</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((h) => (
                            <tr key={h.id} className="border-t dark:border-slate-700">
                                <td className="px-4 py-3">{new Date(h.created_at).toLocaleString()}</td>
                                <td className="px-4 py-3">{h.action}</td>
                                <td className="px-4 py-3">{h.category_name}{h.subcategory_name ? ` > ${h.subcategory_name}` : ''}</td>
                                <td className="px-4 py-3 font-mono">{h.version_tag}</td>
                            </tr>
                        ))}
                        {history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No publish history found</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
                <h2 className="font-semibold mb-4 dark:text-white">Category Template Policy</h2>
                <form onSubmit={savePolicy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Category</label>
                        <select className="w-full px-3 py-2 rounded border dark:bg-slate-900" value={policyForm.category_id} onChange={e => setPolicyForm({ ...policyForm, category_id: e.target.value, subcategory_id: "", template_version_id: "" })} required>
                            <option value="">Select</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Subcategory (Optional)</label>
                        <select className="w-full px-3 py-2 rounded border dark:bg-slate-900" value={policyForm.subcategory_id} onChange={e => setPolicyForm({ ...policyForm, subcategory_id: e.target.value, template_version_id: "" })} disabled={!policyForm.category_id}>
                            <option value="">Default</option>
                            {activePolicySubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1 dark:text-slate-300">Published Template Version</label>
                        <select className="w-full px-3 py-2 rounded border dark:bg-slate-900" value={policyForm.template_version_id} onChange={e => setPolicyForm({ ...policyForm, template_version_id: e.target.value })} required>
                            <option value="">Select</option>
                            {policyVersionOptions.map((v) => (
                                <option key={v.id} value={v.id}>{v.version_tag} ({v.database_name})</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Notes (Reason)" placeholder="Policy reason" value={policyForm.notes} onChange={e => setPolicyForm({ ...policyForm, notes: e.target.value })} />
                    <div className="md:col-span-2 flex justify-end">
                        <Button type="submit" disabled={!canManage}>Save Policy</Button>
                    </div>
                </form>

                <div className="mt-6 overflow-hidden rounded-lg border dark:border-slate-700">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900/40">
                            <tr>
                                <th className="px-4 py-3 text-left">Scope</th>
                                <th className="px-4 py-3 text-left">Pinned Version</th>
                                <th className="px-4 py-3 text-left">Notes</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map((p) => (
                                <tr key={p.id} className="border-t dark:border-slate-700">
                                    <td className="px-4 py-3">{p.category_name}{p.subcategory_name ? ` > ${p.subcategory_name}` : ''}</td>
                                    <td className="px-4 py-3 font-mono">{p.version_tag}</td>
                                    <td className="px-4 py-3">{p.notes || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="danger" onClick={() => removePolicy(p.id)} disabled={!canManage}>Remove</Button>
                                    </td>
                                </tr>
                            ))}
                            {policies.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No policies configured</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
