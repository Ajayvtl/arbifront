"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Clock3, Loader2, Save, Settings2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type MlmSettings = {
  roi_credit_time_utc: string;
  roi_credit_enabled: number;
  payment_mode: "REAL" | "SIMULATED";
};

const defaultForm: MlmSettings = {
  roi_credit_time_utc: "00:00",
  roi_credit_enabled: 1,
  payment_mode: "REAL",
};

export default function CompanyBonusesPage() {
  const [form, setForm] = useState<MlmSettings>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings/mlm");
      setForm({ ...defaultForm, ...(response.data?.data || {}) });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load MLM settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        payment_mode: form.payment_mode,
        roi_credit_time_utc: form.roi_credit_time_utc,
        roi_credit_enabled: form.roi_credit_enabled ? 1 : 0,
      };
      const response = await api.put("/settings/mlm", payload);
      setForm({ ...defaultForm, ...(response.data?.data || payload) });
      toast.success("MLM settings updated");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update MLM settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">ROI & Payment Mode</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure payment behavior and daily ROI wallet credit visibility for the member dapp.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-emerald-500 dark:border-slate-700"
        >
          <Settings2 className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading company MLM settings...
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-500" />
              <h2 className="text-lg font-semibold">Payment Mode</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Control whether end users perform real wallet payments or simulated package activation.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Mode</span>
                <select
                  value={form.payment_mode}
                  onChange={(e) => setForm((prev) => ({ ...prev, payment_mode: e.target.value as MlmSettings["payment_mode"] }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="REAL">Real Payment</option>
                  <option value="SIMULATED">Simulated Payment</option>
                </select>
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Current Behavior</p>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  {form.payment_mode === "SIMULATED"
                    ? "Real wallet transfer and backend verification are disabled."
                    : "Real wallet transfer and backend chain verification are enabled."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold">ROI Wallet Credit Window</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sets the daily UTC time shown in dapp for ROI credit visibility.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Credit Time (UTC)</span>
                <input
                  type="time"
                  value={form.roi_credit_time_utc}
                  onChange={(e) => setForm((prev) => ({ ...prev, roi_credit_time_utc: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
              <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ROI Credit Visibility</span>
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save MLM Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
