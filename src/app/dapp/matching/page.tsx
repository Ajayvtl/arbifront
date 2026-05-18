"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { 
  Award, 
  Loader2, 
  TrendingUp, 
  Zap, 
  GitBranch, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Coins,
  Wallet
} from "lucide-react";

interface Leg {
  legRootUserId: number;
  teamBusiness: number;
  walletAddress: string | null;
}

interface Rule {
  id: number;
  minLegAIncome: number;
  minLegBIncome: number;
  minLegCIncome: number;
  rewardAmount: number;
  rewardWallet: string;
  isActive: boolean;
  isAchieved: boolean;
}

interface Claim {
  id: number;
  ruleId: number;
  achievedAt: string;
  legs: {
    usedLegs?: Array<{ legRootUserId: number; usedBusiness: number }>;
    legacyAchievementId?: number;
  } | null;
}

export default function MatchingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    lifetimeLegs: Leg[];
    todayLegs: Leg[];
    rules: Rule[];
    claims: Claim[];
  } | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/mlm/commissions/my-matching-stats");
      setData(res.data?.data || null);
    } catch (err: any) {
      console.error("Failed to load matching stats:", err);
      setError(err?.response?.data?.message || "Failed to load matching details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#5bbcff]" />
        <p className="text-sm text-[#8aa4bf] animate-pulse">Loading matching statistics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 text-center text-red-200">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h3 className="font-semibold text-lg">Failed to Load Matching Income</h3>
          <p className="mt-2 text-sm text-red-300/80">{error || "Please try again later."}</p>
          <button 
            type="button"
            onClick={() => void fetchStats()} 
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { lifetimeLegs, todayLegs, rules, claims } = data;

  // Aggregate used business per leg from all previous claims
  const consumedByLeg = new Map<number, number>();
  for (const claim of claims) {
    const usedLegs = claim?.legs?.usedLegs;
    if (Array.isArray(usedLegs)) {
      for (const used of usedLegs) {
        const rootId = Number(used?.legRootUserId || 0);
        const business = Number(used?.usedBusiness || 0);
        if (rootId && business > 0) {
          consumedByLeg.set(rootId, (consumedByLeg.get(rootId) || 0) + business);
        }
      }
    }
  }

  return (
    <div className="p-4 space-y-6 md:p-6 lg:p-8 max-w-7xl mx-auto">
      
      {/* Intro Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-[24px] border border-[#123a62]/80 bg-gradient-to-br from-[#09182d] to-[#050b14] p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1.5 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0b90b]/10 border border-[#f0b90b]/30 px-2 py-0.5 text-[10px] font-bold text-[#f0b90b] uppercase tracking-wider">
              <Zap className="h-3 w-3 animate-pulse" /> Daily Matching Mode Active
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Matching Business Volume</h2>
            <p className="text-xs text-[#8aa4bf] max-w-sm">Calculates matching performance dynamically from payments settled in real time.</p>
          </div>
          <div className="opacity-15 transform translate-x-3 translate-y-3 z-0">
            <Award className="h-28 w-28 text-[#f0b90b]" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-[#123a62]/80 bg-gradient-to-br from-[#09182d] to-[#050b14] p-5 shadow-lg flex items-center justify-between">
          <div className="space-y-1.5 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5bbcff]/10 border border-[#5bbcff]/30 px-2 py-0.5 text-[10px] font-bold text-[#5bbcff] uppercase tracking-wider">
              <Coins className="h-3 w-3" /> Total Earnings
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white tracking-tight">
                ${rules.reduce((acc, r) => acc + (claims.some(c => c.ruleId === r.id) ? r.rewardAmount : 0), 0).toFixed(2)}
              </span>
              <span className="text-xs text-[#8aa4bf] font-medium">USDT</span>
            </div>
            <p className="text-xs text-[#8aa4bf]">Accumulated matching rewards fully credited and settled into your wallet.</p>
          </div>
          <div className="opacity-15 transform translate-x-3 translate-y-3 z-0">
            <Wallet className="h-28 w-28 text-[#5bbcff]" />
          </div>
        </div>
      </div>

      {/* Legs Volume Overview Deck */}
      <div className="w-full">
        
        {/* Legs Business */}
        <div className="bg-[#09111c] border border-[#132235] rounded-[24px] p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-[#1d2d44]/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="font-bold text-white tracking-tight">Legs Business</h3>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-[#5bbcff] uppercase bg-[#1ea0ff]/10 px-2.5 py-1 rounded-full">
              Settled Today
            </span>
          </div>

          <div className="space-y-3">
            {todayLegs.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8aa4bf] italic">
                No downline volume registered today yet.
              </div>
            ) : (
              todayLegs.map((leg, index) => (
                <div key={leg.legRootUserId} className="bg-[#0c1827] border border-[#123a62]/40 rounded-2xl p-3.5 flex items-center justify-between transition hover:border-[#1e3b5e]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Leg #{index + 1}</span>
                      <span className="font-mono text-[10px] text-[#5bbcff] tracking-wide break-all block max-w-[140px] md:max-w-none truncate">
                        {leg.walletAddress || `User ID: ${leg.legRootUserId}`}
                      </span>
                    </div>
                    <span className="text-xs text-[#8aa4bf] block">Direct referral leg</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-extrabold text-white block">${leg.teamBusiness.toFixed(2)}</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase">Active Today</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Matching Rules Deck */}
      <div className="bg-[#09111c] border border-[#132235] rounded-[24px] p-5 space-y-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1d2d44]/60 pb-4 gap-2">
          <div className="space-y-0.5">
            <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
              <Award className="h-5 w-5 text-[#f0b90b]" /> Active Matching Rules
            </h3>
            <p className="text-xs text-[#8aa4bf]">Qualify dynamically by matching remaining leg volumes with thresholds.</p>
          </div>
          <div className="flex items-center gap-1 bg-[#122238] border border-[#1d2d44] px-3 py-1.5 rounded-xl text-[11px] text-slate-300">
            <HelpCircle className="h-3.5 w-3.5 text-[#5bbcff] shrink-0" /> Requires minimum 3 active legs
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.length === 0 ? (
            <div className="col-span-full text-center py-10 text-xs text-[#8aa4bf] italic">
              No matching income rules are currently configured in the system.
            </div>
          ) : (
            rules.map((rule) => {
              const claimCount = claims.filter(c => c.ruleId === rule.id).length;
              
              // We evaluate eligibility against today's business leg volumes
              const topToday = [...todayLegs].sort((a,b) => b.teamBusiness - a.teamBusiness);
              
              const isEligibleToday = topToday.length >= 3 &&
                topToday[0].teamBusiness >= rule.minLegAIncome &&
                topToday[1].teamBusiness >= rule.minLegBIncome &&
                topToday[2].teamBusiness >= rule.minLegCIncome;

              return (
                <div key={rule.id} className={`border rounded-2xl p-4 space-y-4 relative overflow-hidden transition hover:shadow-md ${
                  isEligibleToday 
                    ? "border-emerald-500/30 bg-emerald-950/5" 
                    : "border-[#123a62]/40 bg-[#0c1827]/40"
                }`}>
                  
                  {/* Rule Header */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-[#5bbcff] uppercase tracking-wider">Rule Details</span>
                      <h4 className="font-bold text-white tracking-tight">Reward: ${rule.rewardAmount.toFixed(2)}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {claimCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Earned ({claimCount}x)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Unearned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requirements Grid */}
                  <div className="bg-[#070e17] rounded-xl p-3 border border-[#132235] space-y-2 text-xs">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Threshold Demands</div>
                    
                    <div className="flex justify-between">
                      <span className="text-[#8aa4bf]">Leg A Minimum Volume:</span>
                      <span className="font-mono font-bold text-white">${rule.minLegAIncome.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8aa4bf]">Leg B Minimum Volume:</span>
                      <span className="font-mono font-bold text-white">${rule.minLegBIncome.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8aa4bf]">Leg C Minimum Volume:</span>
                      <span className="font-mono font-bold text-white">${rule.minLegCIncome.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Eligibility Gauge */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Destination Wallet:</span>
                      <span className="font-semibold text-[#5bbcff] uppercase text-[10px] bg-[#1ea0ff]/10 px-2 py-0.5 rounded-lg border border-[#1ea0ff]/20">
                        {rule.rewardWallet.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#132235]">
                      <div className={`h-2.5 w-2.5 rounded-full ${isEligibleToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                      <span className="text-xs text-[#8aa4bf]">
                        {isEligibleToday 
                          ? "Qualified with today's live business! Ready on next payout execution." 
                          : "Requires additional volume today in your top 3 legs to qualify."}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Claims History */}
      <div className="bg-[#09111c] border border-[#132235] rounded-[24px] p-5 space-y-4 shadow-md">
        <div className="border-b border-[#1d2d44]/60 pb-3 flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-[#5bbcff]" />
          <h3 className="font-bold text-white tracking-tight">Settlement Logs & Claims</h3>
        </div>

        <div className="overflow-x-auto">
          {claims.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8aa4bf] italic">
              No matching income payouts claimed or settled yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#132235] text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Rule/Reward Details</th>
                  <th className="py-3 px-4">Achieved Timestamp</th>
                  <th className="py-3 px-4 text-right">Settlement Wallet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132235]">
                {claims.map((claim) => {
                  const targetRule = rules.find(r => r.id === claim.ruleId);
                  return (
                    <tr key={claim.id} className="hover:bg-[#0c1827]/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">#CLAIM-{claim.id}</td>
                      <td className="py-3 px-4 font-semibold text-white">
                        ${targetRule ? targetRule.rewardAmount.toFixed(2) : "—"} USDT
                      </td>
                      <td className="py-3 px-4 text-[#8aa4bf]">
                        {new Date(claim.achievedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-emerald-400 uppercase text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          {targetRule ? targetRule.rewardWallet.replace(/_/g, " ") : "EARNING BALANCE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
