import { 
  Play, 
  RotateCw, 
  CheckCircle2, 
  XCircle,
  Search,
  Cpu,
  FileText,
  Shield,
  Award,
  Zap
} from 'lucide-react';
import { AgentTask } from '../types';
import { motion } from 'framer-motion';

interface ActiveTasksProps {
  tasks: AgentTask[];
  onTriggerDiscovery: () => void;
  isTriggering: boolean;
  onRefreshTasks: () => void;
  onRefreshTenders: () => void;
  onForceSync: () => void;
}

export default function ActiveTasks({ 
  tasks, 
  onTriggerDiscovery, 
  isTriggering, 
  onRefreshTasks, 
  onRefreshTenders, 
  onForceSync 
}: ActiveTasksProps) {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-[#C9A84C]" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-550" />;
      case 'running':
        return <RotateCw className="w-4 h-4 text-[#C9A84C] animate-spin" />;
      default:
        return <Play className="w-4 h-4 text-slate-400" />;
    }
  };

  const getAgentLabel = (agent?: string, status?: string) => {
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
      default:
        if (status === 'completed') return 'Pipeline Completed';
        if (status === 'failed') return 'Pipeline Failed';
        return 'Agent Waiting...';
    }
  };

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');
  const pastTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed').slice(0, 5);

  // Check if any pipeline task is currently active for specific agents
  const runningTask = activeTasks[0];
  const activeAgent = runningTask?.current_agent || '';

  const pipelineNodes = [
    { id: 'scraper', label: 'Discovery', icon: Search },
    { id: 'document_intel', label: 'Doc Intel', icon: FileText },
    { id: 'eligibility_agent', label: 'Eligibility', icon: Shield },
    { id: 'summary_agent', label: 'Summarizer', icon: Cpu },
    { id: 'scoring_agent', label: 'Scoring', icon: Award }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm hover:border-[#C9A84C]/30 transition-colors duration-300 select-none">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-display font-bold text-slate-800 dark:text-white tracking-wide">Active AI Agents</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Continuous crawl indexing & pipeline status</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onRefreshTasks}
            className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={onRefreshTenders}
            className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            Tenders
          </button>
          <button
            type="button"
            onClick={onForceSync}
            className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            Sync
          </button>
          <button
            onClick={onTriggerDiscovery}
            disabled={isTriggering || activeTasks.some(t => t.task_type === 'discovery')}
            className={`flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all ${
              isTriggering || activeTasks.some(t => t.task_type === 'discovery')
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-[#C9A84C] hover:bg-[#A07840] text-white shadow-premium-glow hover:scale-[1.02]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isTriggering ? 'Polling...' : 'Trigger Crawl'}</span>
          </button>
        </div>
      </div>

      {/* PIPELINE AGENT GRAPH VISUALIZATION */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <h3 className="text-xs font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">// Process Pipeline Map</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 relative overflow-hidden">
          {pipelineNodes.map((node, index) => {
            const Icon = node.icon;
            const isNodeActive = activeAgent === node.id;
            const isCompleted = activeTasks.length > 0 && pipelineNodes.findIndex(n => n.id === activeAgent) > index;
            
            return (
              <div key={node.id} className="flex flex-col items-center relative z-10 w-full md:w-auto">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                  isNodeActive 
                    ? 'bg-[#C9A84C]/15 border-[#C9A84C] text-[#C9A84C] node-pulse-active' 
                    : isCompleted
                    ? 'bg-[#C9A84C]/5 border-[#C9A84C]/45 text-[#C9A84C]'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold mt-2 ${isNodeActive ? 'text-[#C9A84C]' : 'text-slate-400 dark:text-slate-500'}`}>
                  {node.label}
                </span>
                
                {/* Visual connectors for md layouts */}
                {index < pipelineNodes.length - 1 && (
                  <div className="hidden md:block absolute top-5.5 left-[calc(100%-8px)] w-[calc(100%-24px)] h-0.5 pointer-events-none">
                    <svg className="w-full h-full overflow-visible">
                      <line 
                        x1="0" 
                        y1="0" 
                        x2="100%" 
                        y2="0" 
                        className={`stroke-2 ${
                          isCompleted 
                            ? 'stroke-[#C9A84C]/50' 
                            : isNodeActive 
                            ? 'stroke-[#C9A84C] pipeline-flow-active' 
                            : 'stroke-slate-200 dark:stroke-slate-800'
                        }`}
                        strokeWidth="2" 
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE TASKS CONTAINER */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">// Running Workflows</h3>
        {activeTasks.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
            <span className="block text-sm text-slate-400 dark:text-slate-500 font-medium">All agent queues idle. Standing by...</span>
          </div>
        ) : (
          activeTasks.map((t) => (
            <div key={t.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block text-[10px] font-mono font-extrabold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.task_type.toUpperCase()}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1.5">
                    {getAgentLabel(t.current_agent, t.status)}
                  </h4>
                </div>
                <div className="flex items-center space-x-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  {getStatusIcon(t.status)}
                  <span>{t.progress}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shadow-inner">
                <div 
                  className="bg-[#C9A84C] h-1.5 rounded-full transition-all duration-500 shadow-premium-glow" 
                  style={{ width: `${t.progress}%` }}
                ></div>
              </div>

              {/* Stream Logs excerpt */}
              {t.log_messages && t.log_messages.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-mono text-xs text-emerald-400 leading-relaxed max-h-24 overflow-y-auto select-text shadow-inner">
                  <span className="block text-slate-500 mb-1">// Active Pipeline Stream logs</span>
                  {t.log_messages.map((log, idx) => (
                    <div key={idx} className="truncate">
                      <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className={log.level === 'ERROR' ? 'text-danger' : 'text-slate-300'}>
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
        <h3 className="text-xs font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">// Pipeline History</h3>
        <div className="space-y-2">
          {pastTasks.length === 0 ? (
            <span className="block text-center py-4 text-sm text-slate-400 dark:text-slate-500 font-medium">No previous run logs</span>
          ) : (
            pastTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#C9A84C]/25 hover:bg-[#C9A84C]/[0.02] dark:hover:bg-[#C9A84C]/[0.05] text-sm transition">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {getStatusIcon(t.status)}
                  <div className="truncate">
                    <span className="block font-bold text-slate-700 dark:text-slate-300 truncate capitalize leading-tight">
                      {t.task_type} pipeline finished
                    </span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      ID: {t.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(t.updated_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
