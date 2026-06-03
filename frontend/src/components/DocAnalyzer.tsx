import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  RotateCw, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Terminal,
  Award
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

  return (
    <div className="p-8 max-w-3xl space-y-8 font-['Plus_Jakarta_Sans'] font-medium select-text">
      
      <div className="space-y-2">
        <h2 className="text-base font-extrabold text-white font-['Outfit']">Document Intelligence Agent</h2>
        <p className="text-xs text-slate-400">
          Upload active government tender PDFs to run zero-shot layout reading, structural extraction, and custom eligibility parsing.
        </p>
      </div>

      {/* UPLOAD FORM PANEL */}
      {!activeUploadTask && (
        <form onSubmit={handleUploadSubmit} className="glass-panel rounded-2xl border border-slate-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-brand-400 shadow-md">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-xs font-bold text-slate-200">Drag and drop tender PDF here</h3>
            <p className="text-[11px] text-slate-500">Supports standard e-Procurement layouts (max 40k character text streams)</p>
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
              className="w-full py-2.5 px-4 rounded-xl border border-slate-700/80 hover:bg-slate-800 text-xs font-semibold text-slate-200"
            >
              {file ? file.name : 'Select PDF File'}
            </button>
          </div>

          {errorMsg && (
            <span className="block text-xs text-rose-500 font-bold">{errorMsg}</span>
          )}

          {file && (
            <button
              type="submit"
              disabled={uploading}
              className="py-2.5 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading bid document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start AI Layout Parsing</span>
                </>
              )}
            </button>
          )}
        </form>
      )}

      {/* ACTIVE ANALYZER STREAM PANEL */}
      {activeUploadTask && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Document Parsing Queue
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              ID: {activeUploadTask.id.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">
                {activeUploadTask.status === 'running' ? 'Extracting text and qualifications...' : 'Document parsed. Preparing matching...'}
              </h4>
              <p className="text-[10px] text-slate-400">Chaining into the Eligibility evaluator.</p>
            </div>
            <span className="text-sm font-extrabold text-brand-400">{activeUploadTask.progress}%</span>
          </div>

          {/* Progress loader */}
          <div className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-brand-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${activeUploadTask.progress}%` }}
            ></div>
          </div>

          {/* Activity terminal log blocks */}
          <div className="space-y-2">
            <span className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              <Terminal className="w-3 h-3" />
              <span>Layout Parser logs stream</span>
            </span>
            
            <div className="bg-slate-950/90 border border-slate-850 rounded-xl p-4 font-mono text-[9px] text-emerald-400/90 leading-relaxed max-h-48 overflow-y-auto shadow-inner">
              {activeUploadTask.log_messages?.map((log, idx) => (
                <div key={idx} className="flex space-x-2">
                  <span className="text-slate-650">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={log.level === 'ERROR' ? 'text-rose-400' : 'text-slate-350'}>
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
