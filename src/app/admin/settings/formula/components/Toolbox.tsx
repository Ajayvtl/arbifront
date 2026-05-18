import React, { useState, useMemo } from 'react';
import {
  Zap, Split, Wallet, Calculator, Repeat, Search,
  Database, UserCheck, Package, TrendingUp, Users, Code, Activity, Layout, MessageSquare,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Clock, X, BarChart3, Gift, Bell, ShieldCheck
} from 'lucide-react';

type NodeItem = {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  [key: string]: unknown;
};

const NODE_TYPES: Array<{ category: string; items: NodeItem[]; color: string }> = [
  {
    category: 'Triggers',
    items: [
      { type: 'trigger', label: 'Manual Trigger', description: 'Starts flow manually for sandbox tests.', icon: Zap },
      { type: 'trigger', label: 'On Registration', description: 'Runs when a member registers.', icon: Users },
      { type: 'trigger', label: 'On Activation', description: 'Runs when a member gets activated.', icon: Package },
      { type: 'trigger', label: 'On Subscription', description: 'Runs on package/subscription purchase.', icon: TrendingUp },
      { type: 'trigger', label: 'On Dashboard Load', description: 'Auto-syncs stats whenever the member logs in.', icon: Activity, event: 'ON_DASHBOARD_LOAD' },
    ],
    color: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  },
  {
    category: 'Context (Fetchers)',
    items: [
      { type: 'context', label: 'Get Direct Count', description: 'Loads direct referral count into a variable.', icon: Users, variable: 'DIRECT_COUNT' },
      { type: 'context', label: 'Get Team Volume', description: 'Loads team/direct business volume from DB.', icon: Database, variable: 'DIRECT_VOLUME' },
      { type: 'context', label: 'Order Details', description: 'Loads current order and package details.', icon: Package, variable: 'ORDER_AMOUNT' },
      { type: 'context', label: 'Fetch Uplines', description: 'Loads the upline chain for level traversals.', icon: UserCheck, variable: 'UPLINE_CHAIN' },
      { type: 'wallets', label: 'Wallets Portfolio', description: 'Live sync for all member balances (Main, ROI, Team, etc.)', icon: Wallet },
      { type: 'total_investment', label: 'Total Capital', description: 'Fetches total active investment volume for a member.', icon: TrendingUp },
    ],
    color: 'border-teal-500/50 bg-teal-500/10 text-teal-400',
  },
  {
    category: 'Logic & Code',
    items: [
      { type: 'condition', label: 'Logical Condition', description: 'Compares two values (If A > B) to branch flow.', icon: Split },
      { type: 'logic_gate', label: 'Logic Gate (AND/OR)', description: 'Combines multiple checks with AND/OR.', icon: Zap },
      { type: 'switch', label: 'Value Switch / Router', description: 'Routes execution to case-specific outputs.', icon: Split },
      { type: 'math', label: 'Math Operation', description: 'Calculates and writes output variables.', icon: Calculator },
      { type: 'scheduler', label: 'Time Scheduler', description: 'Calculates remaining time and execution windows.', icon: Clock, targetTime: '12:00', timezone: 'UTC' },
      { type: 'script', label: 'JS Script (Beta)', description: 'Executes custom JavaScript inside flow context.', icon: Code },
      { type: 'loop', label: 'Loop (Path)', description: 'Traverses upline/downline paths for each hop.', icon: Repeat },
    ],
    color: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  },
  {
    category: 'Actions',
    items: [
      { type: 'action', label: 'Credit Wallet', description: 'Credits a selected wallet bucket.', icon: Wallet },
      { type: 'action', label: 'ROI Progress', description: 'Updates subscription ROI progress counters.', icon: TrendingUp, actionType: 'UPDATE_SUBSCRIPTION_PROGRESS' },
      { type: 'action', label: 'Qualify Booster', description: 'Evaluates booster qualification.', icon: Zap },
      { type: 'action', label: 'Status Update', description: 'Updates member/account status.', icon: UserCheck },
      { type: 'send_notification', label: 'Send Notification', description: 'Alert users with custom title/msg.', icon: Bell, title: 'Alert', message: 'Enter msg...', notificationType: 'SYSTEM' },
      { type: 'account_executive', label: 'Account Executive', description: 'Admin control for ROI & Status.', icon: ShieldCheck, actionType: 'STOP_ROI' },
      { type: 'fast_track_action', label: 'Fast-Track Action', description: 'Forces activation and grants free package.', icon: Zap },
      { type: 'action', label: 'Webhook (cURL)', description: 'Sends results to an external API (Webhook/JSON).', icon: Code, actionType: 'WEBHOOK' },
      { type: 'member_registration_test', label: 'Member Registration Test', description: 'Simulation helper for registration event.', icon: Users },
      { type: 'activate_member_test', label: 'Member Activation Test', description: 'Simulation helper for activation event.', icon: UserCheck },
    ],
    color: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  },
  {
    category: 'MLM Slabs & Rewards',
    items: [
      { type: 'user_hub', label: 'Member Hub', description: 'Discovery tool for member status, sponsor, and latest order.', icon: Users },
      { type: 'rank_hub', label: 'Rank & Reward Hub', description: 'Member-wise rank tracing: active state, reward, days, and start timestamp.', icon: ShieldCheck, requireActivation: false },
      { type: 'subscription_list', label: 'Subscription Hub', description: 'Fetches collection of all active packages for a member.', icon: Database },
      { type: 'order_hub', label: 'Order Hub', description: 'Deep ROI analytics, caps, and detailes for specific orders.', icon: Package },
      { type: 'wallet_splitter', label: 'Financial Splitter', description: 'Splits income into Payout and Repurchase buckets.', icon: Split, payoutRatio: 80 },
      { type: 'booster_slab', label: 'Booster Slab Matrix', description: 'Applies configured booster slabs and caps.', icon: Zap },
      { type: 'level_income', label: 'Level Income', description: 'Configures generation-wise level income payout.', icon: Users },
      { type: 'fast_start', label: 'Fast Start Bonus', description: 'Configures fast start bonus conditions.', icon: TrendingUp },
      { type: 'plan_context', label: 'Plan Data Context', description: 'Injects package simulation context.', icon: Package },
      { type: 'plan_catalog', label: 'Plan Catalog Node', description: 'Select plan from live catalog with search and full plan outputs.', icon: Package, outputWallet: 'roi_balance' },
    ],
    color: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  },
  {
    category: 'Developer & Diagnostics',
    items: [
      { type: 'display', label: 'Universal Display', description: 'Real-time diagnostic readout for any graph variable.', icon: Activity },
      { type: 'sub_flow', label: 'Sub-Flow Trigger', description: 'Calls another saved flow by key.', icon: Repeat },
      { type: 'group', label: 'Group Frame', description: 'Visual container to organize related nodes.', icon: Layout, color: '#10b981', comment: '' },
      { type: 'comment', label: 'Comment Note', description: 'Sticky note for docs, hints, and reviews.', icon: MessageSquare, comment: 'Add notes...' },
    ],
    color: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
  },
  {
    category: 'Dashboard UX',
    items: [
      { type: 'dashboard_card', label: 'Card: Total Earning', description: 'Rename/Toggle the Total Earning card.', icon: Layout, cardKey: 'TOTAL_EARNING' },
      { type: 'dashboard_card', label: 'Card: Est. Total ROI', description: 'Rename/Toggle the Estimated ROI card.', icon: Activity, cardKey: 'EST_TOTAL_ROI' },
      { type: 'dashboard_card', label: 'Card: Est. Working', description: 'Rename/Toggle the Estimated Working card.', icon: Zap, cardKey: 'EST_WORKING' },
      { type: 'dashboard_card', label: 'Card: Del. ROI', description: 'Rename/Toggle the Delivered ROI card.', icon: BarChart3, cardKey: 'DEL_ROI' },
      { type: 'dashboard_card', label: 'Card: Del. Working', description: 'Rename/Toggle the Delivered Working card.', icon: Gift, cardKey: 'DEL_WORKING' },
      { type: 'dashboard_card', label: 'Card: Withdrawable', description: 'Rename/Toggle the Withdrawable card.', icon: Wallet, cardKey: 'WITHDRAWABLE' },
    ],
    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  },
  {
    category: 'Database Operations',
    items: [
      { type: 'db_fetch', label: 'DB Fetch', description: 'Loads a value from Users/Wallets tables for a targeted member.', icon: Database, table: 'users', column: 'status' },
      { type: 'db_update', label: 'DB Update', description: 'Updates a specific database column for a targeted member.', icon: Database, table: 'users', column: 'status' },
    ],
    color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
  },
];

