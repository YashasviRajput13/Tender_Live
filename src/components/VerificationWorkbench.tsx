import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Database, 
  ExternalLink, 
  Sparkles, 
  Send, 
  PenTool, 
  Check, 
  HelpCircle, 
  X,
  FileSearch,
  Lock,
  Download,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Tender, Bidder, WorkflowStepId, DiscrepancyItem } from '../types';

interface VerificationWorkbenchProps {
  tender: Tender;
  initialStep?: WorkflowStepId;
  onBackToDashboard: () => void;
  onRecordAuditLog: (log: {
    tenderId: string;
    bidderName: string;
    action: string;
    category: 'VERIFICATION' | 'OVERRIDE' | 'DECISION' | 'CLARIFICATION';
    justification: string;
  }) => void;
}

export const VerificationWorkbench: React.FC<VerificationWorkbenchProps> = ({
  tender,
  initialStep = 1,
  onBackToDashboard,
  onRecordAuditLog,
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStepId>(initialStep);
  const [selectedBidderId, setSelectedBidderId] = useState<string>(
    tender.bidders.length > 0 ? tender.bidders[0].id : ''
  );

  const [activeBidder, setActiveBidder] = useState<Bidder>(
    tender.bidders.length > 0 ? tender.bidders[0] : ({} as Bidder)
  );

  // Selected document for preview pane
  const [selectedDocId, setSelectedDocId] = useState<string>(
    tender.bidders[0]?.documents[0]?.id || ''
  );

  // Officer decision states
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | 'clarification' | null>(null);
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [officerPin, setOfficerPin] = useState('1102');
  const [isDecisionSigned, setIsDecisionSigned] = useState(false);
  const [signatureHash, setSignatureHash] = useState<string>('');

  // Override modal state
  const [overridingDiscrepancy, setOverridingDiscrepancy] = useState<DiscrepancyItem | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  // Handle bidder switch
  const handleSelectBidder = (bId: string) => {
    setSelectedBidderId(bId);
    const found = tender.bidders.find((b) => b.id === bId);
    if (found) {
      setActiveBidder(found);
      if (found.documents.length > 0) {
        setSelectedDocId(found.documents[0].id);
      }
      setIsDecisionSigned(false);
      setDecisionType(null);
    }
  };

  // Handle AI Discrepancy Confirm
  const handleConfirmFinding = (discId: string) => {
    setActiveBidder((prev) => ({
      ...prev,
      discrepancies: prev.discrepancies.map((d) => 
        d.id === discId ? { ...d, officerAction: 'confirmed' } : d
      ),
    }));

    onRecordAuditLog({
      tenderId: tender.id,
      bidderName: activeBidder.companyName,
      action: `Officer Confirmed AI Finding (${discId})`,
      category: 'VERIFICATION',
      justification: 'Officer verified documented discrepancy as valid grounds for scrutiny.'
    });
  };

  // Handle Discrepancy Override
  const handleApplyOverride = () => {
    if (!overridingDiscrepancy || !overrideReason.trim()) return;

    setActiveBidder((prev) => ({
      ...prev,
      discrepancies: prev.discrepancies.map((d) => 
        d.id === overridingDiscrepancy.id 
          ? { ...d, officerAction: 'overridden', overrideReason: overrideReason.trim() } 
          : d
      ),
    }));

    onRecordAuditLog({
      tenderId: tender.id,
      bidderName: activeBidder.companyName,
      action: `Officer Overrode AI Finding (${overridingDiscrepancy.id})`,
      category: 'OVERRIDE',
      justification: `Discrepancy overridden by Officer. Justification: ${overrideReason.trim()}`
    });

    setOverridingDiscrepancy(null);
    setOverrideReason('');
  };

  // Submit Final Officer Sign-Off
  const handleSignOfficerDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionType) return;

    const hash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    setSignatureHash(hash);
    setIsDecisionSigned(true);

    const actionText = 
      decisionType === 'approve' ? 'Cleared for Technical Stage' :
      decisionType === 'reject' ? 'Disqualified from Tender' :
      'Notice for Clarification Issued under Rule 173';

    onRecordAuditLog({
      tenderId: tender.id,
      bidderName: activeBidder.companyName,
      action: `Final Decision: ${actionText}`,
      category: decisionType === 'clarification' ? 'CLARIFICATION' : 'DECISION',
      justification: officerRemarks.trim() || `Officer R. K. Sharma executed official sign-off: ${actionText}. Hash: ${hash}`
    });

    if (decisionType === 'approve') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  const currentDoc = activeBidder?.documents?.find((d) => d.id === selectedDocId) || activeBidder?.documents?.[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Tenders</span>
              <span>/</span>
              <span className="font-mono text-blue-700">{tender.id}</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">Verification Workbench</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0B1C30] mt-0.5">
              {tender.title}
            </h2>
          </div>
        </div>

        {/* Bidder Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Bidder:
          </span>
          <select
            id="bidder-selector"
            value={selectedBidderId}
            onChange={(e) => handleSelectBidder(e.target.value)}
            className="text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
          >
            {tender.bidders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.companyName} ({b.riskCategory} • {b.complianceScore}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6-Step Workflow Tab Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-2xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 1 as WorkflowStepId, label: '1. Read Tender', badge: `${tender.requirements.length} Clauses` },
            { id: 2 as WorkflowStepId, label: '2. Bidder Docs', badge: `${activeBidder.documents?.length || 0} Files` },
            { id: 3 as WorkflowStepId, label: '3. Cross-Source Compare', badge: 'Live Sync' },
            { id: 4 as WorkflowStepId, label: '4. Compliance Score', badge: `${activeBidder.complianceScore}%` },
            { id: 5 as WorkflowStepId, label: '5. Explainable Risks', badge: `${activeBidder.discrepancies?.length || 0} Flags` },
            { id: 6 as WorkflowStepId, label: '6. Human Officer Decision', badge: isDecisionSigned ? 'Signed' : 'Pending' },
          ].map((step) => {
            const isActive = currentStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#0F2C59] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{step.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {step.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE STEP VIEW CONTENT */}

      {/* STEP 1: READ TENDER SPECIFICATIONS */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Extracted Tender Clauses & Eligibility Criteria
              </h3>
              <p className="text-xs text-slate-500">
                AI has ingested the tender PDF and codified mandatory technical, financial, and regulatory benchmarks.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold self-start sm:self-auto"
            >
              Next: Check Bidder Docs →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tender.requirements.map((req, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {req.clauseNumber}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500">{req.category}</span>
                    {req.mandatory && (
                      <span className="text-[10px] font-bold uppercase bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200">
                        Mandatory
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">{req.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{req.specification}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: BIDDER SUBMITTED DOCUMENTS */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File list on left */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bid Pack Documents</h3>
              <p className="text-xs text-slate-500">
                Submitted by {activeBidder.companyName}
              </p>
            </div>

            <div className="space-y-2">
              {activeBidder.documents?.map((doc) => {
                const isSelected = selectedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                          <span>{doc.fileSize}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-sans font-medium">{doc.tamperCheck}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentStep(3)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Next: Cross-Source Compare →
            </button>
          </div>

          {/* Document Preview & Extracted Attributes on right */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            {currentDoc ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div>
                    <span className="text-xs font-mono font-medium text-slate-500">{currentDoc.type}</span>
                    <h3 className="text-sm font-bold text-slate-900">{currentDoc.name}</h3>
                  </div>
                  <div className="text-[11px] font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-600 truncate max-w-xs">
                    SHA-256: {currentDoc.sha256.substring(0, 20)}...
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>AI Extracted Key Parameters & Values</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentDoc.extractedClauses.map((clause, i) => (
                      <div key={i} className="bg-white p-3 rounded-md border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{clause.label}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            clause.match ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {clause.match ? 'Matches Mandate' : 'Flagged Variance'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 font-mono">
                          {clause.value}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          AI Extraction Confidence: {clause.confidence}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Visual PDF Document Snippet */}
                <div className="border border-slate-300 rounded-lg p-5 bg-[#FCFDFE] shadow-inner font-mono text-xs leading-relaxed space-y-3">
                  <div className="text-center pb-2 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    [Authenticated Document Extract: {currentDoc.name}]
                  </div>
                  <p className="text-slate-700">
                    "TO WHOMSOEVER IT MAY CONCERN — This is to certify that M/s Apex Cloud Solutions Private Limited (CIN: U72200DL2018PTC334521) having its registered office at DLF Cyber City, Phase 2, New Delhi has achieved an annual operational turnover of <mark className="bg-amber-200 px-1 font-bold">INR 52,40,000 (Fifty Two Lakhs Forty Thousand Only)</mark> for the financial year ending 31st March 2025 as per audited books of accounts produced before us."
                  </p>
                  <div className="pt-2 text-slate-500 text-[11px] flex justify-between">
                    <span>UDIN: 25034129AAAAAA1021</span>
                    <span>Digitally Signed: CA Sharma & Associates</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                Select a document on the left to preview extracted clauses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: CROSS-SOURCE COMPARE */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Authoritative Government Registry Cross-Verification
              </h3>
              <p className="text-xs text-slate-500">
                Declared parameters are automatically reconciled against official government APIs in real-time.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold self-start sm:self-auto"
            >
              Next: View Compliance Score →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">GOV REGISTRY</th>
                  <th className="py-3 px-4">VERIFIED FIELD</th>
                  <th className="py-3 px-4">BIDDER CLAIMED</th>
                  <th className="py-3 px-4">REGISTRY VALUE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">AUDIT NOTE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeBidder.crossVerifications?.map((cv, idx) => {
                  const isMismatch = cv.status === 'Mismatch';
                  const isVerified = cv.status === 'Verified';

                  return (
                    <tr key={idx} className={isMismatch ? 'bg-rose-50/40' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {cv.source}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {cv.field}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        {cv.claimedValue}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <span className={isMismatch ? 'text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded' : 'text-slate-900'}>
                          {cv.registryValue}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {isMismatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            Mismatch
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs">
                        {cv.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 4: COMPLIANCE MATRIX & SCORE */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Codified Bid Compliance Score: {activeBidder.complianceScore} / 100
              </h3>
              <p className="text-xs text-slate-500">
                Mathematical evaluation derived from rule checkpoints across all four core procurement pillars.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold self-start sm:self-auto"
            >
              Next: Review Explainable Risks →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Technical Capability</span>
              <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {activeBidder.scores?.technical}%
              </div>
              <p className="text-xs text-slate-500">MeitY empanelment verified, certified data center tier.</p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${activeBidder.scores?.technical}%` }}></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
              <span className="text-xs font-bold text-rose-700 uppercase">Financial Eligibility</span>
              <div className="text-3xl font-extrabold text-rose-700 tabular-nums">
                {activeBidder.scores?.financial}%
              </div>
              <p className="text-xs text-rose-600 font-medium">Turnover discrepancy in GSTR-3B (-28 pts penalty).</p>
              <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-600 h-full" style={{ width: `${activeBidder.scores?.financial}%` }}></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Regulatory Mandate</span>
              <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {activeBidder.scores?.regulatory}%
              </div>
              <p className="text-xs text-slate-500">Make in India 64.5% local content self-certified.</p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full" style={{ width: `${activeBidder.scores?.regulatory}%` }}></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Past Experience</span>
              <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {activeBidder.scores?.experience}%
              </div>
              <p className="text-xs text-slate-500">3+ years verified with state agencies and PSU credentials.</p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${activeBidder.scores?.experience}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: EXPLAINABLE RISKS (HUMAN-IN-THE-LOOP DESIGN SPEC) */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  AI Explainable Risks & Document Citations
                </h3>
                <p className="text-xs text-slate-500">
                  Evidence-based anomaly detection. Every AI inference is anchored to an exact document clause and page.
                </p>
              </div>
              <button
                onClick={() => setCurrentStep(6)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold self-start sm:self-auto"
              >
                Proceed to Officer Decision →
              </button>
            </div>

            {/* Inset Decision Callouts matching Sovereign Trust Guidelines */}
            <div className="space-y-4 mt-4">
              {activeBidder.discrepancies?.map((disc) => {
                const isHigh = disc.severity === 'high';
                const isMedium = disc.severity === 'medium';
                const isOverridden = disc.officerAction === 'overridden';
                const isConfirmed = disc.officerAction === 'confirmed';

                return (
                  <div
                    key={disc.id}
                    id={`risk-callout-${disc.id}`}
                    className={`rounded-r-lg border-l-4 p-5 shadow-2xs transition-all ${
                      isHigh
                        ? 'border-l-rose-600 bg-rose-50/40 border border-slate-200'
                        : isMedium
                        ? 'border-l-amber-500 bg-amber-50/40 border border-slate-200'
                        : 'border-l-blue-500 bg-blue-50/40 border border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isHigh ? 'bg-rose-100 text-rose-800' : isMedium ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {disc.severity} Risk • {disc.category}
                          </span>

                          <span className="text-xs font-mono text-slate-500">
                            Confidence: {disc.aiConfidence}%
                          </span>

                          {isConfirmed && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ✓ Finding Confirmed by Officer
                            </span>
                          )}

                          {isOverridden && (
                            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                              ⚠ Finding Overridden by Officer
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900">{disc.title}</h4>
                        <p className="text-xs text-slate-700 leading-relaxed">{disc.description}</p>

                        <div className="flex items-center gap-1.5 text-xs text-blue-800 font-mono bg-white/80 px-2.5 py-1 rounded border border-blue-200/60 max-w-fit">
                          <FileSearch className="w-3.5 h-3.5" />
                          <span>Citation: {disc.citation}</span>
                        </div>

                        <div className="text-xs text-slate-600 pt-1">
                          <span className="font-semibold text-slate-800">Suggested Action: </span>
                          {disc.suggestedAction}
                        </div>

                        {disc.overrideReason && (
                          <div className="text-xs text-purple-900 bg-purple-50 p-2.5 rounded border border-purple-200 mt-2">
                            <span className="font-bold">Officer Override Rationale: </span>
                            {disc.overrideReason}
                          </div>
                        )}
                      </div>

                      {/* Action buttons on right */}
                      <div className="flex md:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleConfirmFinding(disc.id)}
                          disabled={isConfirmed}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors ${
                            isConfirmed
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-[#0F2C59] hover:bg-[#1A3D6D] text-white'
                          }`}
                        >
                          Confirm AI Finding
                        </button>

                        <button
                          onClick={() => setOverridingDiscrepancy(disc)}
                          disabled={isOverridden}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                            isOverridden
                              ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'border-slate-300 hover:bg-white text-slate-700'
                          }`}
                        >
                          Override Clause
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: HUMAN OFFICER DECISION PANEL */}
      {currentStep === 6 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Human Procurement Officer Authorization Workbench
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              In strict accordance with GeM General Terms & Public Procurement Rules, machine inferences advise; the designated Procurement Officer holds final legal authority.
            </p>
          </div>

          {isDecisionSigned ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h4 className="text-base font-bold text-emerald-900">
                Officer Sign-Off Completed & Cryptographically Timestamped
              </h4>
              <p className="text-xs text-emerald-800 max-w-xl mx-auto">
                Decision has been recorded in the immutable audit log under Procurement Officer R. K. Sharma (MeitY).
              </p>
              <div className="inline-block bg-white p-2.5 rounded-lg border border-emerald-200 font-mono text-xs text-slate-700">
                SHA-256 Stamp: {signatureHash}
              </div>
              <div className="pt-2">
                <button
                  onClick={onBackToDashboard}
                  className="px-5 py-2 bg-[#0F2C59] text-white text-xs font-semibold rounded-lg hover:bg-[#1a3d6d]"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignOfficerDecision} className="space-y-5">
              {/* Decision Choice Trio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Legal Action for {activeBidder.companyName}:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecisionType('clarification')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      decisionType === 'clarification'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-300'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <HelpCircle className="w-4 h-4" />
                      <span>Seek Clarification</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Issue formal 48-hour notice under Rule 173(iv) regarding GSTR-3B turnover variance.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('approve')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      decisionType === 'approve'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-300'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Bidder</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Clear bidder for technical acceptance and advance to commercial financial opening.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecisionType('reject')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      decisionType === 'reject'
                        ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-300'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Disqualify Bidder</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Disqualify for non-compliance with mandatory financial turnover criteria.
                    </p>
                  </button>
                </div>
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Procurement Officer Findings & Remarks (Required for Audit Record):
                </label>
                <textarea
                  required
                  rows={3}
                  value={officerRemarks}
                  onChange={(e) => setOfficerRemarks(e.target.value)}
                  placeholder="Enter detailed justification for evaluation sign-off..."
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Officer Digital Credentials */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Designated Officer:</span>
                  <p className="font-bold text-slate-900">{tender.evaluatingOfficer}</p>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Officer DSC PIN Authorization:</label>
                  <input
                    type="password"
                    value={officerPin}
                    onChange={(e) => setOfficerPin(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2.5 py-1 font-mono tracking-widest text-slate-800 w-32 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!decisionType}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
                    decisionType
                      ? 'bg-[#0F2C59] hover:bg-[#1a3d6d]'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Execute Digital Sign-Off & Seal Decision
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Override Reason Modal */}
      {overridingDiscrepancy && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                Override AI Compliance Finding
              </h4>
              <button 
                onClick={() => setOverridingDiscrepancy(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="font-bold text-amber-900">{overridingDiscrepancy.title}</p>
              <p>{overridingDiscrepancy.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mandatory Legal Justification for Audit Record:
              </label>
              <textarea
                required
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this clause variance is accepted (e.g. valid MSME prior exemption certificate produced)..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverridingDiscrepancy(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyOverride}
                disabled={!overrideReason.trim()}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg ${
                  overrideReason.trim() ? 'bg-purple-700 hover:bg-purple-800' : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                Record Official Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
