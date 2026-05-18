"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, RefreshCw, Save, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type MlmSettings = {
  roi_credit_time_utc: string;
  roi_credit_enabled: number;
};

const defaultForm: MlmSettings = {
  roi_credit_time_utc: "00:00",
  roi_credit_enabled: 1,
};

function toUtcDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcTimeInput(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function previewCreditUntilDate(asOfDate: string, asOfTime: string, cutoffTime: string): string {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(asOfDate) ? asOfDate : toUtcDateInput(new Date());
  const safeAsOfTime = /^\d{2}:\d{2}$/.test(asOfTime) ? asOfTime : "00:00";
  const safeCutoff = /^\d{2}:\d{2}$/.test(cutoffTime) ? cutoffTime : "00:00";

  const [asOfHour, asOfMin] = safeAsOfTime.split(":").map(Number);
  const [cutHour, cutMin] = safeCutoff.split(":").map(Number);
  const asOfMins = asOfHour * 60 + asOfMin;
  const cutMins = cutHour * 60 + cutMin;

  const base = new Date(`${safeDate}T00:00:00.000Z`);
  if (asOfMins < cutMins) {
    base.setUTCDate(base.getUTCDate() - 1);
  }
  return toUtcDateInput(base);
}

export default function RoiCreditSchedulerPage() {
  const now = new Date();
  const [form, setForm] = useState<MlmSettings>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>(toUtcDateInput(now));
  const [asOfTime, setAsOfTime] = useState<string>(toUtcTimeInput(now));
  const [testingTick, setTestingTick] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/mlm");
      setForm({ ...defaultForm, ...(response.data?.data || {}) });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load ROI scheduler settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const projectedCreditUntilDate = useMemo(
    () => previewCreditUntilDate(asOfDate, asOfTime, form.roi_credit_time_utc),
    [asOfDate, asOfTime, form.roi_credit_time_utc]
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        roi_credit_time_utc: form.roi_credit_time_utc,
        roi_credit_enabled: form.roi_credit_enabled ? 1 : 0,
      };
      const response = await api.put("/settings/mlm", payload);
      setForm({ ...defaultForm, ...(response.data?.data || payload) });
      toast.success("ROI scheduler updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update ROI scheduler";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const triggerManualTick = async () => {
    if (!window.confirm("Are you sure you want to manually trigger the scheduler tick? This will process pending ROI and Rank rewards immediately.")) {
      return;
    }
    setTestingTick(true);
    try {
      const response = await api.post("/compensation/trigger-roi-tick");
      const roiCount = response.data?.summary?.roiRun?.stats?.totalProcessed || 0;
      const rankCount = response.data?.summary?.rankRun?.stats?.newCredits || 0;
      toast.success(`Tick completed. ROI: ${roiCount} processed, Rank: ${rankCount} credited.`);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to trigger manual tick";
      toast.error(message);
    } finally {
      setTestingTick(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">ROI Credit Scheduler</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure UTC cutoff for daily ROI credit processing. Preserves current scheduler behavior.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-emerald-500 dark:border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ROI scheduler...
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold">Scheduler Controls</h2>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI Credit Time (UTC)</span>
                <input
                  type="time"
                  value={form.roi_credit_time_utc}
                  onChange={(e) => setForm((prev) => ({ ...prev, roi_credit_time_utc: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI Processing</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, roi_credit_enabled: prev.roi_credit_enabled ? 0 : 1 }))}
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${form.roi_credit_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  {form.roi_credit_enabled ? "Enabled" : "Disabled"}
                </button>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
            <h2 className="text-lg font-semibold">Cutoff Preview (UTC)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Preview uses backend rule: if current UTC time is before cutoff, credit-through date is previous day.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">As-of Date (UTC)</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">As-of Time (UTC)</span>
                <input
                  type="time"
                  value={asOfTime}
                  onChange={(e) => setAsOfTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Projected Credit-Through Date</p>
                <p className="mt-2 text-lg font-semibold text-emerald-800 dark:text-emerald-200">{projectedCreditUntilDate}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 space-y-4">
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Test Mode (Developer)</h2>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Manually trigger one scheduler tick. This immediately runs the logic for daily ROI credits and rank rewards based on current time. 
              Safe to use: all credit operations are fully idempotent and date-locked.
            </p>
            <div>
              <button
                type="button"
                disabled={testingTick}
                onClick={triggerManualTick}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {testingTick ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                {testingTick ? "Running Tick..." : "Trigger Manual Tick"}
              </button>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save ROI Scheduler"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

