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
          <span className="px-2 py-0.5 rounded-md bg-[#C9A84C]/15 text-[#8A662D] dark:text-[#E6C89C] border border-[#C9A84C]/40 text-[10px] font-black uppercase tracking-wider">
            Analyzed
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
            Processing
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-850 text-slate-850 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
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
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#C9A84C]/15 border border-[#C9A84C]/45 text-[#8A662D] dark:text-[#E6C89C] text-[10px] font-black uppercase tracking-wider inline-flex">
            <CheckCircle2 className="w-3 h-3 text-[#8A662D] dark:text-[#E6C89C] shrink-0 mr-0.5" />
            <span>Eligible</span>
          </div>
        );
      case 'partially_eligible':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider inline-flex">
            <AlertCircle className="w-3 h-3 text-slate-700 dark:text-slate-300 shrink-0 mr-0.5" />
            <span>Partial Match</span>
          </div>
        );
      case 'not_eligible':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider inline-flex">
            <XCircle className="w-3 h-3 text-slate-700 dark:text-slate-300 shrink-0 mr-0.5" />
            <span>Not Eligible</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getScoreBar = (score?: number) => {
    if (score == null) return null;
    return (
      <div className="flex items-center space-x-1.5 mt-1">
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
          <div
            className="bg-[#C9A84C] h-1 rounded-full transition-all duration-700"
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-[10px] font-bold font-mono text-slate-900 dark:text-white w-6 text-right shrink-0">
          {score}
        </span>
      </div>
    );
  };

  const analyzedCount = tenders.filter((t) => t.status === 'analyzed').length;
  const pendingCount = tenders.filter(
    (t) => t.status === 'discovered' || t.status === 'processing'
  ).length;

  return (
    <div className="p-8 space-y-6 select-none bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">

      {/* SUMMARY STRIP */}
      {tenders.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25">
            <TrendingUp className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#A07840] dark:text-[#C9A84C]">Sorted by Eligibility Score</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[#C9A84C] font-bold">{analyzedCount}</span> analyzed ·{' '}
            <span className="text-slate-800 dark:text-slate-200 font-bold">{pendingCount}</span> pending analysis
          </span>
        </div>
      )}

      {/* FILTER PANEL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm hover:border-[#C9A84C]/25 dark:hover:border-[#C9A84C]/45 transition-colors">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by tender ID, keyword or agency..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-350 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/15 focus:outline-none text-slate-800 dark:text-slate-100 text-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#C9A84C] text-slate-700 dark:text-slate-300 cursor-pointer"
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
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#C9A84C] text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="discovered">Discovered</option>
            <option value="processing">Processing</option>
            <option value="analyzed">AI Analyzed</option>
          </select>
        </div>
      </div>

      {/* TABLE DATA GRID */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-text">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-4 w-[30%] min-w-[220px]">Tender Details</th>
                <th className="py-3.5 px-4 w-[15%] min-w-[120px]">Source & Portal</th>
                <th className="py-3.5 px-4 w-[11%] min-w-[95px]">Estim. Budget</th>
                <th className="py-3.5 px-4 w-[11%] min-w-[95px]">Deadline</th>
                <th className="py-3.5 px-4 w-[11%] min-w-[110px]">Eligibility</th>
                <th className="py-3.5 px-4 w-[11%] min-w-[120px]">Score / State</th>
                <th className="py-3.5 px-4 w-[11%] min-w-[130px] xl:min-w-[280px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
              {filteredTenders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No matching tenders found in local index.
                  </td>
                </tr>
              ) : (
                filteredTenders.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[#C9A84C]/[0.025] dark:hover:bg-[#C9A84C]/[0.05] transition-all group border-b border-slate-100 dark:border-slate-800"
                  >
                    {/* Rank number */}
                    <td className="py-3 px-3 text-center">
                      {t.opportunity_score != null ? (
                        <span className={`text-[12px] font-mono font-black ${
                          idx === 0 ? 'text-[#C9A84C]' :
                          idx === 1 ? 'text-slate-700 dark:text-slate-350' :
                          idx === 2 ? 'text-slate-550 dark:text-slate-400' :
                          'text-slate-355 dark:text-slate-650'
                        }`}>
                          #{idx + 1}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-650 text-[12px]">—</span>
                      )}
                    </td>

                    {/* Tender details */}
                    <td
                      onClick={() => onTenderSelect(t)}
                      className="py-3.5 px-4 w-[30%] min-w-[220px] cursor-pointer space-y-1"
                    >
                      <span className="font-mono text-[11px] text-[#8A662D] dark:text-[#E6C89C] font-extrabold block">
                        {t.tender_id}
                      </span>
                      <h3 className="font-black text-[13px] text-slate-900 dark:text-white group-hover:text-[#C9A84C] truncate transition-colors leading-snug">
                        {t.title}
                      </h3>
                      <p className="text-[12px] text-slate-750 dark:text-slate-300 truncate font-semibold">
                        {t.department || 'Procurement Agency'}
                      </p>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4 w-[15%] min-w-[120px]">
                      <div className="flex flex-col space-y-1">
                        <span className="font-black text-[13px] text-slate-900 dark:text-white">{t.source_name}</span>
                        {t.source_url && (
                          <a
                            href={t.source_url}
                            target="_blank"
<<<<<<< Updated upstream
rel="noreferrer noopener"
className="flex items-center text-[10px] text-primary-600 hover:text-primary-700 font-semibold space-x-0.5"
onClick={(e) => e.stopPropagation()}
=======
                            rel="noreferrer"
                            className="flex items-center text-[11px] text-[#8A662D] dark:text-[#E6C89C] hover:text-[#A07840] dark:hover:text-gold-400 font-extrabold space-x-1 transition-colors whitespace-nowrap inline-flex"
>>>>>>> Stashed changes
                          >
                            <span>Bid Document</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="py-3.5 px-4 w-[11%] min-w-[95px] font-extrabold text-slate-900 dark:text-white font-mono text-[12px] whitespace-nowrap">
                      {t.budget
                        ? `₹ ${t.budget >= 10000000
                            ? `${(t.budget / 10000000).toFixed(2)} Cr`
                            : `${(t.budget / 100000).toFixed(2)} L`}`
                        : <span className="text-slate-700 dark:text-slate-300 italic font-medium">Open Value</span>
                      }
                    </td>

                    {/* Deadline */}
                    <td className="py-3.5 px-4 w-[11%] min-w-[95px] font-mono font-bold text-slate-800 dark:text-slate-200 text-[12px] whitespace-nowrap">
                      {t.deadline
                        ? new Date(t.deadline).toLocaleDateString(undefined, {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : <span className="text-slate-600 dark:text-slate-400 italic font-medium">Not listed</span>
                      }
                    </td>

                    {/* Eligibility verdict */}
                    <td className="py-3.5 px-4 w-[11%] min-w-[110px] whitespace-nowrap">
                      {t.eligibility
                        ? getEligibilityBadge(t.eligibility, t.opportunity_score)
                        : (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-550 dark:text-slate-400 shrink-0" />
                            <span className="text-[12px] text-slate-750 dark:text-slate-300 font-bold">Pending</span>
                          </div>
                        )
                      }
                    </td>

                    {/* Score bar + status */}
                    <td className="py-3.5 px-4 w-[11%] min-w-[120px] whitespace-nowrap">
                      {t.opportunity_score != null
                        ? getScoreBar(t.opportunity_score)
                        : getStatusBadge(t.status)
                      }
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 w-[11%] min-w-[130px] xl:min-w-[280px] text-right select-none">
                      <div className="flex flex-col xl:flex-row xl:justify-end gap-1.5 items-stretch xl:items-center">
                        <button
                          onClick={() => onTenderSelect(t)}
                          className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-[#C9A84C] hover:text-white hover:border-[#C9A84C] dark:hover:bg-[#C9A84C] dark:hover:text-black dark:hover:border-[#C9A84C] font-extrabold text-[12px] transition-all inline-flex items-center justify-center space-x-1.5 shadow-sm whitespace-nowrap w-full xl:w-28 h-8"
                        >
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Inspect</span>
                        </button>

                        {t.status === 'discovered' && analyzingTenderId !== t.id && (
                          <button
                            onClick={() => onRunAnalysis(t.id)}
                            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-[#C9A84C] hover:text-white hover:border-[#C9A84C] dark:hover:bg-[#C9A84C] dark:hover:text-black dark:hover:border-[#C9A84C] font-extrabold text-[12px] transition-all inline-flex items-center justify-center space-x-1.5 shadow-sm whitespace-nowrap w-full xl:w-28 h-8"
                          >
                            <Cpu className="w-3.5 h-3.5 shrink-0" />
                            <span>Re-Analyse</span>
                          </button>
                        )}
                        {analyzingTenderId === t.id && (
                          <span className="py-1.5 px-3 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[11px] font-bold text-[#C9A84C] inline-flex items-center justify-center space-x-1.5 whitespace-nowrap w-full xl:w-28 h-8">
                            <Cpu className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <span>Analysing...</span>
                          </span>
                        )}
                      </div>
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
