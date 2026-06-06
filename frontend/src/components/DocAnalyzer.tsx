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
    <div className="p-8 max-w-3xl space-y-8 font-sans select-none bg-white">
      
      <div className="space-y-2">
        <h2 className="text-sm font-display font-bold text-slate-900 tracking-wide">Document Intelligence</h2>
        <p className="text-xs text-slate-500">
          Upload active government tender PDFs to execute zero-shot layout structure mapping, text stream extraction, and alignment checks.
        </p>
      </div>

      {/* UPLOAD FORM PANEL */}
      {!activeUploadTask && (
        <form onSubmit={handleUploadSubmit} className="glass-panel rounded-2xl border border-slate-200 p-10 text-center space-y-6 shadow-premium bg-white/70">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-primary-500 shadow-inner">
            <Upload className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-1.5 max-w-xs mx-auto">
            <h3 className="text-xs font-bold text-slate-900">Drag and drop tender PDF document</h3>
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">// Supports standard bid layouts (max 40k characters)</p>
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
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-sm"
            >
              {file ? file.name : 'Select PDF Document'}
            </button>
          </div>

          {errorMsg && (
            <span className="block text-xs text-danger font-bold">{errorMsg}</span>
          )}

          {file && (
            <button
              type="submit"
              disabled={uploading}
              className="py-2.5 px-8 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-premium-glow transition-all inline-flex items-center space-x-2"
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
        <div className="glass-panel rounded-2xl border border-slate-200 p-6 space-y-6 shadow-premium bg-white/70">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-primary-500" />
              <h3 className="text-xs font-mono font-extrabold text-slate-900 uppercase tracking-widest leading-none">
                Document Parsing Queue
              </h3>
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              ID: {activeUploadTask.id.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
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
          </div>

          {/* Progress loader */}
          <div className="w-full bg-slate-105 rounded-full h-1.5 overflow-hidden shadow-inner">
            <div 
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-300 shadow-premium-glow"
              style={{ width: `${activeUploadTask.progress}%` }}
            ></div>
          </div>

          {/* Activity terminal log blocks */}
          <div className="space-y-2.5">
            <span className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-widest select-none">
              <Terminal className="w-3 h-3 text-slate-400" />
              <span>Layout Parser logs stream</span>
            </span>
            
            <div className="bg-slate-900 border border-slate-805 rounded-xl p-4 font-mono text-[9px] text-secondary-400 leading-relaxed max-h-48 overflow-y-auto select-text shadow-inner">
              {activeUploadTask.log_messages?.map((log, idx) => (
                <div key={idx} className="flex space-x-2">
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={log.level === 'ERROR' ? 'text-danger animate-pulse' : 'text-slate-250'}>
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
