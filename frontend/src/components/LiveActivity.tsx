import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, Sparkles } from 'lucide-react';

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
    <div className="glass-panel rounded-2xl border border-slate-800 p-6 flex flex-col h-[320px]">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Outfit']">
            Live Stream Feed
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-ping' : status === 'reconnecting' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}
          />
          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${status === 'connected' ? 'text-emerald-400' : status === 'reconnecting' ? 'text-amber-300' : 'text-slate-500'}`}>
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

      {/* Terminal log logs */}
      <div className="flex-1 bg-slate-950/90 border border-slate-850 rounded-xl p-4 font-mono text-[10px] overflow-y-auto space-y-2 select-text shadow-inner">
        <span className="block text-slate-500 text-[9px] italic border-b border-slate-900 pb-1.5 mb-2">
          // Connection established on 127.0.0.1. Streaming live events...
        </span>
        
        {logs.length === 0 ? (
          <span className="block text-slate-600 italic">No incoming events. Scanning portals...</span>
        ) : (
          logs.map((log, idx) => {
            const isError = log.level === 'ERROR';
            const isWarning = log.level === 'WARNING';
            let colorClass = 'text-slate-350';
            
            if (isError) colorClass = 'text-rose-400 font-semibold';
            else if (isWarning) colorClass = 'text-amber-400';
            else if (log.message.includes('Tender Detected')) colorClass = 'text-brand-400 font-semibold text-glow-emerald';
            else if (log.message.includes('Score Generated') || log.message.includes('Report Generated')) colorClass = 'text-sky-400 font-semibold';

            return (
              <div key={idx} className="flex items-start space-x-2 leading-relaxed hover:bg-slate-900/40 p-0.5 rounded transition-all">
                <span className="text-slate-600 shrink-0 font-semibold">[{log.timestamp}]</span>
                <span className={`shrink-0 font-bold ${isError ? 'text-rose-500' : 'text-slate-500'}`}>
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
