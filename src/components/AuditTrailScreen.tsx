import React, { useState } from 'react';
import { ShieldCheck, Search, Download, Lock, CheckCircle2 } from 'lucide-react';
import { AuditTrailLog } from '../types';

interface AuditTrailScreenProps {
  logs: AuditTrailLog[];
}

export const AuditTrailScreen: React.FC<AuditTrailScreenProps> = ({ logs }) => {
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = logs.filter((log) => {
    const matchCat = filterCat === 'ALL' || log.category === filterCat;
    const matchSearch =
      log.tenderId.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.officer.toLowerCase().includes(search.toLowerCase()) ||
      (log.bidderName && log.bidderName.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GeM_Audit_Trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0B1C30]">Cryptographic Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable tamper-evident ledger tracking all machine inferences and human officer decisions.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportJSON}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Ledger (.JSON)</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tender, bidder or officer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          {['ALL', 'VERIFICATION', 'DECISION', 'OVERRIDE', 'CLARIFICATION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-[#0F2C59] text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">OFFICER / AGENT</th>
                <th className="py-3 px-4">TENDER & BIDDER</th>
                <th className="py-3 px-4">ACTION & JUSTIFICATION</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">SHA-256 HASH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-800 whitespace-nowrap">
                    {log.officer}
                  </td>
                  <td className="py-3 px-4 font-sans whitespace-nowrap">
                    <div className="font-bold text-blue-700 font-mono">{log.tenderId}</div>
                    {log.bidderName && (
                      <div className="text-[11px] text-slate-500">{log.bidderName}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-sans max-w-sm">
                    <div className="font-semibold text-slate-900">{log.action}</div>
                    {log.justification && (
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {log.justification}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-sans whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      log.category === 'DECISION' ? 'bg-emerald-100 text-emerald-800' :
                      log.category === 'OVERRIDE' ? 'bg-purple-100 text-purple-800' :
                      log.category === 'CLARIFICATION' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleCopyHash(log.sha256, log.id)}
                      className="text-[11px] text-slate-600 hover:text-blue-700 hover:underline flex items-center gap-1 group"
                      title="Click to copy full SHA-256 hash"
                    >
                      <span>{log.sha256.substring(0, 14)}...</span>
                      {copiedId === log.id && (
                        <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
