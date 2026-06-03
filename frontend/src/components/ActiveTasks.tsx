import { 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle,
  Search
} from 'lucide-react';
import { AgentTask } from '../types';

interface ActiveTasksProps {
  tasks: AgentTask[];
  onTriggerDiscovery: () => void;
  isTriggering: boolean;
  onRefreshTasks: () => void;
  onRefreshTenders: () => void;
  onForceSync: () => void;
}

export default function ActiveTasks({ tasks, onTriggerDiscovery, isTriggering, onRefreshTasks, onRefreshTenders, onForceSync }: ActiveTasksProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'running':
        return <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />;
      default:
        return <Play className="w-4 h-4 text-slate-500" />;
    }
  };

  const getAgentLabel = (agent?: string) => {
    switch (agent) {
      case 'scraper':
        return 'Tender Discovery Agent';
      case 'document_intel':
        return 'Document Intelligence Agent';
      case 'eligibility_agent':
        return 'AI Eligibility Agent';
      case 'summary_agent':
        return 'AI Summarization Agent';
      case 'scoring_agent':
        return 'Opportunity Scoring Agent';
      case 'completed':
        return 'Pipeline Completed';
      default:
        return 'Agent Waiting...';
    }
  };

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');
  const pastTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed').slice(0, 5);

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-white font-['Outfit']">Active AI Agents</h2>
          <p className="text-[11px] text-slate-400">Continuous scanning & pipeline updates</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onRefreshTasks}
            className="py-2 px-3 rounded-xl bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-600 hover:bg-slate-600 transition"
          >
            Refresh Tasks
          </button>
          <button
            type="button"
            onClick={onRefreshTenders}
            className="py-2 px-3 rounded-xl bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-600 hover:bg-slate-600 transition"
          >
            Refresh Tenders
          </button>
          <button
            type="button"
            onClick={onForceSync}
            className="py-2 px-3 rounded-xl bg-brand-500 text-slate-950 text-[10px] font-semibold border border-brand-500 hover:bg-brand-600 transition"
          >
            Force Sync
          </button>
          <button
            onClick={onTriggerDiscovery}
            disabled={isTriggering || activeTasks.some(t => t.task_type === 'discovery')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-xl text-xs font-semibold shadow-lg transition-all ${
              isTriggering || activeTasks.some(t => t.task_type === 'discovery')
                ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                : 'bg-brand-500 hover:bg-brand-600 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isTriggering ? 'Polling...' : 'Trigger Discovery Crawl'}</span>
          </button>
        </div>
      </div>

      {/* ACTIVE TASKS CONTAINER */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Running Workflows</h3>
        {activeTasks.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
            <span className="block text-xs text-slate-500">All agent queues idle. Standing by...</span>
          </div>
        ) : (
          activeTasks.map((t) => (
            <div key={t.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3 ai-pulse-active">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block text-[10px] font-bold text-slate-950 bg-amber-400 px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.task_type.toUpperCase()}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-1">
                    {getAgentLabel(t.current_agent)}
                  </h4>
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400">
                  {getStatusIcon(t.status)}
                  <span>{t.progress}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-700/80 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${t.progress}%` }}
                ></div>
              </div>

              {/* Stream Logs excerpt */}
              {t.log_messages && t.log_messages.length > 0 && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 font-mono text-[9px] text-emerald-400/90 leading-relaxed max-h-24 overflow-y-auto">
                  <span className="block text-slate-500 mb-1">// Real-time Agent Log stream</span>
                  {t.log_messages.map((log, idx) => (
                    <div key={idx} className="truncate">
                      <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className={log.level === 'ERROR' ? 'text-rose-400' : 'text-slate-300'}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* COMPLETED TASKS CONTAINER */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline History</h3>
        <div className="space-y-2">
          {pastTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A]/40 border border-slate-800/80 text-xs">
              <div className="flex items-center space-x-3 overflow-hidden">
                {getStatusIcon(t.status)}
                <div className="truncate">
                  <span className="block font-semibold text-slate-200 truncate capitalize">
                    {t.task_type} Assessment Completed
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono">
                    ID: {t.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {new Date(t.updated_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
