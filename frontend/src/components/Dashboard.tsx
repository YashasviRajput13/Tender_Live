import React, { useState } from 'react';
import { 
  Briefcase, 
  Calendar, 
  Award,
  Zap,
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { Tender, AgentTask } from '../types';
import LiveActivity from './LiveActivity';
import ActiveTasks from './ActiveTasks';

interface DashboardProps {
  tenders: Tender[];
  tasks: AgentTask[];
  logs: { timestamp: string; level: string; message: string }[];
  streamStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  onTriggerDiscovery: () => void;
  isTriggering: boolean;
  onTenderSelect: (tender: Tender) => void;
  onRefreshTasks: () => void;
  onRefreshTenders: () => void;
  onForceSync: () => void;
  errorMessage?: string | null;
}

export default function Dashboard({ 
  tenders, 
  tasks, 
  logs, 
  streamStatus,
  onTriggerDiscovery, 
  isTriggering,
  onRefreshTasks,
  onRefreshTenders,
  onForceSync,
  onTenderSelect,
  errorMessage
}: DashboardProps) {
  
  // Hover states for data visualization tooltips
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  // Calculate metric aggregates dynamically
  const activeTendersCount = tenders.length;
  const activeTasksCount = tasks.filter(t => t.status === 'running' || t.status === 'pending').length;
  
  const upcomingDeadlinesCount = tenders.filter(t => {
    if (!t.deadline) return false;
    const daysLeft = (new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 15;
  }).length;

  // 1. Average Opportunity Score (Dynamic, no fallbacks)
  const analyzedTenders = tenders.filter(t => t.opportunity_score !== undefined && t.opportunity_score !== null);
  const averageOpportunityScore = analyzedTenders.length > 0 
    ? Math.round(analyzedTenders.reduce((acc, t) => acc + (t.opportunity_score as number), 0) / analyzedTenders.length) 
    : 0;

  // Get latest discovered tenders
  const latestTenders = tenders.slice(0, 4);

  // 2. Line Chart Data (Historical Suitability) - Computed from last 5 days
  const today = new Date();
  const last5Days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (4 - i));
    return d;
  });

  const lineChartData = last5Days.map((date, i) => {
    const dayStart = new Date(date.setHours(0,0,0,0)).getTime();
    const dayEnd = new Date(date.setHours(23,59,59,999)).getTime();
    
    const dayTenders = analyzedTenders.filter(t => {
      const tTime = new Date(t.created_at).getTime();
      return tTime >= dayStart && tTime <= dayEnd;
    });
    
    const dayAvg = dayTenders.length > 0 
      ? Math.round(dayTenders.reduce((acc, t) => acc + (t.opportunity_score as number), 0) / dayTenders.length)
      : 0;
      
    // x range 50 to 550, y range 130 to 25 (inverted, 130 is 0%, 25 is 100%)
    const xPos = 50 + (i * 125); 
    const yPos = 130 - ((dayAvg / 100) * 105); 
    
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return { 
      date: `${month} ${day}${i === 4 ? ' (Today)' : ''}`, 
      score: dayAvg, 
      x: xPos, 
      y: yPos 
    };
  });

  // 3. Bar Chart Data (Dynamic Source Counts)
  const gemCount = tenders.filter(t => t.source_name === 'GeM').length;
  const cpppCount = tenders.filter(t => t.source_name === 'CPPP').length;
  const otherCount = activeTendersCount - (gemCount + cpppCount);
  
  const barChartData = [
    { label: 'GeM Portal', value: gemCount, percentage: activeTendersCount ? Math.round((gemCount / activeTendersCount) * 100) : 0, color: 'url(#gemGradient)' },
    { label: 'CPPP Portal', value: cpppCount, percentage: activeTendersCount ? Math.round((cpppCount / activeTendersCount) * 100) : 0, color: 'url(#cpppGradient)' },
    { label: 'Others', value: otherCount, percentage: activeTendersCount ? Math.round((otherCount / activeTendersCount) * 100) : 0, color: 'url(#otherGradient)' }
  ];

  // 4. Donut Chart Data (Dynamic Eligibility)
  const highlyEligible = tenders.filter(t => t.eligibility === 'eligible').length;
  const partiallyEligible = tenders.filter(t => t.eligibility === 'partially_eligible').length;
  const notEligible = tenders.filter(t => t.eligibility === 'not_eligible').length;
  const analyzedCount = highlyEligible + partiallyEligible + notEligible;

  const highlyPct = analyzedCount ? Math.round((highlyEligible / analyzedCount) * 100) : 0;
  const partialPct = analyzedCount ? Math.round((partiallyEligible / analyzedCount) * 100) : 0;
  const notPct = analyzedCount ? Math.round((notEligible / analyzedCount) * 100) : 0;

  // Use precise floating point mathematics for rendering SVGs to avoid gaps
  const highlyFloat = analyzedCount ? (highlyEligible / analyzedCount) * 100 : 0;
  const partialFloat = analyzedCount ? (partiallyEligible / analyzedCount) * 100 : 0;
  const notFloat = analyzedCount ? (notEligible / analyzedCount) * 100 : 0;

  const donutChartData = [
    { label: 'Highly Eligible', percentage: highlyPct, color: 'stroke-[#C9A84C]', bg: 'bg-[#C9A84C]', strokeOffset: 251.2 - (251.2 * highlyFloat) / 100 },
    { label: 'Partially Eligible', percentage: partialPct, color: 'stroke-slate-650 dark:stroke-slate-400', bg: 'bg-slate-650 dark:bg-slate-400', strokeOffset: 251.2 - (251.2 * (highlyFloat + partialFloat)) / 100 },
    { label: 'Not Eligible', percentage: notPct, color: 'stroke-slate-350 dark:stroke-slate-700', bg: 'bg-slate-350 dark:bg-slate-700', strokeOffset: 251.2 - (251.2 * (highlyFloat + partialFloat + notFloat)) / 100 }
  ];

  return (
    <div className="p-8 space-y-8 select-none bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* 4 TOP WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { 
            title: 'Tenders Discovered', 
            val: activeTendersCount, 
            desc: 'Real-time portal index', 
            icon: Briefcase,
            iconBg: 'bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]',
            valColor: 'text-slate-900 dark:text-white'
          },
          { 
            title: 'Running AI Agents', 
            val: activeTasksCount, 
            desc: 'Background Celery workers', 
            icon: Zap,
            iconBg: 'bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]',
            valColor: 'text-slate-900 dark:text-white'
          },
          { 
            title: 'Critical Deadlines', 
            val: upcomingDeadlinesCount, 
            desc: 'Closing within 15 days', 
            icon: Calendar,
            iconBg: 'bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]',
            valColor: 'text-slate-900 dark:text-white'
          },
          { 
            title: 'Avg Match Rating', 
            val: averageOpportunityScore > 0 ? `${averageOpportunityScore}%` : 'N/A', 
            desc: 'Company suitability average', 
            icon: Award,
            iconBg: 'bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]',
            valColor: 'text-slate-900 dark:text-white'
          }
        ].map((w, idx) => {
          const Icon = w.icon;
          return (
            <div 
              key={idx} 
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 flex items-center justify-between border border-slate-200 dark:border-slate-800 hover:border-[#C9A84C]/40 dark:hover:border-[#C9A84C]/50 hover:shadow-[0_4px_20px_rgba(201,168,76,0.10)] hover:scale-[1.025] hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
            >
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest">{w.title}</span>
                <span className={`block text-4xl font-display font-black leading-none ${w.valColor}`}>{w.val}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">{w.desc}</span>
              </div>
              <div className={`p-3.5 rounded-xl border ${w.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-500 font-semibold">
          <strong className="font-bold">Error: </strong>{errorMessage}
        </div>
      )}

      {/* METRIC GRAPH & DISTRIBUTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SUITABILITY GRAPH (2/3 width on lg) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#C9A84C]" />
                <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Suitability Score Trends</h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Opportunity match scoring distribution across indexed portals</p>
            </div>
          </div>
          
          {/* Custom Interactive SVG Line Chart */}
          <div className="h-[200px] w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#C9A84C]/5 to-transparent"></div>
            
            {/* SVG Plot */}
            <svg className="w-full h-full" viewBox="0 0 600 130" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="600" y2="20" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="65" x2="600" y2="65" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="600" y2="110" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="0.8" strokeDasharray="3 3" />
              
              {/* Vertical Guide Line */}
              {hoveredLineIndex !== null && (
                <line 
                  x1={lineChartData[hoveredLineIndex].x} 
                  y1={0} 
                  x2={lineChartData[hoveredLineIndex].x} 
                  y2={130} 
                  stroke="rgba(201, 168, 76, 0.35)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                />
              )}

              {/* Gradient Fill under the curve */}
              <path 
                d="M50,130 L50,110 L175,90 L300,75 L425,50 L550,25 L550,130 Z" 
                fill="url(#chartGlow)"
                className="transition-all duration-500 ease-in-out"
              />
              
              {/* Curve Line */}
              <path 
                d="M50,110 L175,90 L300,75 L425,50 L550,25" 
                fill="none" 
                stroke="#C9A84C" 
                strokeWidth="2.5" 
                className="drop-shadow-[0_0_8px_rgba(201,168,76,0.4)]"
              />
              
              {/* Highlight Nodes */}
              {lineChartData.map((d, index) => (
                <g key={index}>
                  <circle 
                    cx={d.x} 
                    cy={d.y} 
                    r={hoveredLineIndex === index ? 6.5 : 4.5} 
                    fill="#FFFFFF" 
                    stroke="#C9A84C" 
                    strokeWidth="3.5" 
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredLineIndex(index)}
                    onMouseLeave={() => setHoveredLineIndex(null)}
                  />
                </g>
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-2 shrink-0 border-t border-slate-200 dark:border-slate-800">
              <span>May 26</span>
              <span>May 27</span>
              <span>May 28</span>
              <span>May 29</span>
              <span>May 30 (Today)</span>
            </div>

            {/* Custom Interactive Tooltip */}
            {hoveredLineIndex !== null && (
              <div 
                className="absolute bg-white dark:bg-slate-900 border border-[#C9A84C]/30 p-2.5 rounded-xl text-xs shadow-premium-glow text-slate-800 dark:text-slate-200 transition-all duration-150"
                style={{ 
                  left: `${(lineChartData[hoveredLineIndex].x / 600) * 85}%`, 
                  top: `${(lineChartData[hoveredLineIndex].y / 130) * 40}%` 
                }}
              >
                <span className="block font-mono text-slate-500">{lineChartData[hoveredLineIndex].date}</span>
                <span className="block font-extrabold text-sm text-[#C9A84C] mt-0.5">Suitability: {lineChartData[hoveredLineIndex].score}%</span>
              </div>
            )}
          </div>
        </div>

        {/* LATEST OPPORTUNITIES (1/3 width on lg) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Discovery Feed</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Newly published bid announcements</p>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3 select-text pr-1 mt-2 max-h-[200px]">
            {latestTenders.length === 0 ? (
              <span className="block text-center py-12 text-sm text-slate-400 font-medium">Scanning for bids...</span>
            ) : (
              latestTenders.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => onTenderSelect(t)}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#C9A84C]/35 hover:bg-[#C9A84C]/[0.03] dark:hover:bg-[#C9A84C]/[0.05] cursor-pointer transition-all duration-300 space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#C9A84C]/10 text-[#A07840] border border-[#C9A84C]/20 tracking-wider uppercase">
                      {t.source_name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {t.tender_id.slice(0, 14)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#C9A84C] truncate transition-colors leading-tight">{t.title}</h4>
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-550 font-medium">
                    <span className="truncate max-w-[120px]">{t.department ? t.department.slice(0, 20) : 'Dept. general'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t.budget ? `₹ ${(t.budget / 100000).toFixed(1)} L` : 'Open'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ADDITIONAL CHARTS ROW: Bar Chart (Left) + Donut Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BAR CHART: PORTAL DISTRIBUTIONS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-[#C9A84C]" />
            <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Category Index Share</h2>
          </div>

          <div className="h-[180px] w-full flex items-end justify-around bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative">
            <svg className="absolute inset-0 w-0 h-0">
              <defs>
                <linearGradient id="gemGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
                <linearGradient id="cpppGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A84C" />
                  <stop offset="100%" stopColor="#A07840" />
                </linearGradient>
                <linearGradient id="otherGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>
            </svg>

            {barChartData.map((bar, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center space-y-3 w-20 relative"
                onMouseEnter={() => setHoveredBarIndex(idx)}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {/* Bar */}
                <div className="w-12 bg-slate-200 dark:bg-slate-850 rounded-lg h-24 flex items-end overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div 
                    className="w-full rounded-b-lg transition-all duration-500 ease-in-out cursor-pointer hover:opacity-85"
                    style={{ 
                      height: `${bar.percentage}%`,
                      background: bar.color
                    }}
                  />
                </div>

                {/* Label */}
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase shrink-0">{bar.label}</span>

                {/* Bar Tooltip */}
                {hoveredBarIndex === idx && (
                  <div className="absolute -top-14 bg-white dark:bg-slate-900 border border-[#C9A84C]/25 p-2 rounded-lg text-xs text-slate-800 dark:text-slate-200 shadow-premium-glow z-10 w-24 text-center">
                    <span className="block font-bold text-[#C9A84C]">{bar.value} Bids</span>
                    <span className="text-slate-400 font-mono">({bar.percentage}% share)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DONUT CHART: ELIGIBILITY BREAKDOWN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden">
          <div className="flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-[#C9A84C]" />
            <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Corporate Eligibility Audit</h2>
          </div>

          <div className="h-[180px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-center space-x-12 relative">
            
            {/* SVG Donut Circle */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="rgba(0,0,0,0.06)" 
                  strokeWidth="12" 
                />
                {/* Dynamic Slices */}
                {analyzedCount > 0 && donutChartData.map((slice, index) => (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    className={`${slice.color} transition-all duration-300 cursor-pointer ${hoveredDonutIndex === index ? 'stroke-[14px]' : 'stroke-[11px]'}`}
                    strokeWidth="11"
                    strokeDasharray="251.2"
                    strokeDashoffset={slice.strokeOffset}
                    onMouseEnter={() => setHoveredDonutIndex(index)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  />
                ))}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tracking-widest leading-none">RATIO</span>
                <span className="text-2xl font-display font-black text-slate-800 dark:text-white mt-1 leading-none">
                  {hoveredDonutIndex !== null ? `${donutChartData[hoveredDonutIndex].percentage}%` : '100%'}
                </span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-3 flex-1">
              {donutChartData.map((slice, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-1 rounded-lg transition-colors cursor-pointer ${hoveredDonutIndex === idx ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  onMouseEnter={() => setHoveredDonutIndex(idx)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${slice.bg}`} />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-350">{slice.label}</span>
                  </div>
                  <span className="text-sm font-mono font-extrabold text-slate-500 dark:text-slate-400 pr-2">{slice.percentage}%</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* LIVE QUEUE & STREAM ACTIVITY TERMINALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveActivity logs={logs} status={streamStatus} />
        <ActiveTasks 
          tasks={tasks} 
          onTriggerDiscovery={onTriggerDiscovery} 
          isTriggering={isTriggering} 
          onRefreshTasks={onRefreshTasks}
          onRefreshTenders={onRefreshTenders}
          onForceSync={onForceSync}
        />
      </div>

    </div>
  );
}
