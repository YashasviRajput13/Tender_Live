import React, { useState } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  Info,
  Cpu,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  TrendingUp,
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
  analyzingTenderId,
}: TenderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredTenders = tenders.filter((t) => {
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
        return (
          <span className="px-2.5 py-1 rounded-lg bg-primary-500/10 text-primary-600 border border-primary-500/20 text-[9px] font-bold uppercase tracking-wider animate-fade-in">
            Analyzed
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-warning/10 text-warning border border-warning/20 text-[9px] font-bold uppercase tracking-wider animate-pulse">
            Processing
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-550 border border-slate-200 text-[9px] font-bold uppercase tracking-wider">
            Discovered
          </span>
        );
    }
  };

  const getEligibilityBadge = (eligibility?: string, score?: number) => {
    if (!eligibility) return null;
    switch (eligibility) {
      case 'eligible':
        return (
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            <span className="text-[10px] font-bold text-success">Eligible</span>
          </div>
        );
      case 'partially_eligible':
        return (
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
            <span className="text-[10px] font-bold text-warning">Partial Match</span>
          </div>
        );
      case 'not_eligible':
        return (
          <div className="flex items-center space-x-1.5">
            <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
            <span className="text-[10px] font-bold text-danger">Not Eligible</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getScoreBar = (score?: number) => {
    if (score == null) return null;
    const color =
      score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-danger';
    const textColor =
      score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-danger';
    return (
      <div className="flex items-center space-x-2 mt-1.5">
        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`${color} h-1.5 rounded-full transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold font-mono ${textColor} w-8 text-right shrink-0`}>
          {score}
        </span>
      </div>
    );
  };

  // Count analyzed tenders for summary
  const analyzedCount = tenders.filter((t) => t.status === 'analyzed').length;
  const pendingCount = tenders.filter(
    (t) => t.status === 'discovered' || t.status === 'processing'
  ).length;

  return (
    <div className="p-8 space-y-6 select-none bg-white">

      {/* SUMMARY STRIP */}
      {tenders.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <TrendingUp className="w-3.5 h-3.5 text-primary-600" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-600">Sorted by Eligibility Score</span>
          </div>
          <span className="text-[11px] text-slate-550">
            <span className="text-primary-500 font-bold">{analyzedCount}</span> analyzed ·{' '}
            <span className="text-warning font-bold">{pendingCount}</span> pending analysis
          </span>
        </div>
      )}

      {/* FILTER PANEL */}
      <div className="glass-panel rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-premium">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by tender ID, keyword or agency..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:outline-none text-slate-800 text-xs transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-primary-500 text-slate-700"
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
            className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-primary-500 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="discovered">Discovered</option>
            <option value="processing">Processing</option>
            <option value="analyzed">AI Analyzed</option>
          </select>
        </div>
      </div>

      {/* TABLE DATA GRID */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-text">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                <th className="py-4.5 px-6 text-center w-16">#</th>
                <th className="py-4.5 px-6">Tender Details</th>
                <th className="py-4.5 px-6">Source & Portal</th>
                <th className="py-4.5 px-6">Estim. Budget</th>
                <th className="py-4.5 px-6">Deadline</th>
                <th className="py-4.5 px-6">Eligibility</th>
                <th className="py-4.5 px-6">Score / State</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-xs text-slate-700 bg-white">
              {filteredTenders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-550 font-medium">
                    No matching tenders found in local index.
                  </td>
                </tr>
              ) : (
                filteredTenders.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 transition-all group"
                  >
                    {/* Rank number */}
                    <td className="py-4 px-6 text-center">
                      {t.opportunity_score != null ? (
                        <span className={`text-xs font-mono font-black ${
                          idx === 0 ? 'text-warning' :
                          idx === 1 ? 'text-slate-500' :
                          idx === 2 ? 'text-orange-650' :
                          'text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Tender details */}
                    <td
                      onClick={() => onTenderSelect(t)}
                      className="py-4 px-6 max-w-sm cursor-pointer space-y-1"
                    >
                      <span className="font-mono text-[9px] text-primary-600 font-bold block">
                        {t.tender_id}
                      </span>
                      <h3 className="font-bold text-slate-900 group-hover:text-primary-500 truncate transition-all leading-snug">
                        {t.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate font-medium">
                        {t.department || 'Procurement Agency'}
                      </p>
                    </td>

                    {/* Source */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col space-y-1">
                        <span className="font-bold text-slate-800">{t.source_name}</span>
                        {t.source_url && (
                          <a
                            href={encodeURI(t.source_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-[10px] text-primary-600 hover:text-primary-700 font-semibold space-x-0.5"
                          >
                            <span>Bid Document</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="py-4 px-6 font-bold text-slate-900 font-mono text-[11px]">
                      {t.budget
                        ? `₹ ${t.budget >= 10000000
                            ? `${(t.budget / 10000000).toFixed(2)} Cr`
                            : `${(t.budget / 100000).toFixed(2)} L`}`
                        : <span className="text-slate-400 italic font-normal">Open Value</span>
                      }
                    </td>

                    {/* Deadline */}
                    <td className="py-4 px-6 font-mono text-slate-500 text-[10px]">
                      {t.deadline
                        ? new Date(t.deadline).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : <span className="text-slate-400">Not listed</span>
                      }
                    </td>

                    {/* Eligibility verdict */}
                    <td className="py-4 px-6">
                      {t.eligibility
                        ? getEligibilityBadge(t.eligibility, t.opportunity_score)
                        : (
                          <div className="flex items-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-medium">Pending</span>
                          </div>
                        )
                      }
                    </td>

                    {/* Score bar + status */}
                    <td className="py-4 px-6 min-w-[130px]">
                      {t.opportunity_score != null
                        ? getScoreBar(t.opportunity_score)
                        : getStatusBadge(t.status)
                      }
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2 shrink-0 select-none">
                      <button
                        onClick={() => onTenderSelect(t)}
                        className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-700 transition-all inline-flex items-center space-x-1"
                      >
                        <Info className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>

                      {/* Show manual analysis only for discovered tenders that haven't been auto-analyzed */}
                      {t.status === 'discovered' && analyzingTenderId !== t.id && (
                        <button
                          onClick={() => onRunAnalysis(t.id)}
                          className="py-1.5 px-3 rounded-lg bg-slate-105 hover:bg-primary-500/10 border border-slate-200 hover:border-primary-500/20 text-[10px] font-bold text-slate-600 hover:text-primary-600 transition-all inline-flex items-center space-x-1"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>Re-Analyse</span>
                        </button>
                      )}
                      {analyzingTenderId === t.id && (
                        <span className="py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-warning inline-flex items-center space-x-1">
                          <Cpu className="w-3 h-3 animate-spin" />
                          <span>Analysing...</span>
                        </span>
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
