import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Play, 
  Cpu, 
  ExternalLink,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Tender } from '../types';

interface TenderListProps {
  tenders: Tender[];
  onTenderSelect: (tender: Tender) => void;
  onRunAnalysis: (tenderId: number) => void;
  analyzingTenderId: number | null;
}

export default function TenderList({ 
  tenders, 
  onTenderSelect, 
  onRunAnalysis,
  analyzingTenderId 
}: TenderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Perform dynamic filtering
  const filteredTenders = tenders.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tender_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesSource = sourceFilter === 'ALL' || t.source_name.toUpperCase() === sourceFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    
    return matchesSearch && matchesSource && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyzed':
        return <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[9px] font-bold uppercase tracking-wider">Analyzed</span>;
      case 'processing':
        return <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider animate-pulse">Processing</span>;
      default:
        return <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-bold uppercase tracking-wider">Discovered</span>;
    }
  };

  return (
    <div className="p-8 space-y-6">
      
      {/* FILTER PANEL */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by tender ID, keyword or agency..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 focus:border-brand-500 focus:outline-none text-slate-200 text-xs transition-all shadow-inner"
          />
        </div>

        {/* Source & Status filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs focus:outline-none focus:border-brand-500 text-slate-300"
            >
              <option value="ALL">All Portals</option>
              <option value="GEM">GeM Only</option>
              <option value="CPPP">CPPP Only</option>
              <option value="MANUAL UPLOAD">Uploads Only</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs focus:outline-none focus:border-brand-500 text-slate-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="discovered">Discovered</option>
            <option value="processing">Processing</option>
            <option value="analyzed">AI Analyzed</option>
          </select>
        </div>
      </div>

      {/* TABLE DATA GRID */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A] border-b border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Tender Details</th>
                <th className="py-4 px-6">Source & Portal</th>
                <th className="py-4 px-6">Estim. Budget</th>
                <th className="py-4 px-6">Deadline</th>
                <th className="py-4 px-6">Pipeline State</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredTenders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium bg-[#0B0F19]/25">
                    No matching tenders found in local index.
                  </td>
                </tr>
              ) : (
                filteredTenders.map((t) => (
                  <tr 
                    key={t.id} 
                    className="hover:bg-slate-800/20 transition-all group"
                  >
                    <td 
                      onClick={() => onTenderSelect(t)}
                      className="py-4.5 px-6 max-w-sm cursor-pointer space-y-1.5"
                    >
                      <span className="font-mono text-[10px] text-brand-400 font-bold block">
                        {t.tender_id}
                      </span>
                      <h3 className="font-bold text-slate-200 group-hover:text-white truncate transition-all">
                        {t.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate">
                        {t.department || 'Procurement Agency'}
                      </p>
                    </td>
                    <td className="py-4.5 px-6">
                      <div className="flex flex-col space-y-1">
                        <span className="font-bold text-slate-300">{t.source_name}</span>
                        {t.source_url && (
                          <a 
                            href={encodeURI(t.source_url)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center text-[10px] text-brand-400 hover:text-brand-500 font-semibold space-x-0.5"
                          >
                            <span>Bid Doc Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-4.5 px-6 font-bold text-slate-200">
                      {t.budget 
                        ? `₹ ${t.budget >= 10000000 
                          ? `${(t.budget / 10000000).toFixed(2)} Cr` 
                          : `${(t.budget / 100000).toFixed(2)} L`}` 
                        : <span className="text-slate-500 italic">Open Value</span>
                      }
                    </td>
                    <td className="py-4.5 px-6 font-mono text-slate-400 text-[10px]">
                      {t.deadline 
                        ? new Date(t.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span className="text-slate-500">Not listed</span>
                      }
                    </td>
                    <td className="py-4.5 px-6">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="py-4.5 px-6 text-right space-x-2 shrink-0">
                      <button
                        onClick={() => onTenderSelect(t)}
                        className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[10px] font-bold text-slate-300 transition-all inline-flex items-center space-x-1"
                      >
                        <Info className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>

                      {t.status === 'discovered' && (
                        <button
                          onClick={() => onRunAnalysis(t.id)}
                          disabled={analyzingTenderId === t.id}
                          className="py-1.5 px-3 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 disabled:text-slate-500 text-[10px] font-bold text-slate-950 shadow-md disabled:shadow-none hover:scale-[1.02] disabled:scale-100 transition-all inline-flex items-center space-x-1 border border-transparent disabled:border-slate-800"
                        >
                          <Cpu className={`w-3 h-3 ${analyzingTenderId === t.id ? 'animate-spin' : ''}`} />
                          <span>{analyzingTenderId === t.id ? 'Analyzing...' : 'Run AI Analysis'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
