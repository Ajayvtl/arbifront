"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";

type WalletSnapshot = {
  main_balance?: number;
  earning_balance?: number;
  roi_balance?: number;
  direct_balance?: number;
  level_balance?: number;
  withdrawable_balance?: number;
  reward_balance?: number;
  locked_balance?: number;
};

type SubscriptionSummary = {
  id: number;
  orderId: number;
  planName: string;
  amount: number;
  tokenSymbol: string;
  status: string;
  roiPercent: number;
  dailyIncomePercent: number;
  durationDays: number;
  capMultiplier: number;
  totalRoiCredited: number;
  remainingIncome: number;
};

type SimulationResult = {
  simulatedDays: number;
  walletAddress: string;
  walletBefore?: WalletSnapshot | null;
  walletAfter?: WalletSnapshot | null;
  subscriptionsBefore?: SubscriptionSummary[];
  subscriptionsAfter?: SubscriptionSummary[];
  creditedRuns?: Array<{
    subscriptionId: number;
    payoutAmount: number;
    dueDays: number;
  }>;
  note?: string;
};

function formatAmount(value: number | undefined) {
  return Number(value || 0).toFixed(6);
}

function formatDelta(after?: number, before?: number) {
  return Number((Number(after || 0) - Number(before || 0)).toFixed(6));
}

