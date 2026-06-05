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
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger" />;
      case 'running':
        return <RotateCw className="w-4 h-4 text-secondary-400 animate-spin" />;
      default:
        return <Play className="w-4 h-4 text-slate-500" />;
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
    <div className="glass-panel rounded-2xl border border-slate-200 p-6 space-y-6 shadow-premium select-none">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-sm font-display font-bold text-slate-900 tracking-wide">Active AI Agents</h2>
          <p className="text-[10px] text-slate-500">Continuous crawl indexing & pipeline status</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onRefreshTasks}
            className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-205 hover:bg-slate-200 transition"
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={onRefreshTenders}
            className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-205 hover:bg-slate-200 transition"
          >
            Tenders
          </button>
          <button
            type="button"
            onClick={onForceSync}
            className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-205 hover:bg-slate-200 transition"
          >
            Sync
          </button>
          <button
            onClick={onTriggerDiscovery}
            disabled={isTriggering || activeTasks.some(t => t.task_type === 'discovery')}
            className={`flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              isTriggering || activeTasks.some(t => t.task_type === 'discovery')
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 text-white shadow-premium-glow hover:scale-[1.02]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isTriggering ? 'Polling...' : 'Trigger Crawl'}</span>
          </button>
        </div>
      </div>

      {/* PIPELINE AGENT GRAPH VISUALIZATION */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Process Pipeline Map</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 relative overflow-hidden">
          {pipelineNodes.map((node, index) => {
            const Icon = node.icon;
            const isNodeActive = activeAgent === node.id;
            const isCompleted = activeTasks.length > 0 && pipelineNodes.findIndex(n => n.id === activeAgent) > index;
            
            return (
              <div key={node.id} className="flex flex-col items-center relative z-10 w-full md:w-auto">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                  isNodeActive 
                    ? 'bg-primary-500/10 border-primary-500 text-primary-600 node-pulse-active' 
                    : isCompleted
                    ? 'bg-success/10 border-success/40 text-success'
                    : 'bg-white border-slate-250 text-slate-450'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold mt-2 ${isNodeActive ? 'text-primary-650' : 'text-slate-500'}`}>
                  {node.label}
                </span>
                
                {/* Visual connectors (dots) for md layouts */}
                {index < pipelineNodes.length - 1 && (
                  <div className="hidden md:block absolute top-5.5 left-[calc(100%-8px)] w-[calc(100%-24px)] h-0.5 pointer-events-none">
                    <svg className="w-full h-full overflow-visible">
                      <line 
                        x1="0" 
                        y1="0" 
                        x2="100%" 
                        y2="0" 
                        stroke={isCompleted ? "#10B981" : isNodeActive ? "#F97316" : "#E2E8F0"} 
                        strokeWidth="2" 
                        className={isNodeActive ? "pipeline-flow-active" : ""}
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
        <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Running Workflows</h3>
        {activeTasks.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <span className="block text-xs text-slate-500 font-medium">All agent queues idle. Standing by...</span>
          </div>
        ) : (
          activeTasks.map((t) => (
            <div key={t.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 relative overflow-hidden shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block text-[8px] font-mono font-extrabold text-primary-600 bg-primary-500/10 border border-primary-500/25 px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.task_type.toUpperCase()}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                    {getAgentLabel(t.current_agent, t.status)}
                  </h4>
                </div>
                <div className="flex items-center space-x-2 text-xs font-bold text-secondary-600">
                  {getStatusIcon(t.status)}
                  <span>{t.progress}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                <div 
                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-500 shadow-premium-glow" 
                  style={{ width: `${t.progress}%` }}
                ></div>
              </div>

              {/* Stream Logs excerpt */}
              {t.log_messages && t.log_messages.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[9px] text-emerald-450 leading-relaxed max-h-24 overflow-y-auto select-text shadow-inner">
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
        <h3 className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">// Pipeline History</h3>
        <div className="space-y-2">
          {pastTasks.length === 0 ? (
            <span className="block text-center py-4 text-xs text-slate-500 font-medium">No previous run logs</span>
          ) : (
            pastTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-200/80 text-xs">
                <div className="flex items-center space-x-3 overflow-hidden">
                  {getStatusIcon(t.status)}
                  <div className="truncate">
                    <span className="block font-bold text-slate-750 truncate capitalize leading-tight">
                      {t.task_type} pipeline finished
                    </span>
                    <span className="block text-[9px] text-slate-500 font-mono">
                      ID: {t.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-500 shrink-0">
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
