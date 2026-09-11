import React from 'react';
import { WorkflowStepId } from '../types';

interface WorkflowBarProps {
  currentStep?: WorkflowStepId;
  onStepClick?: (step: WorkflowStepId) => void;
}

export const WorkflowBar: React.FC<WorkflowBarProps> = ({
  currentStep = 1,
  onStepClick,
}) => {
  const steps: { id: WorkflowStepId; label: string; number: number; isGold?: boolean }[] = [
    { id: 1, number: 1, label: 'Read Tender' },
    { id: 2, number: 2, label: 'Bidder Docs' },
    { id: 3, number: 3, label: 'Cross-Source Compare' },
    { id: 4, number: 4, label: 'Compliance Score' },
    { id: 5, number: 5, label: 'Explainable Risks' },
    { id: 6, number: 6, label: 'Human Officer Decision', isGold: true },
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-2xs py-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center overflow-x-auto no-scrollbar py-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-4 whitespace-nowrap shrink-0">
          WORKFLOW:
        </span>

        <div className="flex items-center gap-2 sm:gap-3 text-xs whitespace-nowrap">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isPassed = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  id={`workflow-step-${step.id}`}
                  onClick={() => onStepClick && onStepClick(step.id)}
                  className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-left ${
                    isActive
                      ? 'bg-blue-50/80 text-blue-900 ring-1 ring-blue-300/50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={`Go to step ${step.id}: ${step.label}`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                      step.isGold
                        ? isActive
                          ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                          : 'bg-amber-100 text-amber-800'
                        : isActive
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : isPassed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
                    }`}
                  >
                    {isPassed ? '✓' : step.number}
                  </span>
                  <span className={`text-[12px] ${isActive ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                    {step.label}
                  </span>
                </button>

                {idx < steps.length - 1 && (
                  <span className="text-slate-300 select-none text-xs font-light px-0.5">
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
