import React, { useState } from 'react';
import { Search, Filter, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Tender } from '../types';

interface TendersScreenProps {
  tenders: Tender[];
  onSelectTender: (tender: Tender) => void;
  onUploadClick: () => void;
}

export const TendersScreen: React.FC<TendersScreenProps> = ({
  tenders,
  onSelectTender,
  onUploadClick,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const departments = ['all', ...Array.from(new Set(tenders.map((t) => t.department)))];

  const filtered = tenders.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesDept = filterDept === 'all' || t.department === filterDept;
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-[#0B1C30]">Tender Management & Evaluation Registry</h2>
          <p className="text-xs text-slate-500 mt-1">
            Government e-Marketplace active procurements undergoing automated compliance and human scrutiny.
          </p>
        </div>
        <button
          onClick={onUploadClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold self-start sm:self-auto shadow-xs"
        >
          + Upload New Tender PDF
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, ID or dept..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {['all', 'Under Verification', 'Verified', 'Attention Required'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-[#0F2C59] text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' ? 'All Statuses' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Dept selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Department:</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'all' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Tender Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tender) => {
          const isUnderVerification = tender.status === 'Under Verification';
          const isVerified = tender.status === 'Verified';
          const isAttention = tender.status === 'Attention Required';

          return (
            <div
              key={tender.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {tender.id}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    {tender.estimatedValue}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug">
                  {tender.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {tender.subtitle}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{tender.department}</span>
                  <span className="font-semibold text-slate-800">{tender.bidsCount} Bids</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {isUnderVerification && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Under Verification
                    </span>
                  )}
                  {isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Verified
                    </span>
                  )}
                  {isAttention && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                      Attention Required
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onSelectTender(tender)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F2C59] hover:bg-[#1a3d6d] text-white text-xs font-semibold transition-colors"
                >
                  <span>Open Verification</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
