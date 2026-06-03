import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Check, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';
import { Tender, EligibilityReport, AgentTask } from '../types';
import { API_BASE_URL } from '../api';

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

  const getMatchBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
            <Check className="w-3.5 h-3.5" />
            <span>Eligible</span>
          </span>
        );
      case 'fail':
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold uppercase tracking-wider">
            <X className="w-3.5 h-3.5" />
            <span>Not Eligible</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Conditional</span>
          </span>
        );
    }
  };

  const handleDownload = async (format: string) => {
    setDownloadingFormat(format);
    try {
      const file_name = await onTriggerReport(format);
      if (file_name) {
        const token = localStorage.getItem('token');
        const url = `${API_BASE_URL}/api/reports/download?file_name=${encodeURIComponent(file_name)}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Download request failed.');
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-[#0F172A] border-l border-slate-800 shadow-2xl flex flex-col z-50 overflow-hidden font-['Plus_Jakarta_Sans'] select-text">
      
      {/* DRAWER HEADER */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/40">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Dossier Inspection</span>
          <h2 className="text-sm font-extrabold text-white font-['Outfit'] mt-1 truncate max-w-[420px]">
            {tender.tender_id}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* DRAWER BODY SCROLLER */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Tender details header section */}
        <div className="space-y-2">
          <h1 className="text-base font-extrabold text-white leading-relaxed">{tender.title}</h1>
          <p className="text-xs text-slate-400 font-medium">Department: {tender.department || 'N/A'}</p>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
              {tender.source_name}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 text-slate-350 rounded border border-slate-700">
              Loc: {tender.location || 'N/A'}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded border border-brand-500/20">
              Budget: {tender.budget ? `₹ ${tender.budget.toLocaleString()}` : 'Open Bid'}
            </span>
          </div>
        </div>

        {/* IF NOT ANALYZED */}
        {!eligibilityReport && (
          <div className="p-6 border border-slate-800 rounded-2xl bg-slate-900/20 text-center space-y-4">
            <Sparkles className="w-8 h-8 text-brand-400 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-200">AI Agents Analysis Pending</h3>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Calculate custom eligibility alignment matrices and opportunity suitability rating based on your corporate profile.
              </p>
            </div>
            <button
              onClick={() => onRunAnalysis(tender.id)}
              disabled={analyzingTenderId === tender.id}
              className="py-2.5 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 text-xs font-bold text-slate-950 shadow-md transition-all inline-flex items-center space-x-2"
            >
              <Award className={`w-4 h-4 ${analyzingTenderId === tender.id ? 'animate-spin' : ''}`} />
              <span>{analyzingTenderId === tender.id ? 'Evaluating alignment...' : 'Trigger Multi-Agent Chain'}</span>
            </button>
          </div>
        )}

        {/* IF ANALYZED, DISPLAY COMPLETE SUITE */}
        {eligibilityReport && (
          <div className="space-y-6">
            
            {/* OPPORTUNITY SUITABILITY CARD */}
            <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 flex items-center justify-between shadow-inner">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Suitability Rating</span>
                <span className="text-3xl font-extrabold text-white text-glow-emerald font-['Outfit'] block">
                  {eligibilityReport.opportunity_score}<span className="text-xs text-slate-500">/100</span>
                </span>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-[320px]">
                  Formula weighting: financial capacity (20%), geographic fit (15%), and bid history match.
                </p>
              </div>

              {/* Dynamic SVG radial score loader */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-brand-400"
                    strokeDasharray={`${eligibilityReport.opportunity_score}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                    {eligibilityReport.eligibility === 'eligible' ? 'High' : eligibilityReport.eligibility === 'partially_eligible' ? 'Mid' : 'Low'}
                  </span>
                </div>
              </div>
            </div>

            {/* ALIGNMENT MATRIX TABLE */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requirement Match Matrices</h3>
              <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/10 font-medium divide-y divide-slate-800/60">
                {[
                  { label: 'Financial Capacity', match: eligibilityReport.requirements_analysis.financial_match },
                  { label: 'Technical Qualifications', match: eligibilityReport.requirements_analysis.technical_match },
                  { label: 'Historical Experiences', match: eligibilityReport.requirements_analysis.experience_match },
                  { label: 'Location Boundaries', match: eligibilityReport.requirements_analysis.location_match }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 flex flex-col space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-355">{item.label}</span>
                      {getMatchBadge(item.match?.status || 'conditional')}
                    </div>
                    <span className="block text-[10px] text-slate-450 leading-relaxed">
                      {item.match?.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* EXECUTIVE SUMMARY BRIEF */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive summary briefing</h3>
              <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-850 text-xs text-slate-300 leading-relaxed shadow-inner">
                {eligibilityReport.summary}
              </div>
            </div>

            {/* KNOWN BID RISKS */}
            {eligibilityReport.risk_analysis?.risks && eligibilityReport.risk_analysis.risks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Potential Execution & Bid Risks</h3>
                <div className="p-4 rounded-xl bg-rose-950/5 border border-rose-900/20 text-xs space-y-2">
                  {eligibilityReport.risk_analysis.risks.map((risk, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-slate-300">
                      <span className="text-rose-500 font-bold leading-none select-none mt-0.5">•</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPLIANCE CHECKLIST */}
            {eligibilityReport.checklist?.submission_checklist && eligibilityReport.checklist.submission_checklist.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Bid documents</h3>
                <div className="space-y-1.5">
                  {eligibilityReport.checklist.submission_checklist.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/20 border border-slate-850 flex items-center space-x-3 text-xs">
                      <div className="w-4 h-4 rounded-md border border-brand-500/30 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-brand-400" />
                      </div>
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* DRAWER FOOTER FOR DOWNLOAD REPORT ACTIONS */}
      {eligibilityReport && (
        <div className="p-5 border-t border-slate-800/80 bg-slate-900/50 flex gap-3 shrink-0">
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloadingFormat !== null}
            className="flex-1 py-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs transition-all inline-flex items-center justify-center space-x-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download Briefing (PDF)'}</span>
          </button>
          
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloadingFormat !== null}
            className="flex-1 py-2.5 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-xs transition-all inline-flex items-center justify-center space-x-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingFormat === 'excel' ? 'Compiling Sheet...' : 'Download Catalog (XLSX)'}</span>
          </button>
        </div>
      )}
      
    </div>
  );
}
