"use client";

import React from 'react';
import { FlaskConical, Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PlaceholderPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mb-8 animate-bounce">
         <FlaskConical className="text-indigo-600 dark:text-indigo-400" size={48} />
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
        Experimental Feature Area
      </h1>
      
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-10 leading-relaxed text-lg">
        This space is reserved for future system enhancements and experimental developer tools. Check back later for new core logic modules.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link 
          href="/developer/dashboard"
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-105 transition-all"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold border border-slate-200 dark:border-slate-700">
           <Construction size={18} />
           Under Construction
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
         <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
               <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Module Pipeline</h4>
            <p className="text-xs text-slate-500">Scheduled for 1.4.0 rollout.</p>
         </div>
         <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left">
            <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4">
               <div className="w-4 h-4 rounded-full bg-sky-500"></div>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">API Sandbox</h4>
            <p className="text-xs text-slate-500">REST endpoint generator.</p>
         </div>
         <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
               <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">Audit Vault</h4>
            <p className="text-xs text-slate-500">Encrypted sequence logs.</p>
         </div>
      </div>
    </div>
  );
}