export const Toolbox = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(NODE_TYPES.map((cat) => [cat.category, true]))
  );

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return NODE_TYPES;
    const query = searchQuery.toLowerCase();
    
    return NODE_TYPES.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.label.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        cat.category.toLowerCase().includes(query)
      )
    })).filter(cat => cat.items.length > 0);
  }, [searchQuery]);

  const onDragStart = (event: React.DragEvent, item: NodeItem) => {
    event.dataTransfer.setData('application/reactflow', item.type);
    event.dataTransfer.setData('application/label', item.label);
    event.dataTransfer.setData('application/extra', JSON.stringify({ ...item }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleSection = (name: string) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className={`${collapsed ? 'w-20' : 'w-72'} bg-[#0d1626] border-r border-slate-800 flex flex-col overflow-hidden transition-all duration-200 shadow-2xl`}>
      <div className="p-4 border-b border-slate-800 bg-[#060c14]/50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Database className="w-3.5 h-3.5" /> Engine Parts
            </h2>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg border border-slate-700 bg-slate-900/60 p-1.5 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            title={collapsed ? 'Expand library' : 'Collapse library'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within/search:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#060c14] border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-[11px] font-bold text-slate-300 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#0d1626]">
        {filteredNodes.length > 0 ? filteredNodes.map((cat) => (
          <div key={cat.category} className="space-y-3">
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleSection(cat.category)}
                className="w-full flex items-center justify-between text-[9px] font-black text-slate-600 uppercase tracking-[0.15em] hover:text-slate-300 transition-colors group/cat"
              >
                <span className="flex items-center gap-2">
                   <div className="w-1 h-3 rounded-full bg-slate-800 group-hover/cat:bg-slate-600 transition-colors" />
                   {cat.category}
                </span>
                {openSections[cat.category] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}

            {(collapsed || openSections[cat.category]) && (
              <div className={collapsed ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
                {cat.items.map((item) => (
                  <div key={`${cat.category}-${item.label}`} className="group relative">
                    <div
                      className={`flex items-center ${collapsed ? 'justify-center border-none py-3' : 'gap-3 p-3'} rounded-xl border text-xs font-bold cursor-grab active:cursor-grabbing transition-all hover:brightness-110 hover:-translate-y-0.5 hover:shadow-lg ${cat.color}`}
                      onDragStart={(event) => onDragStart(event, item)}
                      draggable
                    >
                      <item.icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && (
                      <div className="pointer-events-none absolute left-0 top-0 w-full h-full rounded-xl border-2 border-transparent group-hover:border-white/10 transition-all" />
                    )}

                    <div className={`pointer-events-none absolute z-50 hidden group-hover:block ${collapsed ? 'left-full top-1/2 ml-3 -translate-y-1/2' : 'left-full top-0 ml-3'}`}>
                      <div className="w-64 rounded-2xl border border-slate-700 bg-[#060c14] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 mb-2">
                           <div className={`p-1.5 rounded-lg border ${cat.color}`}>
                              <item.icon className="w-3.5 h-3.5" />
                           </div>
                           <div className="text-[11px] font-black uppercase tracking-widest text-slate-100">{item.label}</div>
                        </div>
                        <div className="text-[10px] leading-relaxed text-slate-400 font-medium">{item.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
             <div className="p-4 bg-slate-900/50 rounded-full border border-slate-800">
               <Search className="w-6 h-6 text-slate-700" />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase">No Matches</p>
                <p className="text-[10px] text-slate-700 mt-1 max-w-[140px]">We couldn't find any nodes matching your search.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
