import React, { useState } from 'react';
import { 
  Briefcase, 
  Calendar, 
  Award,
  Zap,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { Tender, AgentTask } from '../types';
import LiveActivity from './LiveActivity';
import ActiveTasks from './ActiveTasks';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 shadow-xl transition-all duration-200">
        <span className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
          {label}
        </span>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
            {payload[0].value}% suitability
          </span>
        </div>
        <span className="block text-[9px] font-medium text-emerald-500 dark:text-emerald-400 mt-1">
          ✓ Optimal Matching Rate
        </span>
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, index, payload } = props;
  const isHighest = payload.score === 95;
  const isLowest = payload.score === 65;

  if (isHighest || isLowest) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill="#C9A84C" fillOpacity={0.2} />
        <circle cx={cx} cy={cy} r={4} fill="#C9A84C" stroke="#FFF" strokeWidth={1.5} />
        <text 
          x={cx} 
          y={cy - 12} 
          fill="#A07840" 
          fontSize={9} 
          fontWeight="bold" 
          fontFamily="monospace"
          textAnchor="middle"
          className="dark:fill-amber-400 select-none"
        >
          {isHighest ? 'MAX' : 'MIN'}
        </text>
      </g>
    );
  }
  return null;
};

const CustomActiveDot = (props: any) => {
  const { cx, cy } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="#C9A84C" fillOpacity={0.15} className="animate-ping" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <circle cx={cx} cy={cy} r={8} fill="#C9A84C" fillOpacity={0.4} />
      <circle cx={cx} cy={cy} r={5} fill="#C9A84C" stroke="#FFFFFF" strokeWidth={2} />
    </g>
  );
};

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
    { 
      label: 'GeM Portal', 
      value: gemCount, 
      percentage: activeTendersCount ? Math.round((gemCount / activeTendersCount) * 100) : 0, 
      color: 'bg-gradient-to-r from-amber-500 to-[#C9A84C]', 
      text: 'text-[#C9A84C]', 
      bg: 'bg-[#C9A84C]', 
      glow: 'shadow-[0_0_15px_rgba(201,168,76,0.25)]', 
      trend: '+12% this week', 
      isUp: true 
    },
    { 
      label: 'CPPP Portal', 
      value: cpppCount, 
      percentage: activeTendersCount ? Math.round((cpppCount / activeTendersCount) * 100) : 0, 
      color: 'bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800', 
      text: 'text-slate-600 dark:text-slate-400', 
      bg: 'bg-slate-500', 
      glow: '', 
      trend: '+18% this week', 
      isUp: true 
    },
    { 
      label: 'Others', 
      value: otherCount, 
      percentage: activeTendersCount ? Math.round((otherCount / activeTendersCount) * 100) : 0, 
      color: 'bg-gradient-to-r from-slate-400 to-slate-500', 
      text: 'text-slate-400', 
      bg: 'bg-slate-400', 
      glow: '', 
      trend: '-2% this week', 
      isUp: false 
    }
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
    { label: 'Highly Eligible', percentage: highlyPct, color: '#C9A84C', bg: 'bg-[#C9A84C]' },
    { label: 'Partially Eligible', percentage: partialPct, color: '#64748B', bg: 'bg-slate-500' },
    { label: 'Not Eligible', percentage: notPct, color: '#94A3B8', bg: 'bg-slate-400' }
  ];

  return (
    <div className="p-8 space-y-8 select-none bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* 4 TOP WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { 
            title: 'Tenders Discovered', 
            val: String(activeTendersCount), 
            desc: 'Real-time portal index', 
            icon: Briefcase,
            iconBg: 'bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]',
            valColor: 'text-slate-900 dark:text-white'
          },
          { 
            title: 'Running AI Agents', 
            val: String(activeTasksCount), 
            desc: 'Background Celery workers', 
            icon: Zap,
            iconBg: 'bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]',
            valColor: 'text-slate-900 dark:text-white'
          },
          { 
            title: 'Critical Deadlines', 
            val: String(upcomingDeadlinesCount), 
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
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#C9A84C]" />
                <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Suitability Score Trends</h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Opportunity match scoring distribution across indexed portals</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> +30.0%
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase mt-1">Growth this week</span>
            </div>
          </div>
          
          <div className="h-[320px] w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={lineChartData}
                margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis 
                  domain={[50, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
                  dx={-5}
                />
                <RechartsTooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(201,168,76,0.25)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#C9A84C" 
                  strokeWidth={3} 
                  fill="url(#areaGlow)" 
                  animationDuration={1200}
                  activeDot={<CustomActiveDot />}
                  dot={<CustomDot />}
                />
              </AreaChart>
            </ResponsiveContainer>
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

      {/* ADDITIONAL CHARTS ROW: Ranking Cards (Left) + Donut Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CATEGORY INDEX SHARE: PORTAL DISTRIBUTIONS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#C9A84C]" />
              <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Category Index Share</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-wider">PORTAL DISTRIBUTION</span>
          </div>

          <div className="space-y-4 my-auto">
            {barChartData.map((bar, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 hover:border-[#C9A84C]/30 hover:bg-[#C9A84C]/[0.02] dark:hover:bg-[#C9A84C]/[0.02] transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Title & Info */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{bar.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-250/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/20 dark:border-slate-700/50">
                      Rank #{idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    {bar.isUp ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    )}
                    <span className={`text-xs font-semibold ${bar.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {bar.trend}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="flex-[2] flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Capture index volume</span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-350">{bar.value} active bids</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-205 dark:bg-slate-800/55 rounded-full overflow-hidden relative border border-slate-200/10 dark:border-slate-800/35">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.15 }}
                      className={`h-full rounded-full ${bar.color} ${bar.glow}`}
                    />
                  </div>
                </div>

                {/* Percentage Badge */}
                <div className="flex items-center justify-end min-w-[70px]">
                  <span className="text-lg font-black font-display text-slate-800 dark:text-slate-100 pr-1">{bar.percentage}%</span>
                  <span className="text-[10px] text-slate-400 font-mono">share</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* DONUT CHART: ELIGIBILITY BREAKDOWN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-[#C9A84C]" />
              <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Corporate Eligibility Audit</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-wider">COMPLIANCE METRICS</span>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-center gap-8 min-h-[260px] my-auto">
            {/* SVG Donut Circle */}
            <div className="relative w-[140px] h-[140px] flex-shrink-0 flex items-center justify-center">
              <PieChart width={140} height={140}>
                <Pie
                  data={donutChartData}
                  dataKey="percentage"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={64}
                  paddingAngle={4}
                  cornerRadius={3}
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={1000}
                  onMouseEnter={(_, index) => setHoveredDonutIndex(index)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                >
                  {donutChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      style={{
                        filter: hoveredDonutIndex === index ? `drop-shadow(0 0 6px ${entry.color}80)` : 'none',
                        transform: hoveredDonutIndex === index ? 'scale(1.03)' : 'scale(1)',
                        transformOrigin: '70px 70px',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">
                  {hoveredDonutIndex !== null ? donutChartData[hoveredDonutIndex].label.split(' ')[0] : 'ELIGIBLE'}
                </span>
                <span className="text-2xl font-display font-black text-slate-800 dark:text-white mt-0.5 leading-none">
                  {hoveredDonutIndex !== null ? `${donutChartData[hoveredDonutIndex].percentage}%` : `${highlyPct + partialPct}%`}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-555 font-mono tracking-widest uppercase mt-0.5">
                  {hoveredDonutIndex !== null ? 'SHARE' : 'TOTAL RATE'}
                </span>
              </div>
            </div>

            {/* Legends */}
            <div className="flex-1 w-full space-y-2.5">
              {donutChartData.map((slice, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                    hoveredDonutIndex === idx 
                      ? 'bg-[#C9A84C]/[0.05] border-[#C9A84C]/30 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onMouseEnter={() => setHoveredDonutIndex(idx)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${slice.bg} shadow-sm`} />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">{slice.label}</span>
                      <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium">Compliance rating</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-base font-black font-mono text-slate-800 dark:text-slate-100">{slice.percentage}%</span>
                    <span className="block text-[9px] text-emerald-500 dark:text-emerald-400 font-semibold font-mono">
                      {idx === 0 ? '✓ Low Risk' : idx === 1 ? '⚡ Moderate' : '⚠ High Risk'}
                    </span>
                  </div>
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
