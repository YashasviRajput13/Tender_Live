import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Check, 
  AlertTriangle, 
  Sparkles,
  Award,
  Cpu
} from 'lucide-react';
import { Tender, EligibilityReport } from '../types';
import { API_BASE_URL } from '../api';
import { motion } from 'framer-motion';

interface TenderDetailsProps {
  tender: Tender;
  eligibilityReport: EligibilityReport | null;
  onClose: () => void;
  onRunAnalysis: (tenderId: number) => void;
  analyzingTenderId: number | null;
  onTriggerReport: (format: string) => Promise<string | null>;
}

export default function TenderDetails({ 
  tender, 
  eligibilityReport, 
  onClose, 
  onRunAnalysis,
  analyzingTenderId,
  onTriggerReport
}: TenderDetailsProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string>('');

  const getMatchBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-[#C9A84C]/10 text-[#A07840] dark:text-[#C9A84C] border border-[#C9A84C]/20 text-[10px] font-extrabold uppercase tracking-wider">
            <Check className="w-3 h-3 text-[#C9A84C]" />
            <span>Eligible</span>
          </span>
        );
      case 'fail':
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 border border-slate-200 dark:border-slate-850 text-[10px] font-extrabold uppercase tracking-wider">
            <X className="w-3 h-3 text-slate-400 dark:text-slate-650" />
            <span>Not Eligible</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-slate-500" />
            <span>Conditional</span>
          </span>
        );
    }
  };

  const handleDownload = async (format: string) => {
    setDownloadingFormat(format);
    setDownloadError('');
    try {
      const file_name = await onTriggerReport(format);
      if (file_name) {
        const token = localStorage.getItem('token');
        const url = `${API_BASE_URL}/api/reports/download?file_name=${encodeURIComponent(file_name)}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}. File may not be ready yet.`);
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file_name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        setDownloadError('Report generation failed or timed out. Check logs and try again.');
      }
    } catch (e: any) {
      console.error(e);
      setDownloadError(e.message || 'Download failed. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <>
      {/* Drawer Overlay */}
      <div className="fixed inset-0 bg-slate-900/30 dark:bg-slate-950/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Drawer Sheet */}
      <motion.div 
        initial={{ x: 600, opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-[600px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-[−8px_0_40px_rgba(0,0,0,0.08)] flex flex-col z-50 overflow-hidden font-sans select-none"
      >
        
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div>
            <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#C9A84C] block">// Bid Qualification Brief</span>
            <h2 className="text-base font-display font-extrabold text-slate-900 dark:text-white mt-1.5 truncate max-w-[420px]">
              {tender.tender_id}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 border border-slate-200 dark:border-slate-750/30 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DRAWER BODY SCROLLER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* Tender details header section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white leading-snug">{tender.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Procurement Body: <span className="text-slate-800 dark:text-slate-250 font-semibold">{tender.department || 'N/A'}</span></p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-lg">
                {tender.source_name}
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-lg">
                Loc: {tender.location || 'N/A'}
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#A07840] dark:text-[#C9A84C] rounded-lg">
                Budget: {tender.budget ? `₹ ${tender.budget.toLocaleString()}` : 'Open Value'}
              </span>
            </div>
          </div>

          {/* IF NOT ANALYZED */}
          {!eligibilityReport && (
            <div className="p-8 border border-dashed border-[#C9A84C]/30 rounded-2xl bg-[#C9A84C]/[0.03] text-center space-y-5 select-none">
              <Sparkles className="w-7 h-7 text-[#C9A84C] mx-auto animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Agents Analysis Pending</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Evaluate custom eligibility alignment matrices, highlighted contract risks, and opportunity suitability rating based on corporate profile settings.
                </p>
              </div>
              <button
                onClick={() => onRunAnalysis(tender.id)}
                disabled={analyzingTenderId === tender.id}
                className="py-2.5 px-6 rounded-xl bg-[#C9A84C] hover:bg-[#A07840] disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-xs font-extrabold uppercase tracking-wider text-white shadow-premium-glow transition-all inline-flex items-center space-x-2 hover:scale-[1.02]"
              >
                <Award className={`w-3.5 h-3.5 ${analyzingTenderId === tender.id ? 'animate-spin' : ''}`} />
                <span>{analyzingTenderId === tender.id ? 'Evaluating alignment...' : 'Trigger Analysis'}</span>
              </button>
            </div>
          )}

          {/* IF ANALYZED, DISPLAY COMPLETE SUITE */}
          {eligibilityReport && (
            <div className="space-y-5">
              
              {/* OPPORTUNITY SUITABILITY CARD */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#C9A84C]/25 flex items-center justify-between shadow-sm hover:border-[#C9A84C]/45 transition-colors">
                <div className="space-y-2">
                  <span className="text-xs text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-widest block">Suitability Rating</span>
                  <span className="text-4xl font-display font-black text-slate-900 dark:text-white block leading-none">
                    {eligibilityReport.opportunity_score}<span className="text-xs font-medium text-slate-400">/100</span>
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[320px] font-medium">
                    Calculated weightings: financial capacity (20%), geographic fit (15%), and historical experience compatibility.
                  </p>
                </div>

                {/* Dynamic SVG radial score loader */}
                <div className="relative w-20 h-20 shrink-0 select-none">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="2.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke="#C9A84C"
                      strokeDasharray={`${eligibilityReport.opportunity_score}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase">
                      {eligibilityReport.eligibility === 'eligible' ? 'High' : eligibilityReport.eligibility === 'partially_eligible' ? 'Mid' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ALIGNMENT MATRIX TABLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-extrabold text-[#C9A84C] uppercase tracking-widest">// Requirement Match Matrix</h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                  {[
                    { label: 'Financial Capacity', match: eligibilityReport.requirements_analysis.financial_match },
                    { label: 'Technical Qualifications', match: eligibilityReport.requirements_analysis.technical_match },
                    { label: 'Historical Experiences', match: eligibilityReport.requirements_analysis.experience_match },
                    { label: 'Location Boundaries', match: eligibilityReport.requirements_analysis.location_match }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col space-y-1.5 hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-slate-800 dark:text-slate-200">{item.label}</span>
                        {getMatchBadge(item.match?.status || 'conditional')}
                      </div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {item.match?.details}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXECUTIVE SUMMARY BRIEF */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono font-extrabold text-[#C9A84C] uppercase tracking-widest">// Executive Briefing Summary</h3>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-sm">
                  {eligibilityReport.summary}
                </div>
              </div>

              {/* KNOWN BID RISKS */}
              {eligibilityReport.risk_analysis?.risks && eligibilityReport.risk_analysis.risks.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-mono font-extrabold text-[#C9A84C] uppercase tracking-widest">// Potential Bidding Risks</h3>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 border-l-[#C9A84C] dark:border-l-[#C9A84C] border-l-4 text-sm space-y-2.5 shadow-sm">
                    {eligibilityReport.risk_analysis.risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-slate-800 dark:text-slate-300 font-medium">
                        <span className="text-[#C9A84C] font-bold leading-none select-none mt-0.5">•</span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLIANCE CHECKLIST */}
              {eligibilityReport.checklist?.submission_checklist && eligibilityReport.checklist.submission_checklist.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-extrabold text-[#C9A84C] uppercase tracking-widest">// Required Submission Documents</h3>
                  <div className="space-y-2">
                    {eligibilityReport.checklist.submission_checklist.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#C9A84C]/25 dark:hover:border-[#C9A84C]/45 flex items-center space-x-3 text-sm transition-colors">
                        <div className="w-5 h-5 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/5 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-[#C9A84C]" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {eligibilityReport && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 shrink-0">
            {downloadError && (
              <span className="text-[10px] text-danger font-semibold text-center">
                {downloadError}
              </span>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloadingFormat !== null}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-800 hover:bg-[#C9A84C]/5 dark:hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/30 dark:hover:border-[#C9A84C]/40 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all inline-flex items-center justify-center space-x-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>{downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download Briefing (PDF)'}</span>
              </button>
              
              <button
                onClick={() => handleDownload('excel')}
                disabled={downloadingFormat !== null}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-800 hover:bg-[#C9A84C]/5 dark:hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/30 dark:hover:border-[#C9A84C]/40 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all inline-flex items-center justify-center space-x-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>{downloadingFormat === 'excel' ? 'Compiling Sheet...' : 'Download Catalog (XLSX)'}</span>
              </button>
            </div>
          </div>
        )}
        
      </motion.div>
    </>
  );
}