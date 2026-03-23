'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  LayoutDashboard, TrendingUp, Users, DollarSign,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  MapPin, Building, Shield
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

// Color Palette matching Lighthouse/Modern SaaS
const COLORS = {
  teal: '#14b8a6',
  indigo: '#6366f1',
  orange: '#f97316',
  red: '#ef4444',
  green: '#22c55e',
  slate: '#64748b'
};

export default function CommandPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/analytics/overview');
      setData(res.data);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
    </div>
  );

  const { kpi, rate_shopping, recommendations, compliance, operations } = data || {};

  // Prepare Chart Data
  const rateData = rate_shopping?.competitors?.map((c: any) => ({
    name: c.source,
    price: c.rate,
    isParity: c.is_parity_issue
  })) || [];

  // Add Our Rate
  if (rate_shopping?.direct_rate) {
    rateData.unshift({
      name: 'Direct (Us)',
      price: rate_shopping.direct_rate,
      isParity: false,
      isUs: true
    });
  }

  return (
    <div className="p-6 md:p-8 max-w-[1920px] mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600 dark:text-indigo-400" /> Command Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time Hotel Operations & Market Intelligence</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-white dark:bg-slate-900 border dark:border-slate-800 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm flex items-center gap-2">
            <Building size={16} /> Grand Vista Hotel
          </span>
          <span className="bg-white dark:bg-slate-900 border dark:border-slate-800 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard title="Occupancy" value={`${kpi?.occupancy || 0}%`} trend="+5%" trendUp={true} color="teal" icon={<Users size={24} />} />
        <KPICard title="ADR" value={`₹${kpi?.adr?.toLocaleString() || 0}`} trend="+12%" trendUp={true} color="indigo" icon={<DollarSign size={24} />} />
        <KPICard title="RevPAR" value={`₹${kpi?.revpar?.toLocaleString() || 0}`} trend="-2%" trendUp={false} color="orange" icon={<TrendingUp size={24} />} />

        {/* Parity Alerts */}
        <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-900 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/50 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="text-red-900 dark:text-red-200 font-medium">Parity Alerts</span>
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg text-red-600 dark:text-red-300"><AlertTriangle size={20} /></div>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{compliance?.alerts || 0}</div>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">Competitors Undercutting</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 1. Rate Shopping Widget */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 lg:col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Rate Shopping</h3>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded font-medium">Live</span>
          </div>

          <div className="space-y-4">
            {rateData.map((item: any) => (
              <div key={item.name} className={`
                flex justify-between items-center p-3 rounded-xl transition-all
                ${item.isUs ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700'}
              `}>
                <div className={`font-medium flex items-center gap-2 ${item.isUs ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                  {item.name}
                  {item.isParity && <AlertTriangle size={14} className="text-red-500" />}
                </div>
                <div className={`font-bold font-mono ${item.isUs ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                  ₹{item.price?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rateData}>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                  {rateData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.isUs ? COLORS.indigo : entry.isParity ? COLORS.red : COLORS.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Pricing Recommendations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 lg:col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Smart Pricing</h3>
            <span className="text-xs text-slate-400">AI Powered</span>
          </div>

          {recommendations?.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No adjustments needed.</div>
          ) : (
            <div className="space-y-4">
              {recommendations?.map((rec: any, idx: number) => (
                <div key={idx} className="border dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/50 hover:shadow-md transition-shadow">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{rec.room_type}</span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full font-bold">+15%</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">₹{rec.recommended_price}</span>
                    <span className="text-sm text-slate-400 line-through mb-1">₹{rec.current_price}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{rec.reason}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Apply</button>
                    <button className="flex-1 bg-white dark:bg-slate-800 border dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">Ignore</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Operations & Compliance */}
        <div className="space-y-6 lg:col-span-1">

          {/* Guest Shield */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Guest Verify</h3>
              <Shield className="text-teal-500" size={20} />
            </div>
            <div className="space-y-3">
              <ComplianceRow label="Aadhaar Verified" value={compliance?.verified || 0} color="green" />
              <ComplianceRow label="Pending IDs" value={compliance?.pending || 0} color="orange" />
              <ComplianceRow label="Police Alerts" value={compliance?.alerts || 0} color="red" />
            </div>
            <button className="w-full mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline text-left">View Compliance Report &rarr;</button>
          </div>

          {/* Staff Stats */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Staff On Duty</h3>
              <Users className="text-slate-400" size={20} />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-slate-800 dark:text-white">{operations?.on_duty || 0}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Active Staff Members</div>
            </div>
            <div className="mt-4 pt-4 border-t dark:border-slate-800 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Pending Check-ins</span>
              <span className="font-bold dark:text-slate-200">{operations?.checkins_pending || 0}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Housekeeping Tasks</span>
              <span className="font-bold dark:text-slate-200">{operations?.housekeeping_tasks || 0}</span>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Graph Section */}
      <div className="mt-8 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Market Trends</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Booking Velocity vs Competitor Rates</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { day: 'Mon', us: 4000, market: 3800 },
              { day: 'Tue', us: 4200, market: 3900 },
              { day: 'Wed', us: 4500, market: 4600 },
              { day: 'Thu', us: 4800, market: 4700 },
              { day: 'Fri', us: 5500, market: 5200 },
              { day: 'Sat', us: 6000, market: 5800 },
              { day: 'Sun', us: 5800, market: 5600 },
            ]}>
              <defs>
                <linearGradient id="colorUs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
              <Area type="monotone" dataKey="us" stroke={COLORS.indigo} fillOpacity={1} fill="url(#colorUs)" strokeWidth={2} />
              <Area type="monotone" dataKey="market" stroke={COLORS.slate} strokeDasharray="5 5" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function KPICard({ title, value, trend, trendUp, color, icon }: any) {
  const bgColors: any = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 card-hover transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-500 dark:text-slate-400 font-medium text-sm border dark:border-slate-700 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800">{title}</span>
        <div className={`p-2 rounded-lg ${bgColors[color] || 'bg-slate-50'}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{value}</h3>
        <span className={`text-sm font-bold flex items-center mb-1 ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trend}
        </span>
      </div>
    </div>
  );
}

function ComplianceRow({ label, value, color }: any) {
  // For Dark mode we override manually
  let darkClass = '';
  // Actually, I can just use conditional logic inline or simple classes
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color === 'green' ? 'bg-green-500' : color === 'orange' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
        <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>
      </div>
      <span className="font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
