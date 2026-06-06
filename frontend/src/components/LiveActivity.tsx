import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface ActivityLog {
  timestamp: string;
  level: string;
  message: string;
}

interface LiveActivityProps {
  logs: ActivityLog[];
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
}

export default function LiveActivity({ logs, status }: LiveActivityProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the bottom of the terminal on new logs
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[320px] shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#C9A84C]" />
          <h2 className="text-sm font-mono font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none">
            Live Stream Feed
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-[#C9A84C] animate-pulse' : status === 'reconnecting' ? 'bg-warning animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}
          />
          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${status === 'connected' ? 'text-[#C9A84C]' : status === 'reconnecting' ? 'text-warning' : 'text-slate-400 dark:text-slate-500'}`}>
            {status === 'connected'
              ? 'Streaming'
              : status === 'connecting'
              ? 'Connecting...'
              : status === 'reconnecting'
              ? 'Reconnecting'
              : 'Disconnected'}
          </span>
        </div>
      </div>
 
      {/* Terminal log area */}
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2 select-text shadow-inner">
        <span className="block text-slate-500 dark:text-slate-400 text-[10px] italic border-b border-slate-700 pb-1.5 mb-2">
          // Connection established on 127.0.0.1. Streaming live events...
        </span>
        
        {logs.length === 0 ? (
          <span className="block text-slate-600 italic">No incoming events. Scanning portals...</span>
        ) : (
          logs.map((log, idx) => {
            const isError = log.level === 'ERROR';
            const isWarning = log.level === 'WARNING';
            let colorClass = 'text-slate-300';
            
            if (isError) colorClass = 'text-danger font-semibold';
            else if (isWarning) colorClass = 'text-warning';
            else if (log.message.includes('Tender Detected')) colorClass = 'text-[#E6C89C] font-semibold text-glow-primary';
            else if (log.message.includes('Score Generated') || log.message.includes('Report Generated')) colorClass = 'text-secondary-400 font-semibold text-glow-secondary';
 
            return (
              <div key={idx} className="flex items-start space-x-2 leading-relaxed hover:bg-white/[0.03] p-0.5 rounded transition-all">
                <span className="text-slate-500 shrink-0 font-semibold">[{log.timestamp}]</span>
                <span className={`shrink-0 font-bold ${isError ? 'text-danger' : 'text-slate-500'}`}>
                  {log.level}:
                </span>
                <span className={`${colorClass} break-all`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
