import React, { useState } from 'react';
import { 
  Globe, 
  Terminal, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  ArrowRight, 
  Database, 
  X, 
  Clock, 
  Building2, 
  MapPin,
  Sparkles
} from 'lucide-react';
import { runScraper, convertScrapedToTender, ScrapedTenderItem, ScrapeLogEntry, ScrapeResponse } from '../services/scraperApi';
import { Tender } from '../types';

interface LiveScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTender: (tender: Tender) => void;
}

export function LiveScraperModal({ isOpen, onClose, onImportTender }: LiveScraperModalProps) {
  const [selectedSource, setSelectedSource] = useState<'all' | 'gem' | 'cppp'>('all');
  const [limit, setLimit] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScrapedTenderItem[]>([]);
  const [logs, setLogs] = useState<ScrapeLogEntry[]>([]);
  const [lastScrapeInfo, setLastScrapeInfo] = useState<{ durationMs: number; status: string } | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [importingId, setImportingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartScraping = async () => {
    setIsLoading(true);
    setLogs([
      {
        timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
        level: 'info',
        message: `Dispatching live scraping job to ${selectedSource.toUpperCase()} portal...`
      }
    ]);

    try {
      const resp: ScrapeResponse = await runScraper(selectedSource, limit);
      setResults(resp.tenders || []);
      setLogs(resp.logs || []);
      setLastScrapeInfo({
        durationMs: resp.durationMs,
        status: resp.status
      });
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
          level: 'error',
          message: `Scraper execution failure: ${err?.message || 'Network error'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSingle = async (scrapedItem: ScrapedTenderItem) => {
    setImportingId(scrapedItem.tender_id);
    try {
      const fullTender = await convertScrapedToTender(scrapedItem);
      onImportTender(fullTender);
      onClose();
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setImportingId(null);
    }
  };

  const handleImportAll = async () => {
    if (results.length === 0) return;
    setIsLoading(true);
    for (const item of results) {
      const fullTender = await convertScrapedToTender(item);
      onImportTender(fullTender);
    }
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0b1c30] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Live Government Tender Scraper</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GeM & CPPP Engine
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Scrapes live active bids from <span className="text-blue-300 font-mono">bidplus.gem.gov.in</span> & <span className="text-blue-300 font-mono">eprocure.gov.in</span> with automated AI verification.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Bar & Parameters */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Portal</label>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSelectedSource('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedSource === 'all' 
                      ? 'bg-[#0b1c30] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Both (GeM + CPPP)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSource('gem')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedSource === 'gem' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GeM BidPlus Only
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSource('cppp')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedSource === 'cppp' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CPPP eProcure Only
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Tender Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value={5}>5 Bids</option>
                <option value={10}>10 Bids</option>
                <option value={15}>15 Bids</option>
                <option value={25}>25 Bids</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center space-x-1.5 transition-colors ${
                showLogs 
                  ? 'bg-slate-200 text-slate-800 border-slate-300' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showLogs ? 'Hide Scraper Terminal' : 'Show Scraper Terminal'}</span>
            </button>

            <button
              type="button"
              onClick={handleStartScraping}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-[#0b1c30] hover:from-blue-700 hover:to-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Scraper...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Live Scrape</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Discovered Tenders Header */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center space-x-2 text-xs font-semibold text-slate-800">
          <Database className="w-4 h-4 text-blue-600" />
          <span>Discovered Tenders ({results.length})</span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Real-time Execution Terminal */}
          {showLogs && (
            <div className="rounded-xl bg-slate-950 text-slate-200 border border-slate-800 p-3.5 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span>Scraper Engine Telemetry</span>
                </div>
                {lastScrapeInfo && (
                  <span className="text-slate-400">
                    Duration: {lastScrapeInfo.durationMs}ms | Status: {lastScrapeInfo.status.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto scrollbar-thin">
                {logs.length === 0 ? (
                  <p className="text-slate-500 italic">No scrape logs yet. Click "Start Live Scrape" to initialize portal discovery.</p>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={`shrink-0 uppercase font-bold text-[10px] px-1 rounded ${
                        log.level === 'success' ? 'bg-emerald-950 text-emerald-400' :
                        log.level === 'warn' ? 'bg-amber-950 text-amber-400' :
                        log.level === 'error' ? 'bg-rose-950 text-rose-400' :
                        'bg-blue-950 text-blue-400'
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-slate-300 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Discovered Tenders List */}
          <div>
              {results.length === 0 && !isLoading ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">Ready to Scrape Live Government Tenders</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Select your target portal and click "Start Live Scrape". The scraper will extract active bids from GeM BidPlus and CPPP eProcure with automated parsing of tender IDs, closing dates, departments, and criteria.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartScraping}
                    className="px-4 py-2 bg-[#0b1c30] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs inline-flex items-center space-x-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Scrape Active Tenders Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {results.length} Active Tenders Discovered
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Ready for 1-Click Verification Workbench Ingestion)
                      </span>
                    </div>
                    {results.length > 0 && (
                      <button
                        onClick={handleImportAll}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Import All ({results.length}) to Registry</span>
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Portal / ID</th>
                          <th className="px-4 py-3">Title & Category</th>
                          <th className="px-4 py-3">Department & Location</th>
                          <th className="px-4 py-3">Estimated Budget</th>
                          <th className="px-4 py-3">Closing Date</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {results.map((tender) => (
                          <tr key={tender.tender_id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase mb-1 ${
                                tender.source_name === 'GeM' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {tender.source_name}
                              </span>
                              <div className="font-mono text-xs font-semibold text-slate-900">
                                {tender.tender_id}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-slate-900 leading-snug line-clamp-2">
                                {tender.title}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                {tender.eligibility_criteria}
                              </p>
                              {tender.source_url && (
                                <a
                                  href={tender.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 mt-1"
                                >
                                  <span>Official Portal Record</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap">
                              <div className="flex items-center space-x-1 text-slate-700 font-medium">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[180px]" title={tender.department}>
                                  {tender.department}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-slate-500 text-[11px] mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{tender.location}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap font-medium text-slate-900">
                              {tender.budget ? (
                                `₹ ${(tender.budget / 10000000).toFixed(2)} Cr`
                              ) : (
                                <span className="text-slate-400 italic">As per RFP</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>
                                  {tender.deadline 
                                    ? new Date(tender.deadline).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })
                                    : 'Ongoing'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => handleImportSingle(tender)}
                                disabled={importingId === tender.tender_id}
                                className="px-3 py-1.5 bg-[#0b1c30] hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-xs inline-flex items-center space-x-1 transition-all disabled:opacity-50"
                              >
                                <span>Verify with AI</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs text-slate-500">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
