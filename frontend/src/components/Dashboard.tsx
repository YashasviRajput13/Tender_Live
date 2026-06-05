import { 
  Briefcase, 
  Calendar, 
  Award,
  Zap
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
  
  // Calculate metric aggregates dynamically
  const activeTendersCount = tenders.length;
  const activeTasksCount = tasks.filter(t => t.status === 'running' || t.status === 'pending').length;
  
  const upcomingDeadlinesCount = tenders.filter(t => {
    if (!t.deadline) return false;
    const daysLeft = (new Date(t.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 15;
  }).length;

  const averageOpportunityScore = 78;

  // Get latest discovered tenders
  const latestTenders = tenders.slice(0, 4);

  return (
    <div className="p-8 space-y-8 select-none">
      
      {/* 4 TOP WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { 
            title: 'Tenders Discovered', 
            val: activeTendersCount, 
            desc: 'Real-time portal index', 
            icon: Briefcase,
            color: 'text-primary-500 bg-primary-500/10 border-primary-500/20 shadow-premium-glow'
          },
          { 
            title: 'Running AI Agents', 
            val: activeTasksCount, 
            desc: 'Background Celery workers', 
            icon: Zap,
            color: 'text-secondary-500 bg-secondary-500/10 border-secondary-500/20 shadow-cyan-glow'
          },
          { 
            title: 'Critical Deadlines', 
            val: upcomingDeadlinesCount, 
            desc: 'Closing within 15 days', 
            icon: Calendar,
            color: 'text-danger bg-danger/10 border-danger/20'
          },
          { 
            title: 'Avg Match Rating', 
            val: `${averageOpportunityScore}%`, 
            desc: 'Company suitability average', 
            icon: Award,
            color: 'text-success bg-success/10 border-success/20'
          }
        ].map((w, idx) => {
          const Icon = w.icon;
          return (
            <div key={idx} className="glass-panel rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-premium hover:border-slate-300 transition-all duration-300">
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">{w.title}</span>
                <span className="block text-2xl font-display font-black text-slate-900 leading-none">{w.val}</span>
                <span className="block text-[9px] text-slate-650">{w.desc}</span>
              </div>
              <div className={`p-3 rounded-xl border ${w.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-danger/25 bg-danger/5 p-4 text-xs text-danger font-semibold">
          <strong className="font-bold">Error: </strong>{errorMessage}
        </div>
      )}

      {/* METRIC GRAPH & DISTRIBUTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SUITABILITY GRAPH (2/3 width on lg) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-200 p-6 space-y-6 shadow-premium">
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900 tracking-wide">Suitability Score Trends</h2>
            <p className="text-[10px] text-slate-500">Opportunity match scoring distribution across indexed portals</p>
          </div>
          
          {/* SVG Line Chart */}
          <div className="h-[200px] w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent"></div>
            
            {/* SVG Plot */}
            <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="600" y2="30" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="600" y2="75" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="600" y2="120" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
              
              {/* Gradient Fill */}
              <path 
                d="M0,150 L0,120 Q100,50 200,90 T400,30 Q500,80 600,60 L600,150 Z" 
                fill="url(#chartGlow)"
              />
              
              {/* Curve Line */}
              <path 
                d="M0,120 Q100,50 200,90 T400,30 Q500,80 600,60" 
                fill="none" 
                stroke="#F97316" 
                strokeWidth="2.5" 
                className="drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]"
              />
              
              {/* Highlight Nodes */}
              <circle cx="200" cy="90" r="4" fill="#FFFFFF" stroke="#F97316" strokeWidth="2" />
              <circle cx="400" cy="30" r="4" fill="#FFFFFF" stroke="#F97316" strokeWidth="2" />
              <circle cx="600" cy="60" r="4" fill="#FFFFFF" stroke="#F97316" strokeWidth="2" />
            </svg>

            <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest pt-2 shrink-0 border-t border-slate-200">
              <span>May 26</span>
              <span>May 27</span>
              <span>May 28</span>
              <span>May 29</span>
              <span>May 30 (Today)</span>
            </div>
          </div>
        </div>

        {/* LATEST OPPORTUNITIES (1/3 width on lg) */}
        <div className="glass-panel rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-premium">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-display font-bold text-slate-900 tracking-wide">Discovery Feed</h2>
            <p className="text-[10px] text-slate-500">Newly published bid announcements</p>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3 select-text">
            {latestTenders.length === 0 ? (
              <span className="block text-center py-12 text-xs text-slate-500 font-medium">Scanning for bids...</span>
            ) : (
              latestTenders.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => onTenderSelect(t)}
                  className="p-3 rounded-xl bg-slate-50/50 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 tracking-wider">
                      {t.source_name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {t.tender_id.slice(0, 14)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 truncate">{t.title}</h4>
                  <div className="flex items-center justify-between text-[9px] text-slate-650 font-medium">
                    <span className="truncate max-w-[120px]">{t.department ? t.department.slice(0, 20) : 'Dept. general'}</span>
                    <span className="font-bold text-secondary-500">
                      {t.budget ? `₹ ${(t.budget / 100000).toFixed(1)} L` : 'Open'}
                    </span>
                  </div>
                </div>
              ))
            )}
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
