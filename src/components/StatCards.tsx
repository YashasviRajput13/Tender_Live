import React from 'react';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';

interface StatCardsProps {
  onCardClick?: (type: 'active' | 'under-verification' | 'high-risk' | 'verified') => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ onCardClick }) => {
  const cards = [
    {
      id: 'active' as const,
      label: 'ACTIVE TENDERS',
      value: '12',
      badge: '+2 this week',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      subtext: 'GeM Portal Live Synced',
      icon: FileText,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'under-verification' as const,
      label: 'BIDS UNDER VERIFICATION',
      value: '28',
      badge: '6 processing',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/60',
      subtext: 'Avg turnaround: 8 mins',
      icon: Clock,
      iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      id: 'high-risk' as const,
      label: 'HIGH RISK BIDS',
      value: '4',
      badge: 'Action Required',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
      subtext: 'Mismatched GST/PAN or Expired',
      icon: AlertTriangle,
      iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      id: 'verified' as const,
      label: 'VERIFIED BIDS',
      value: '21',
      badge: '75% compliant',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      subtext: 'Audit Trail Signed',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={`stat-card-${card.id}`}
            onClick={() => onCardClick && onCardClick(card.id)}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            {/* Top row: Label + Icon */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                {card.label}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.iconColor} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4 stroke-[2]" />
              </div>
            </div>

            {/* Middle row: Big Number + Pill */}
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <span className="text-3xl font-extrabold text-[#0B1C30] tracking-tight tabular-nums">
                {card.value}
              </span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium whitespace-nowrap ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            {/* Bottom row: Subtext */}
            <p className="text-xs text-slate-500 font-normal">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
};
