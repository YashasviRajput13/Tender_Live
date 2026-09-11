import React, { useState } from 'react';
import { Search, Plus, ArrowRight, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { Tender } from '../types';

interface RecentTendersTableProps {
  tenders: Tender[];
  onSelectTender: (tender: Tender) => void;
  onUploadClick: () => void;
}

export const RecentTendersTable: React.FC<RecentTendersTableProps> = ({
  tenders,
  onSelectTender,
  onUploadClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTenders = tenders.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#0B1C30] tracking-tight">
            Recent Tenders
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Government e-Marketplace active procurements awaiting officer scrutiny
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-tender-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tender ID or Dept..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          {/* + Upload Tender Button */}
          <button
            id="table-upload-tender-btn"
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Upload Tender</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" id="recent-tenders-table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-5 sm:px-6">TENDER ID</th>
              <th className="py-3.5 px-4">TENDER TITLE</th>
              <th className="py-3.5 px-4">DEPARTMENT</th>
              <th className="py-3.5 px-4">BIDS</th>
              <th className="py-3.5 px-4">STATUS</th>
              <th className="py-3.5 px-4">RISK LEVEL</th>
              <th className="py-3.5 px-5 sm:px-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredTenders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                  No tenders found matching "{searchQuery}".
                </td>
              </tr>
            ) : (
              filteredTenders.map((tender) => {
                const isUnderVerification = tender.status === 'Under Verification';
                const isVerified = tender.status === 'Verified';
                const isAttention = tender.status === 'Attention Required';

                return (
                  <tr
                    key={tender.id}
                    id={`tender-row-${tender.id.replace(/\//g, '-')}`}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Tender ID */}
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                      <div className="font-bold text-[#0B1C30] font-mono text-xs sm:text-[13px]">
                        {tender.id}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {tender.estimatedValue}
                      </div>
                    </td>

                    {/* Title & Subtitle */}
                    <td className="py-4 px-4 max-w-xs sm:max-w-sm">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-1">
                        {tender.title}
                      </div>
                      {tender.subtitle && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {tender.subtitle}
                        </div>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-4 px-4 text-slate-700 whitespace-nowrap text-xs">
                      {tender.department}
                    </td>

                    {/* Bids */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {tender.bidsCount} Bids
                      </div>
                      {tender.bidsSubtext && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          {tender.bidsSubtext}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {isUnderVerification && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Under Verification
                        </span>
                      )}
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                      {isAttention && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          Attention Required
                        </span>
                      )}
                    </td>

                    {/* Risk Level Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {tender.riskCategory === 'Medium Risk' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Medium Risk (Score: {tender.score})
                        </span>
                      )}
                      {tender.riskCategory === 'Low Risk' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Low Risk (Score: {tender.score})
                        </span>
                      )}
                      {tender.riskCategory === 'High Risk' && (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          High Risk (Score: {tender.score})
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-4 px-5 sm:px-6 text-right whitespace-nowrap">
                      {tender.id === 'GEM/2026/PROC/1024' ? (
                        <button
                          id={`action-btn-${tender.id.replace(/\//g, '-')}`}
                          onClick={() => onSelectTender(tender)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F2C59] hover:bg-[#1A3D6D] text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          <span>View Verification</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          id={`action-btn-${tender.id.replace(/\//g, '-')}`}
                          onClick={() => onSelectTender(tender)}
                          className="inline-flex items-center px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100/80 text-slate-700 text-xs font-medium transition-colors"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
