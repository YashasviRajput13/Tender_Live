import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  RotateCw, 
  Sparkles,
  Terminal
} from 'lucide-react';
import axios from 'axios';
import { AgentTask } from '../types';
import { API_BASE_URL } from '../api';

interface DocAnalyzerProps {
  onAnalyzeComplete: (taskId: string) => void;
  activeUploadTask: AgentTask | null;
}

export default function DocAnalyzer({ onAnalyzeComplete, activeUploadTask }: DocAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setErrorMsg('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/documents/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const new_task = response.data;
      onAnalyzeComplete(new_task.id);
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit document.');
    } finally {
      setUploading(false);
    }
  };

  // Surface failure message from task logs when the task fails
  useEffect(() => {
    if (activeUploadTask?.status === 'failed') {
      const errorLog = activeUploadTask.log_messages?.slice().reverse().find(l => l.level === 'ERROR');
      setErrorMsg(errorLog?.message || 'Document analysis failed. Please try again.');
    }
  }, [activeUploadTask?.status]);

  return (
    <div className="p-8 max-w-3xl space-y-8 font-sans select-none bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      <div className="space-y-2">
        <h2 className="text-base font-display font-bold text-slate-900 dark:text-white tracking-wide">Document Intelligence</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Upload active government tender PDFs to execute zero-shot layout structure mapping, text stream extraction, and alignment checks.
        </p>
      </div>

      {/* UPLOAD FORM PANEL */}
      {!activeUploadTask && (
        <form onSubmit={handleUploadSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-[#C9A84C]/30 hover:border-[#C9A84C]/60 dark:hover:border-[#C9A84C]/50 p-10 text-center space-y-6 shadow-sm transition-all">
          <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto text-[#C9A84C] shadow-sm">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1.5 max-w-xs mx-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Drag and drop tender PDF document</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono leading-relaxed">// Supports standard bid layouts (max 40k characters)</p>
          </div>

          <div className="relative max-w-xs mx-auto">
            <input
              type="file"
              accept=".pdf"
              required
              id="pdf_file_input"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button
              type="button"
              className={`w-full py-2.5 px-4 rounded-xl border text-sm font-bold transition-all shadow-sm ${
                file 
                  ? 'border-[#C9A84C]/30 bg-[#C9A84C]/5 text-[#A07840] dark:text-[#C9A84C]' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
              }`}
            >
              {file ? `📄 ${file.name}` : 'Select PDF Document'}
            </button>
          </div>

          {errorMsg && (
            <span className="block text-sm text-danger font-bold">{errorMsg}</span>
          )}

          {file && (
            <button
              type="submit"
              disabled={uploading}
              className="py-3 px-10 rounded-xl bg-[#C9A84C] hover:bg-[#A07840] text-white font-bold text-sm shadow-premium-glow transition-all inline-flex items-center space-x-2 hover:scale-[1.02]"
            >
              {uploading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start AI Parser</span>
                </>
              )}
            </button>
          )}
        </form>
      )}

      {/* ACTIVE ANALYZER STREAM PANEL */}
      {activeUploadTask && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#C9A84C]/20 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#C9A84C]" />
              </div>
              <h3 className="text-sm font-mono font-extrabold text-slate-900 dark:text-white uppercase tracking-widest leading-none">
                Document Parsing Queue
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              ID: {activeUploadTask.id.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
<<<<<<< Updated upstream
              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                {activeUploadTask.status === 'failed'
                  ? 'Analysis failed. See error in logs below.'
                  : activeUploadTask.status === 'running'
                    ? 'Extracting text and qualifications...'
                    : 'Document parsed. Preparing matching...'}
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Chaining into the Eligibility evaluator.
              </p>
            </div>
=======
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {activeUploadTask.status === 'running' ? 'Extracting text and qualifications...' : 'Document parsed. Preparing matching...'}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Chaining into the Eligibility evaluator.</p>
            </div>
            <span className="text-xl font-bold text-[#C9A84C] font-mono">{activeUploadTask.progress}%</span>
>>>>>>> Stashed changes
          </div>

          {/* Progress loader */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-[#C9A84C] h-2 rounded-full transition-all duration-300 shadow-premium-glow"
              style={{ width: `${activeUploadTask.progress}%` }}
            ></div>
          </div>

          {/* Activity terminal log blocks */}
          <div className="space-y-2.5">
            <span className="flex items-center space-x-1.5 text-xs font-mono text-[#C9A84C] uppercase tracking-widest select-none">
              <Terminal className="w-3 h-3" />
              <span>Layout Parser logs stream</span>
            </span>
            
            <div className="bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 leading-relaxed max-h-48 overflow-y-auto select-text shadow-inner">
              {activeUploadTask.log_messages?.map((log, idx) => (
                <div key={idx} className="flex space-x-2">
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={log.level === 'ERROR' ? 'text-danger animate-pulse' : 'text-slate-300'}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
