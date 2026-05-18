"use client";

import React, { useState } from 'react';
import { 
  Calculator, 
  Settings, 
  HelpCircle, 
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Search,
  ArrowRight
} from 'lucide-react';

export default function CalculationsPage() {
  const [activeTab, setActiveTab] = useState('sim');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="text-indigo-600" />
            System Logic & Calculations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Developer tools for simulating and verifying complex compensation logic including Booster Slabs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors">
            <RefreshCw size={16} />
            Refresh Logic
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
            <TrendingUp size={16} />
            Run Simulation
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Logic Modules */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-slate-400" />
                Active Logic Modules
              </h2>
            </div>
            <div className="p-2">
              {[
                { name: 'Booster Slab (Working Gain)', desc: 'Multiplier-based cap extension', status: 'active', color: 'indigo' },
                { name: 'Fast-Start Bonus', desc: 'New registration windows', status: 'active', color: 'emerald' },
                { name: 'Level Income Matrix', desc: 'Unilevel multi-tier distribution', status: 'standby', color: 'amber' },
                { name: 'ROI Payout Engine', desc: 'Daily settlement system', status: 'active', color: 'sky' }
              ].map((mod, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-3 rounded-xl transition-all group hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 mb-1`}
                >
                  <div className={`w-1.5 h-8 rounded-full bg-${mod.color}-500/20 group-hover:bg-${mod.color}-500 transition-colors`}></div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{mod.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-medium">{mod.desc}</div>
                  </div>
                  <div className="ml-auto">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${mod.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500'}`}>
                      {mod.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
             <h3 className="font-bold flex items-center gap-2 mb-2">
               <AlertCircle size={20} />
               Logic Debugger
             </h3>
             <p className="text-indigo-100 text-sm mb-4 leading-relaxed">
               Need to verify the "Convert to ROI" math? Use the simulator to test how active plans are aggregated and boosted.
             </p>
             <button className="w-full py-2.5 bg-white text-indigo-700 rounded-xl font-bold text-sm shadow-inner hover:bg-indigo-50 transition-colors">
                Open Simulator
             </button>
          </div>
        </div>

        {/* Right Column: Dynamic Preview */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                 <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button className="px-4 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white">Active Simulation</button>
                    <button className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">Historical Logs</button>
                 </div>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search member wallet..." 
                      className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 ring-indigo-500 transition-all w-60"
                    />
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
                 <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Calculator size={40} className="text-slate-300" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">No active simulation</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                   Select a logic module or enter a member's wallet address to see how the system calculates their next compensation event.
                 </p>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 text-xs text-slate-500 flex justify-between">
                 <span>System Node: alpha-core-01</span>
                 <span className="flex items-center gap-1 font-mono">Status: <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> READY</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
