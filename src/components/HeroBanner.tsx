import React from 'react';
import { Zap, Upload } from 'lucide-react';

interface HeroBannerProps {
  onRunDemo: () => void;
  onUploadTender: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onRunDemo,
  onUploadTender,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071933] via-[#0F2C59] to-[#1a3d6d] p-6 sm:p-8 lg:p-10 text-white shadow-lg border border-blue-900/40">
      {/* Watermark Crest / Emblem on Right */}
      <div 
        className="absolute -right-8 -bottom-10 sm:right-6 sm:-bottom-6 select-none pointer-events-none opacity-25 sm:opacity-30 transition-opacity"
        aria-hidden="true"
      >
        <svg 
          width="260" 
          height="260" 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-blue-300"
        >
          <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="12" strokeDasharray="12 8" opacity="0.6" />
          <circle cx="100" cy="100" r="76" fill="currentColor" fillOpacity="0.15" />
          {/* Stylized 'i' / Sovereign Pillar */}
          <circle cx="100" cy="62" r="14" fill="currentColor" />
          <rect x="88" y="88" width="24" height="66" rx="8" fill="currentColor" />
        </svg>
      </div>

      <div className="relative z-10 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-3">
          Procurement Verification Dashboard
        </h1>
        <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed mb-6 font-normal">
          Converting fragmented manual bid verification into an AI-assisted, evidence-based, and explainable workflow — keeping the Procurement Officer in complete control.
        </p>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            id="hero-run-demo-btn"
            onClick={onRunDemo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-emerald-300 focus:outline-hidden"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Run Interactive Demo (Tender 1024)</span>
          </button>

          <button
            id="hero-upload-tender-btn"
            onClick={onUploadTender}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-sm font-medium border border-white/25 backdrop-blur-xs transition-all focus:ring-2 focus:ring-white/30 focus:outline-hidden"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Tender PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
