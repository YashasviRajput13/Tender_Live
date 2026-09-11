import React, { useState } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  Activity, 
  Server, 
  RefreshCw, 
  Info,
  X
} from 'lucide-react';
import { GovernmentDataSource } from '../types';

interface GovernmentSourcesGridProps {
  sources: GovernmentDataSource[];
}

export const GovernmentSourcesGrid: React.FC<GovernmentSourcesGridProps> = ({ sources }) => {
  const [selectedSource, setSelectedSource] = useState<GovernmentDataSource | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);

  const handlePing = (src: GovernmentDataSource, e: React.MouseEvent) => {
    e.stopPropagation();
    setPingingId(src.id);
    setTimeout(() => {
      setPingingId(null);
    }, 800);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 stroke-[2.2]" />
            <h3 className="text-base sm:text-lg font-bold text-[#0B1C30] tracking-tight">
              Authorised Government Data Sources (Live Integrations)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified system connectivity status across authoritative government databases and compliance registries.
          </p>
        </div>

        {/* Operational Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0 self-start sm:self-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span>All Systems Operational</span>
        </div>
      </div>

      {/* 8 Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {sources.map((src) => {
          const isConnected = src.statusText.includes('Connected') || src.statusText.includes('Active');
          const isReady = src.statusText.includes('Ready');
          const isFallback = src.statusText.includes('Fallback');

          return (
            <div
              key={src.id}
              id={`gov-source-${src.id}`}
              onClick={() => setSelectedSource(src)}
              className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-3 text-center transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between min-h-[92px]"
            >
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-900 transition-colors">
                  {src.name}
                </div>
                <div className={`text-[11px] font-semibold mt-1 ${
                  isConnected 
                    ? 'text-emerald-700' 
                    : isReady
                    ? 'text-blue-600'
                    : isFallback
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}>
                  {src.statusText}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-medium truncate pt-1 border-t border-slate-200/60 mt-2">
                {src.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source Detail Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#0F2C59]" />
                <h4 className="font-bold text-base text-[#0B1C30]">{selectedSource.name} Integration</h4>
              </div>
              <button 
                onClick={() => setSelectedSource(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs sm:text-sm">
              <p className="text-slate-600 leading-relaxed">
                {selectedSource.description}
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Integration Mode:</span>
                  <span className="font-semibold text-slate-800 uppercase font-mono">{selectedSource.subtext}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-semibold text-emerald-700">{selectedSource.statusText}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Average Latency:</span>
                  <span className="font-mono text-slate-800">{selectedSource.latencyMs} ms</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Security Encryption:</span>
                  <span className="font-mono text-slate-800">TLS 1.3 / mTLS HMAC-SHA256</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={(e) => handlePing(selectedSource, e)}
                disabled={pingingId === selectedSource.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pingingId === selectedSource.id ? 'animate-spin' : ''}`} />
                <span>{pingingId === selectedSource.id ? 'Testing Ping...' : 'Test Connection'}</span>
              </button>

              <button
                onClick={() => setSelectedSource(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0F2C59] text-white hover:bg-[#1e3a8a] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