export default function CompanyTestingPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [days, setDays] = useState(7);
  const [scenarioLevels, setScenarioLevels] = useState(20);
  const [scenarioRootPackages, setScenarioRootPackages] = useState(2);
  const [scenarioDays, setScenarioDays] = useState(30);
  const [scenarioClearsExisting, setScenarioClearsExisting] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [buildingScenario, setBuildingScenario] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<string>("");
  const [resultTone, setResultTone] = useState<"info" | "success" | "danger">("info");
  const [lastAction, setLastAction] = useState<"simulation" | "scenario" | "clear" | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [scenarioResult, setScenarioResult] = useState<Record<string, unknown> | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (result || simulation || scenarioResult) {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, simulation, scenarioResult]);

  const handleBuildScenario = async (event: FormEvent) => {
    event.preventDefault();
    setBuildingScenario(true);
    setResult("");
    setLastAction(null);
    setSimulation(null);
    setScenarioResult(null);
    try {
      const response = await api.post("/admin/testing/build-scenario", {
        levels: scenarioLevels,
        rootPackages: scenarioRootPackages,
        simulateDays: scenarioDays,
        clearExisting: scenarioClearsExisting,
      });
      const data = response.data?.data || {};
      setScenarioResult(data as Record<string, unknown>);
      setResult(`Created ${data.createdUsers || 0} test members, ${data.createdOrders || 0} paid orders, and simulated ${data.simulatedDays || 0} day(s).`);
      setResultTone("success");
      setLastAction("scenario");
      toast.success("Test scenario created");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to build test scenario";
      setResult(message);
      setResultTone("danger");
      toast.error(message);
    } finally {
      setBuildingScenario(false);
    }
  };

  const handleSimulate = async (event: FormEvent) => {
    event.preventDefault();
    setSimulating(true);
    setResult("");
    setLastAction(null);
    setSimulation(null);
    try {
      const response = await api.post("/admin/testing/simulate-roi", {
        walletAddress,
        days,
      });
      const data = response.data?.data || {};
      setSimulation(data as SimulationResult);
      setResult(`Simulated ${data.simulatedDays || days} day(s) for ${data.walletAddress || walletAddress}.`);
      setResultTone("success");
      setLastAction("simulation");
      toast.success("ROI simulation completed");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to simulate ROI";
      setResult(message);
      setResultTone("danger");
      toast.error(message);
    } finally {
      setSimulating(false);
    }
  };

  const handleClearMembers = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("This will permanently remove all end-user members and their MLM/payment data for this company. Continue?");
      if (!confirmed) return;
    }

    setClearing(true);
    setResult("");
    setLastAction(null);
    setSimulation(null);
    try {
      const response = await api.post("/admin/testing/clear-members");
      const data = response.data?.data || {};
      setResult(`Cleared ${data.deletedUsers || 0} member account(s).`);
      setResultTone("success");
      setLastAction("clear");
      toast.success("Members cleared");
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to clear members";
      setResult(message);
      setResultTone("danger");
      toast.error(message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Testing Tools</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Safe test-ops controls for ROI simulation and end-user cleanup before handover.
        </p>
      </div>

      <div ref={outputRef} className="space-y-4">
        {result ? (
          <div
            className={`rounded-2xl border p-5 shadow-sm ${
              resultTone === "danger"
                ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
                : resultTone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                  : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              {lastAction === "simulation"
                ? "Latest ROI Simulation"
                : lastAction === "scenario"
                  ? "Latest Scenario Build"
                  : lastAction === "clear"
                    ? "Latest Cleanup Run"
                    : "Latest Result"}
            </p>
            <p className="mt-2 text-sm font-medium">{result}</p>
            {lastAction === "simulation" && simulation ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Simulated Days</p>
                  <p className="mt-2 text-lg font-semibold">{simulation.simulatedDays}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Packages Processed</p>
                  <p className="mt-2 text-lg font-semibold">{simulation.subscriptionsAfter?.length || 0}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">ROI Credits Posted</p>
                  <p className="mt-2 text-lg font-semibold">{simulation.creditedRuns?.length || 0}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Daily Income Delta</p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatAmount(formatDelta(simulation.walletAfter?.roi_balance, simulation.walletBefore?.roi_balance))}
                  </p>
                </div>
              </div>
            ) : null}
            {lastAction === "scenario" && scenarioResult ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Created Users</p>
                  <p className="mt-2 text-lg font-semibold">{String(scenarioResult.createdUsers || 0)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Created Orders</p>
                  <p className="mt-2 text-lg font-semibold">{String(scenarioResult.createdOrders || 0)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Levels Built</p>
                  <p className="mt-2 text-lg font-semibold">{String(scenarioResult.levels || 0)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-white/80 p-3 dark:border-emerald-900/40 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">ROI Runs</p>
                  <p className="mt-2 text-lg font-semibold">{String(scenarioResult.roiRuns || 0)}</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSimulate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Simulate ROI Days</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Target one test wallet and add elapsed ROI days for active subscriptions, then run credit processing immediately.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Wallet Address</span>
            <input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              placeholder="0x..."
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Days To Simulate</span>
            <input
              type="number"
              min="1"
              max="101"
              step="1"
              value={days}
              onChange={(e) => setDays(Number(e.target.value || 1))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
        <button type="submit" disabled={simulating || !walletAddress} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {simulating ? "Simulating..." : "Simulate ROI"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This uses the real subscription and ROI credit engine. It is not a mock preview. Maximum simulation is 101 days. Direct income still comes only from payment activation events.
        </p>
      </form>

      <form onSubmit={handleBuildScenario} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Full Test Scenario Builder</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a clean sponsor chain, real paid orders, real subscriptions, and optional ROI days for one end-to-end company test run.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Levels</span>
            <input type="number" min="1" max="20" step="1" value={scenarioLevels} onChange={(e) => setScenarioLevels(Number(e.target.value || 1))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Root Packages</span>
            <input type="number" min="1" max="5" step="1" value={scenarioRootPackages} onChange={(e) => setScenarioRootPackages(Number(e.target.value || 1))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Simulate ROI Days</span>
            <input type="number" min="0" max="101" step="1" value={scenarioDays} onChange={(e) => setScenarioDays(Number(e.target.value || 0))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Reset Existing Members First</span>
            <button
              type="button"
              onClick={() => setScenarioClearsExisting((value) => !value)}
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${scenarioClearsExisting ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
            >
              {scenarioClearsExisting ? "Enabled" : "Disabled"}
            </button>
          </label>
        </div>
        <button type="submit" disabled={buildingScenario} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {buildingScenario ? "Building..." : "Build Full Scenario"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This builder creates real end-user accounts, real paid package orders, and a real 20-level sponsor tree. If ROI days are provided, it then runs the live ROI engine across the seeded company data.
        </p>
      </form>

      <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm dark:border-rose-900/40 dark:bg-slate-950 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-rose-700 dark:text-rose-300">Clear Members</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Remove end-user members and their MLM/payment/wallet records for this company. Admin accounts and company settings stay intact.</p>
        </div>
        <button type="button" disabled={clearing} onClick={handleClearMembers} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {clearing ? "Clearing..." : "Clear All Members"}
        </button>
      </div>

      {simulation ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Wallet Before / After</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-medium">Before</p>
                <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p>Daily Income: {formatAmount(simulation.walletBefore?.roi_balance)}</p>
                  <p>Working Balance: {formatAmount(simulation.walletBefore?.direct_balance)}</p>
                  <p>Level Balance: {formatAmount(simulation.walletBefore?.level_balance)}</p>
                  <p>Withdrawable: {formatAmount(simulation.walletBefore?.withdrawable_balance)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-medium">After</p>
                <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <p>Daily Income: {formatAmount(simulation.walletAfter?.roi_balance)}</p>
                  <p>Working Balance: {formatAmount(simulation.walletAfter?.direct_balance)}</p>
                  <p>Level Balance: {formatAmount(simulation.walletAfter?.level_balance)}</p>
                  <p>Withdrawable: {formatAmount(simulation.walletAfter?.withdrawable_balance)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Package-wise ROI Result</h2>
            <div className="mt-4 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Package</th>
                    <th className="px-4 py-3 text-left">Paid</th>
                    <th className="px-4 py-3 text-left">ROI %</th>
                    <th className="px-4 py-3 text-left">Cap</th>
                    <th className="px-4 py-3 text-left">Credited</th>
                    <th className="px-4 py-3 text-left">Remaining</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(simulation.subscriptionsAfter || []).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">{item.planName}</td>
                      <td className="px-4 py-3">{formatAmount(item.amount)} {item.tokenSymbol}</td>
                      <td className="px-4 py-3">{item.roiPercent}%</td>
                      <td className="px-4 py-3">{item.capMultiplier}x</td>
                      <td className="px-4 py-3">{formatAmount(item.totalRoiCredited)}</td>
                      <td className="px-4 py-3">{formatAmount(item.remainingIncome)}</td>
                      <td className="px-4 py-3">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Credits Posted In This Run</h2>
            {!(simulation.creditedRuns || []).length ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No ROI credit was posted for the selected day window.</p>
            ) : (
              <div className="mt-4 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Subscription</th>
                      <th className="px-4 py-3 text-left">Due Days</th>
                      <th className="px-4 py-3 text-left">Posted ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(simulation.creditedRuns || []).map((item) => (
                      <tr key={`${item.subscriptionId}-${item.dueDays}`} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3">#{item.subscriptionId}</td>
                        <td className="px-4 py-3">{item.dueDays}</td>
                        <td className="px-4 py-3">{formatAmount(item.payoutAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {simulation.note ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{simulation.note}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {scenarioResult ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <h2 className="text-lg font-semibold">Scenario Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-slate-500">Created Users</p>
              <p className="mt-2 text-xl font-semibold">{String(scenarioResult.createdUsers || 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-slate-500">Created Orders</p>
              <p className="mt-2 text-xl font-semibold">{String(scenarioResult.createdOrders || 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-slate-500">ROI Runs</p>
              <p className="mt-2 text-xl font-semibold">{String(scenarioResult.roiRuns || 0)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm font-medium">Root Test Wallet</p>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(scenarioResult.rootUser || {}, null, 2)}</pre>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-sm font-medium">Sample Activations</p>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{JSON.stringify(scenarioResult.sampleActivations || [], null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
