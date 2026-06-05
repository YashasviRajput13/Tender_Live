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

  const getMatchBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-success/10 text-success border border-success/20 text-[9px] font-extrabold uppercase tracking-wider">
            <Check className="w-3 h-3" />
            <span>Eligible</span>
          </span>
        );
      case 'fail':
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-danger/10 text-danger border border-danger/20 text-[9px] font-extrabold uppercase tracking-wider">
            <X className="w-3 h-3" />
            <span>Not Eligible</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-warning/10 text-warning border border-warning/20 text-[9px] font-extrabold uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3" />
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
    <>
      {/* Drawer Overlay */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40" onClick={onClose} />

      {/* Drawer Sheet */}
      <motion.div 
        initial={{ x: 600, opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-[600px] bg-white border-l border-slate-200 shadow-premium flex flex-col z-50 overflow-hidden font-sans select-none"
      >
        
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <div>
            <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-slate-500 block">// Bid Qualification Brief</span>
            <h2 className="text-sm font-display font-extrabold text-slate-900 mt-1.5 truncate max-w-[420px]">
              {tender.tender_id}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DRAWER BODY SCROLLER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
          
          {/* Tender details header section */}
          <div className="space-y-2.5">
            <h1 className="text-base font-display font-bold text-slate-900 leading-snug">{tender.title}</h1>
            <p className="text-xs text-slate-705 font-semibold">Procurement Body: <span className="text-slate-800 font-medium">{tender.department || 'N/A'}</span></p>
            <div className="flex flex-wrap gap-2 pt-1.5">
              <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                {tender.source_name}
              </span>
              <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                Loc: {tender.location || 'N/A'}
              </span>
              <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 bg-primary-500/10 border border-primary-500/20 text-primary-600 rounded-lg">
                Budget: {tender.budget ? `₹ ${tender.budget.toLocaleString()}` : 'Open Value'}
              </span>
            </div>
          </div>

          {/* IF NOT ANALYZED */}
          {!eligibilityReport && (
            <div className="p-8 border border-slate-200 rounded-2xl bg-slate-50 text-center space-y-5 select-none">
              <Sparkles className="w-7 h-7 text-primary-500 mx-auto animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900">AI Agents Analysis Pending</h3>
                <p className="text-[11px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Evaluate custom eligibility alignment matrices, highlighted contract risks, and opportunity suitability rating based on corporate profile settings.
                </p>
              </div>
              <button
                onClick={() => onRunAnalysis(tender.id)}
                disabled={analyzingTenderId === tender.id}
                className="py-2 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-slate-100 disabled:text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-premium-glow transition-all inline-flex items-center space-x-2"
              >
                <Award className={`w-3.5 h-3.5 ${analyzingTenderId === tender.id ? 'animate-spin' : ''}`} />
                <span>{analyzingTenderId === tender.id ? 'Evaluating alignment...' : 'Trigger Analysis'}</span>
              </button>
            </div>
          )}

          {/* IF ANALYZED, DISPLAY COMPLETE SUITE */}
          {eligibilityReport && (
            <div className="space-y-6">
              
              {/* OPPORTUNITY SUITABILITY CARD */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-inner">
                <div className="space-y-2">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest block">Suitability Rating</span>
                  <span className="text-3xl font-display font-black text-primary-600 text-glow-primary block leading-none">
                    {eligibilityReport.opportunity_score}<span className="text-xs font-medium text-slate-500">/100</span>
                  </span>
                  <p className="text-[10px] text-slate-650 leading-relaxed max-w-[320px] font-medium">
                    Calculated weightings: financial capacity (20%), geographic fit (15%), and historical experience compatibility.
                  </p>
                </div>

                {/* Dynamic SVG radial score loader */}
                <div className="relative w-18 h-18 shrink-0 select-none">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="2.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-primary-500"
                      strokeDasharray={`${eligibilityReport.opportunity_score}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase">
                      {eligibilityReport.eligibility === 'eligible' ? 'High' : eligibilityReport.eligibility === 'partially_eligible' ? 'Mid' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ALIGNMENT MATRIX TABLE */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Requirement Match Matrix</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white divide-y divide-slate-200 shadow-sm">
                  {[
                    { label: 'Financial Capacity', match: eligibilityReport.requirements_analysis.financial_match },
                    { label: 'Technical Qualifications', match: eligibilityReport.requirements_analysis.technical_match },
                    { label: 'Historical Experiences', match: eligibilityReport.requirements_analysis.experience_match },
                    { label: 'Location Boundaries', match: eligibilityReport.requirements_analysis.location_match }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 flex flex-col space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{item.label}</span>
                        {getMatchBadge(item.match?.status || 'conditional')}
                      </div>
                      <span className="block text-[10px] text-slate-655 leading-relaxed font-medium">
                        {item.match?.details}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXECUTIVE SUMMARY BRIEF */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Executive briefing summary</h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed shadow-inner">
                  {eligibilityReport.summary}
                </div>
              </div>

              {/* KNOWN BID RISKS */}
              {eligibilityReport.risk_analysis?.risks && eligibilityReport.risk_analysis.risks.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Potential Bidding Risks</h3>
                  <div className="p-4 rounded-xl bg-danger/5 border border-danger/15 text-xs space-y-2.5">
                    {eligibilityReport.risk_analysis.risks.map((risk, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-slate-750 font-medium">
                        <span className="text-danger font-bold leading-none select-none mt-0.5">•</span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPLIANCE CHECKLIST */}
              {eligibilityReport.checklist?.submission_checklist && eligibilityReport.checklist.submission_checklist.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Required Submission documents</h3>
                  <div className="space-y-2">
                    {eligibilityReport.checklist.submission_checklist.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-3 text-xs">
                        <div className="w-4.5 h-4.5 rounded-lg border border-primary-500/30 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-primary-500" />
                        </div>
                        <span className="text-slate-700 font-medium">{item}</span>
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
          <div className="p-5 border-t border-slate-205 bg-slate-50/80 flex gap-3 shrink-0">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloadingFormat !== null}
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold text-xs transition-all inline-flex items-center justify-center space-x-2 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-primary-500" />
              <span>{downloadingFormat === 'pdf' ? 'Generating PDF...' : 'Download Briefing (PDF)'}</span>
            </button>
            
            <button
              onClick={() => handleDownload('excel')}
              disabled={downloadingFormat !== null}
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold text-xs transition-all inline-flex items-center justify-center space-x-2 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-primary-500" />
              <span>{downloadingFormat === 'excel' ? 'Compiling Sheet...' : 'Download Catalog (XLSX)'}</span>
            </button>
          </div>
        )}
        
      </motion.div>
    </>
  );
}
