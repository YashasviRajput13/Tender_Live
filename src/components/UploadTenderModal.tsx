import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Tender } from '../types';

interface UploadTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTender: (tender: Tender) => void;
}

export const UploadTenderModal: React.FC<UploadTenderModalProps> = ({
  isOpen,
  onClose,
  onAddTender,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [tenderTitle, setTenderTitle] = useState('');
  const [department, setDepartment] = useState('Ministry of Defence');
  const [estimatedValue, setEstimatedValue] = useState('₹45.0 Lakhs');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      if (!tenderTitle) {
        setTenderTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
      }
    }
  };

  const handleSelectSample = (sampleName: string, dept: string, val: string) => {
    setTenderTitle(sampleName);
    setDepartment(dept);
    setEstimatedValue(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setProcessStep('Extracting RFP eligibility criteria and turnover mandates...');

    setTimeout(() => {
      setProcessStep('Validating against GeM Rule 149 and MSME exemption policies...');
    }, 900);

    setTimeout(() => {
      setProcessStep('Codifying verification checkpoints and audit structure...');
    }, 1800);

    setTimeout(() => {
      setIsProcessing(false);
      const newId = `GEM/2026/PROC/${Math.floor(1030 + Math.random() * 90)}`;
      const newTender: Tender = {
        id: newId,
        title: tenderTitle || 'Hardware & Networking Equipment Supply',
        subtitle: 'Min 2 yrs exp, ₹35L turnover, OEM authorization',
        department: department,
        estimatedValue: estimatedValue,
        bidsCount: 4,
        bidsSubtext: '4 bids ingested',
        status: 'Under Verification',
        riskLevel: 'Medium Risk (Score: 72)',
        score: 75,
        riskCategory: 'Medium Risk',
        dueDate: '05 Oct 2026',
        publishedDate: '11 Sep 2026',
        evaluatingOfficer: 'R. K. Sharma (Procurement Officer)',
        requirements: [
          {
            clauseNumber: 'Clause 2.1',
            category: 'Technical',
            title: 'OEM Authorization Certificate (MAF)',
            specification: 'Bidder must submit valid Manufacturer Authorization Form for all supplied hardware line items.',
            mandatory: true
          },
          {
            clauseNumber: 'Clause 3.2',
            category: 'Financial',
            title: 'Annual Turnover Requirement',
            specification: 'Average annual turnover of at least ₹35 Lakhs certified by CA with UDIN.',
            mandatory: true
          }
        ],
        bidders: [
          {
            id: `bid-${Date.now()}`,
            companyName: 'Unified Telecom & Data Corp',
            vendorId: 'GEM-VD-441290',
            cin: 'U74999DL2017PTC319201',
            gstin: '07AABCU1234F1Z1',
            pan: 'AABCU1234F',
            udyamNumber: 'UDYAM-DL-03-009182',
            quotedAmount: '₹42,10,000',
            complianceScore: 78,
            riskCategory: 'Medium Risk',
            status: 'Pending Officer Review',
            scores: {
              technical: 85,
              financial: 72,
              regulatory: 80,
              experience: 75
            },
            discrepancies: [
              {
                id: 'disc-new-01',
                severity: 'medium',
                category: 'Financial',
                title: 'Minor Outward Tax Supply Variance',
                description: 'CA Certificate turnover claims ₹38.5 Lakhs while GSTR-3B aggregate registers ₹34.8 Lakhs (9.6% variance).',
                citation: 'Tender Clause 3.2 vs CA_Turnover.pdf',
                pageNumber: 2,
                docName: 'CA_Turnover.pdf',
                suggestedAction: 'Request CA reconciliation note.',
                aiConfidence: 91.2
              }
            ],
            crossVerifications: [
              {
                source: 'GSTN',
                field: 'GSTIN Status',
                claimedValue: 'Active',
                registryValue: 'Active Regular Taxpayer',
                status: 'Verified',
                confidence: 99,
                verifiedAt: '2026-09-11 11:30:00 IST',
                details: 'Returns filed up to July 2026 without default.'
              }
            ],
            documents: []
          }
        ]
      };

      onAddTender(newTender);
      onClose();
    }, 2600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Upload className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Upload Tender Document for AI Ingestion</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isProcessing ? (
          <div className="py-12 text-center space-y-4">
            <div className="relative w-14 h-14 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-30"></div>
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">AI Parsing in Progress</h4>
              <p className="text-xs text-slate-500 mt-1">{processStep}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Drag & drop box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50/60 transition-colors cursor-pointer"
              onClick={() => document.getElementById('tender-file-input')?.click()}
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">
                {file ? file.name : 'Click to select or drag & drop tender PDF'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports official GeM BID documents (PDF up to 25MB)
              </p>
              <input
                id="tender-file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    if (!tenderTitle) {
                      setTenderTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }
                }}
              />
            </div>

            {/* Quick preset samples */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectSample('Defence Communication Radios Supply', 'Ministry of Defence', '₹65.0 Lakhs')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  Defence Radio RFP
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('Smart City Surveillance Cameras', 'Ministry of Housing & Urban Affairs', '₹42.0 Lakhs')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  Smart City CCTV
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('Railway Signalling Cable Procurement', 'Ministry of Railways', '₹92.0 Lakhs')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                >
                  Railway Cables
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tender Title:</label>
                <input
                  type="text"
                  required
                  value={tenderTitle}
                  onChange={(e) => setTenderTitle(e.target.value)}
                  placeholder="e.g. Server Hardware & Storage System Procurement"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department:</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Value:</label>
                  <input
                    type="text"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0F2C59] hover:bg-[#1A3D6D] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ingest & Create Verification</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
