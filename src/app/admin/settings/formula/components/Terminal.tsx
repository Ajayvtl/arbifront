import React, { useState } from 'react';
import { Terminal as TerminalIcon, X, Trash2, ChevronDown, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface LogEntry {
  id: string;
  type: string;
  timestamp: string;
  message?: string;
  status?: 'success' | 'error' | 'pending';
}

interface TerminalProps {
  logs: LogEntry[];
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onClear, isOpen, onToggle }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (logs.length === 0) return;
    const text = logs.map(l => `[${l.timestamp.split('T')[1].split('.')[0]}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Logs copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={onToggle}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white hover:border-emerald-500/50 transition-all z-50 group"
      >
        <TerminalIcon className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
        Execution Console ({logs.length})
        <ChevronDown className="w-3 h-3 rotate-180 opacity-50" />
      </button>
    );
  }

  return (
    <div className="h-64 bg-[#060c14] border-t border-slate-800 flex flex-col font-mono relative z-40 animate-in slide-in-from-bottom-full duration-300 selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1626] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Console</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={copyToClipboard}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black transition-all ${
                copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'COPIED' : 'COPY TRACE'}
          </button>
          <div className="w-[1px] h-3 bg-slate-800" />
          <button 
            onClick={onClear}
            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onToggle}
            className="text-slate-500 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-[#060c14] select-text">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
            <TerminalIcon className="w-8 h-8" />
            <p className="text-xs">Console is empty. Start a simulation to see logs.</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={`${log.id}-${i}`} className="flex gap-3 text-[11px] leading-relaxed group border-l border-transparent hover:border-emerald-500/30 pl-1 transition-all">
              <span className="text-slate-600 shrink-0 select-none font-medium opacity-50">
                {log.timestamp.split('T')[1].split('.')[0]}
              </span>
              <span className={`font-black shrink-0 min-w-[75px] ${
                log.type === 'trigger' ? 'text-purple-400' : 
                log.type === 'condition' ? 'text-amber-400' :
                log.type === 'action' ? 'text-orange-400' : 
                log.type === 'math' ? 'text-cyan-400' :
                log.type === 'system' ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                [{log.type.toUpperCase()}]
              </span>
              <span className="text-slate-300">
                {log.type !== 'system' && (
                    <span className="text-slate-500 font-bold mr-1">#{log.id}</span>
                )}
                {log.message?.includes('Error') ? (
                    <span className="text-rose-400 font-bold">{log.message}</span>
                ) : log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
