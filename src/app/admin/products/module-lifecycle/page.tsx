"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { toast } from "react-hot-toast";

type Manifest = {
    id: number;
    module_slug: string;
    module_name: string;
    version_tag: string;
    status: string;
};

type PlanResult = {
    success: boolean;
    missingModules?: string[];
    missingDependencies?: Array<{ module: string; missing: string }>;
    hasCycle?: boolean;
    cycleNodes?: string[];
    orderedModules?: Array<{ module_slug: string; version_tag: string }>;
};

type LifecycleJob = {
    id: number;
    hotel_id: number | null;
    module_slug: string;
    target_version: string | null;
    operation: "INSTALL" | "UPGRADE" | "DISABLE" | "UNINSTALL";
    status: string;
    attempt_count: number;
    error_message: string | null;
    created_at: string;
    updated_at: string;
};

type JobEvent = {
    id: number;
    phase: string;
    status: string;
    detail_json: unknown;
    created_at: string;
};

type DueRetryResult = {
    scanned?: number;
    attempted?: number;
    executed_job_ids?: number[];
    skipped_job_ids?: number[];
};

export default function ModuleLifecyclePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [manifests, setManifests] = useState<Manifest[]>([]);
    const [jobs, setJobs] = useState<LifecycleJob[]>([]);
    const [planInput, setPlanInput] = useState("");
    const [planResult, setPlanResult] = useState<PlanResult | null>(null);
    const [events, setEvents] = useState<JobEvent[]>([]);
    const [eventsJobId, setEventsJobId] = useState<number | null>(null);
    const [runningJobId, setRunningJobId] = useState<number | null>(null);
    const [replayingJobId, setReplayingJobId] = useState<number | null>(null);
    const [runningDueRetries, setRunningDueRetries] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
    const [jobsDbSource, setJobsDbSource] = useState<string>("-");
    const [jobsExecutionScope, setJobsExecutionScope] = useState<string>("-");

    const [form, setForm] = useState({
        module_slug: "",
        operation: "INSTALL",
        hotel_id: "",
        target_version: ""
    });

    const hasLifecycleAccess =
        user?.role_id === 1 ||
        Boolean(user?.permissions?.includes("settings.manage")) ||
        Boolean(user?.permissions?.includes("roles.manage"));

    const publishedManifests = useMemo(
        () => manifests.filter((m) => String(m.status || "").toUpperCase() === "PUBLISHED"),
        [manifests]
    );

    const load = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const [manifestRes, jobsRes] = await Promise.all([
                api.get("/saas/module-registry/manifests"),
                api.get("/saas/module-registry/lifecycle/jobs?limit=100")
            ]);
            setManifests(manifestRes.data?.data || []);
            setJobs(jobsRes.data?.data || []);
            setJobsDbSource(jobsRes.headers?.["x-db-source"] || "-");
            setJobsExecutionScope(jobsRes.headers?.["x-execution-scope"] || "-");
            setLastSyncAt(new Date());
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            const finalMsg = msg || "Failed to load module lifecycle data";
            setLoadError(finalMsg);
            toast.error(finalMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hasLifecycleAccess) return;
        load();
        const interval = window.setInterval(() => {
            load();
        }, 20000);
        return () => window.clearInterval(interval);
    }, [hasLifecycleAccess]);

    const enqueueJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/saas/module-registry/lifecycle/jobs", {
                module_slug: form.module_slug,
                operation: form.operation,
                hotel_id: form.hotel_id ? Number(form.hotel_id) : null,
                target_version: form.target_version || null
            });
            toast.success("Lifecycle job queued");
            await load();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to queue lifecycle job");
        }
    };

    const runJob = async (jobId: number, forceReplay = false) => {
        try {
            if (forceReplay) {
                setReplayingJobId(jobId);
            } else {
                setRunningJobId(jobId);
            }
            await api.post(`/saas/module-registry/lifecycle/jobs/${jobId}/run`, {
                force_replay: forceReplay
            });
            toast.success(forceReplay ? `Job ${jobId} replay executed` : `Job ${jobId} executed`);
            await load();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to run lifecycle job");
        } finally {
            if (forceReplay) {
                setReplayingJobId(null);
            } else {
                setRunningJobId(null);
            }
        }
    };

    const runDueRetries = async () => {
        try {
            setRunningDueRetries(true);
            const res = await api.post("/saas/module-registry/lifecycle/retry-due", { limit: 50 });
            const summary: DueRetryResult = res.data?.data || {};
            toast.success(
                `Due retries: attempted ${summary.attempted || 0}, executed ${(summary.executed_job_ids || []).length}`
            );
            await load();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to run due retries");
        } finally {
            setRunningDueRetries(false);
        }
    };

    const resolvePlan = async () => {
        const slugs = planInput
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        if (slugs.length === 0) {
            toast.error("Enter at least one module slug");
            return;
        }
        try {
            const res = await api.post("/saas/module-registry/resolve-plan", { module_slugs: slugs });
            setPlanResult(res.data?.data || null);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to resolve plan");
        }
    };

    const openEvents = async (jobId: number) => {
        try {
            const res = await api.get(`/saas/module-registry/lifecycle/jobs/${jobId}/events?limit=500`);
            setEvents(res.data?.data || []);
            setEventsJobId(jobId);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || "Failed to load job events");
        }
    };

    if (!hasLifecycleAccess) {
        return (
            <div className="p-8">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    Access denied for Module Lifecycle.
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Lifecycle</h1>
                <p className="text-sm text-gray-500">Live control plane for dependency plan, lifecycle jobs, and phase events.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="info">Auto refresh: 20s</Badge>
                    <Badge variant="neutral">DB Source: {jobsDbSource}</Badge>
                    <Badge variant="neutral">Scope: {jobsExecutionScope}</Badge>
                    <Badge variant="default">
                        Last Sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Never"}
                    </Badge>
                </div>
                {loadError && (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {loadError}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                    <h2 className="font-semibold mb-3 dark:text-white">Resolve Install Plan</h2>
                    <Input
                        label="Module Slugs (comma separated)"
                        placeholder="inventory,housekeeping,reports"
                        value={planInput}
                        onChange={(e) => setPlanInput(e.target.value)}
                    />
                    <div className="mt-3 flex justify-end">
                        <Button onClick={resolvePlan}>Resolve Plan</Button>
                    </div>
                    {planResult && (
                        <div className="mt-4 text-sm space-y-2">
                            <div>
                                Status:{" "}
                                <Badge variant={planResult.success ? "success" : "danger"}>
                                    {planResult.success ? "VALID" : "INVALID"}
                                </Badge>
                            </div>
                            <div>Ordered Modules: {(planResult.orderedModules || []).map((m) => `${m.module_slug}@${m.version_tag}`).join(", ") || "-"}</div>
                            <div>Missing Modules: {(planResult.missingModules || []).join(", ") || "-"}</div>
                            <div>Missing Dependencies: {(planResult.missingDependencies || []).map((d) => `${d.module}->${d.missing}`).join(", ") || "-"}</div>
                            <div>Cycle: {planResult.hasCycle ? (planResult.cycleNodes || []).join(", ") : "No"}</div>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                    <h2 className="font-semibold mb-3 dark:text-white">Queue Lifecycle Job</h2>
                    <form onSubmit={enqueueJob} className="space-y-3">
                        <Select
                            label="Module"
                            options={[
                                { value: "", label: "Select Module" },
                                ...publishedManifests.map((m) => ({ value: m.module_slug, label: `${m.module_name} (${m.module_slug})` }))
                            ]}
                            value={form.module_slug}
                            onChange={(e) => setForm((p) => ({ ...p, module_slug: e.target.value }))}
                            required
                        />
                        <Select
                            label="Operation"
                            options={[
                                { value: "INSTALL", label: "INSTALL" },
                                { value: "UPGRADE", label: "UPGRADE" },
                                { value: "DISABLE", label: "DISABLE" },
                                { value: "UNINSTALL", label: "UNINSTALL" }
                            ]}
                            value={form.operation}
                            onChange={(e) => setForm((p) => ({ ...p, operation: e.target.value }))}
                        />
                        <Input
                            label="Hotel ID (optional, blank = system scope)"
                            placeholder="e.g. 101"
                            value={form.hotel_id}
                            onChange={(e) => setForm((p) => ({ ...p, hotel_id: e.target.value }))}
                        />
                        <Input
                            label="Target Version (optional)"
                            placeholder="v1.2.0"
                            value={form.target_version}
                            onChange={(e) => setForm((p) => ({ ...p, target_version: e.target.value }))}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">Queue Job</Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="font-semibold dark:text-white">Lifecycle Jobs (Live)</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={runDueRetries} isLoading={runningDueRetries}>
                            Run Due Retries
                        </Button>
                        <Button variant="secondary" onClick={load} isLoading={loading}>Refresh</Button>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableHead>ID</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableHeader>
                    <TableBody>
                        {jobs.map((j) => (
                            <TableRow key={j.id}>
                                <TableCell>#{j.id}</TableCell>
                                <TableCell>{j.hotel_id ? `Tenant:${j.hotel_id}` : "System"}</TableCell>
                                <TableCell className="font-mono text-xs">{j.module_slug}</TableCell>
                                <TableCell>{j.operation}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant(j.status)}>{j.status}</Badge>
                                </TableCell>
                                <TableCell>{j.attempt_count}</TableCell>
                                <TableCell>{new Date(j.updated_at).toLocaleString()}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => openEvents(j.id)}>Events</Button>
                                    <Button
                                        size="sm"
                                        onClick={() => runJob(j.id, false)}
                                        disabled={runningJobId === j.id || j.status === "RUNNING"}
                                        isLoading={runningJobId === j.id}
                                    >
                                        Run
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => runJob(j.id, true)}
                                        disabled={replayingJobId === j.id}
                                        isLoading={replayingJobId === j.id}
                                    >
                                        Force Replay
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {jobs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">No lifecycle jobs found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={eventsJobId !== null} onOpenChange={(o) => !o && setEventsJobId(null)}>
                <DialogContent className="max-w-4xl">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold dark:text-white">Job Events #{eventsJobId}</h3>
                        <div className="max-h-[60vh] overflow-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Phase</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Detail</TableHead>
                                </TableHeader>
                                <TableBody>
                                    {events.map((e) => (
                                        <TableRow key={e.id}>
                                            <TableCell>{new Date(e.created_at).toLocaleString()}</TableCell>
                                            <TableCell>{e.phase}</TableCell>
                                            <TableCell><Badge variant={eventVariant(e.status)}>{e.status}</Badge></TableCell>
                                            <TableCell>
                                                <pre className="text-xs whitespace-pre-wrap break-words">
                                                    {JSON.stringify(e.detail_json, null, 2)}
                                                </pre>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {events.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-gray-500">No events available.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
    const s = String(status || "").toUpperCase();
    if (s === "SUCCESS") return "success";
    if (s === "RUNNING") return "info";
    if (s === "ROLLED_BACK") return "warning";
    if (s === "FAILED") return "danger";
    return "neutral";
}

function eventVariant(status: string): "default" | "success" | "warning" | "danger" | "info" | "neutral" {
    const s = String(status || "").toUpperCase();
    if (s === "SUCCESS") return "success";
    if (s === "STARTED") return "info";
    if (s === "FAILED") return "danger";
    return "neutral";
}
