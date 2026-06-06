import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Tender, 
  Company, 
  AgentTask, 
  Notification, 
  EligibilityReport 
} from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TenderList from './components/TenderList';
import TenderDetails from './components/TenderDetails';
import CompanyProfile from './components/CompanyProfile';
import DocAnalyzer from './components/DocAnalyzer';
import { API_BASE_URL } from './api';
import HeroVideo from './components/HeroVideo';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Shield, Cpu, FileText, CheckCircle2, 
  Zap, Award, Activity, Compass, Lock, Building, Play, Eye
} from 'lucide-react';

function MorphingText({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [texts.length]);

  return (
    <div className="h-10 relative overflow-hidden flex justify-center items-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 15, opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -15, opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="absolute text-orange-500 font-display font-extrabold text-lg md:text-xl uppercase tracking-widest"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 500], [0, -60]);
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const backgroundY = useTransform(scrollY, [0, 500], [0, 100]);
  
  // Tab control
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Data lists state
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<{ timestamp: string; level: string; message: string }[]>([]);

  // Selected tender drawer state
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [selectedReport, setSelectedReport] = useState<EligibilityReport | null>(null);

  const selectedTenderRef = useRef<Tender | null>(selectedTender);
  const activeUploadTaskIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pollingTimerRef = useRef<number | null>(null);

  // Active triggers status
  const [analyzingTenderId, setAnalyzingTenderId] = useState<number | null>(null);
  const [isTriggeringDiscovery, setIsTriggeringDiscovery] = useState(false);
  const [activeUploadTaskId, setActiveUploadTaskId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');

  // Login page inputs
  const [loginEmail, setLoginEmail] = useState('user@tenderai.com');
  const [loginPassword, setLoginPassword] = useState('user_secure_pwd_123');
  const [loginError, setLoginError] = useState('');

  // 1. JWT LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    console.log('handleLoginSubmit called', { loginEmail, loginPassword });
    e.preventDefault();
    setLoginError('');
    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', loginEmail);
      formData.append('password', loginPassword);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
    } catch (err: any) {
      setLoginError(err.response?.data?.detail || 'Incorrect email or password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    stopDiscoveryPolling();
  };

  // 2. RETRIEVE PORTFOLIO DATA FROM FastAPI
  const fetchTasks = async () => {
    if (!token) return [];
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      console.log("Calling API: fetch tasks");
      const response = await axios.get(`${API_BASE_URL}/api/tasks`, config);
      console.log("API response: fetch tasks", response.data);
      setTasks(response.data);
      setApiError(null);

      const activeDiscoveryTasks = (response.data as AgentTask[]).filter(
        (task) => task.task_type === 'discovery' && (task.status === 'pending' || task.status === 'running')
      );
      if (activeDiscoveryTasks.length > 0) {
        startDiscoveryPolling();
      }

      return response.data as AgentTask[];
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to fetch tasks.';
      console.error(message, err);
      setApiError(message);
      return [];
    }
  };

  const fetchTenders = async () => {
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      console.log("Calling API: refresh tenders");
      const tenderResponse = await axios.get(`${API_BASE_URL}/api/tenders`, config);
      setTenders(tenderResponse.data);
      setApiError(null);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to refresh tenders.';
      console.error(message, err);
      setApiError(message);
    }
  };

  const refreshTasks = async () => {
    console.log('Manual refresh: tasks');
    await fetchTasks();
  };

  const refreshTenders = async () => {
    console.log('Manual refresh: tenders');
    await fetchTenders();
  };

  const forceSync = async () => {
    console.log('Manual refresh: force sync');
    setApiError(null);
    await Promise.all([fetchTasks(), fetchTenders()]);
  };

  const fetchUserData = async () => {
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      console.log("Calling API: fetch user data");
      // User Profile
      const meResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, config);
      setCurrentUser(meResponse.data);

      // Company Settings
      const compResponse = await axios.get(`${API_BASE_URL}/api/company/profile`, config);
      setCompany(compResponse.data);

      // Tenders catalog
      const tenderResponse = await axios.get(`${API_BASE_URL}/api/tenders`, config);
      setTenders(tenderResponse.data);

      // System Notifications
      const notifResponse = await axios.get(`${API_BASE_URL}/api/notifications`, config);
      setNotifications(notifResponse.data);

      await fetchTasks();
      setApiError(null);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to load user credentials.';
      console.error(message, err);
      setApiError(message);
    }
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchUserData();
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [token]);

  // Global 401 interceptor — auto-logout when token expires
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid — clear and force re-login
          localStorage.removeItem('token');
          setToken(null);
          setCurrentUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    selectedTenderRef.current = selectedTender;
  }, [selectedTender]);

  useEffect(() => {
    activeUploadTaskIdRef.current = activeUploadTaskId;
  }, [activeUploadTaskId]);

  // 3. ESTABLISH SSE DISPATCH RECEIVERS
  useEffect(() => {
    if (!token) return;

    let shouldReconnect = true;

    const connectStream = () => {
      if (!shouldReconnect) return;

      const streamUrl = `${API_BASE_URL}/api/tasks/stream/dashboard?access_token=${token}`;
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      setStreamStatus('connecting');
      eventSource.onopen = () => {
        const timeStr = new Date().toLocaleTimeString();
        setStreamStatus('connected');
        setLogs(prev => [...prev, {
          timestamp: timeStr,
          level: 'INFO',
          message: 'Realtime stream connected.'
        }]);
      };

      eventSource.onerror = () => {
        const timeStr = new Date().toLocaleTimeString();
        setStreamStatus('reconnecting');
        setLogs(prev => [...prev, {
          timestamp: timeStr,
          level: 'ERROR',
          message: 'Realtime stream disconnected or failed. Reconnecting...'
        }]);

        eventSource.close();
        if (shouldReconnect) {
          reconnectTimerRef.current = window.setTimeout(connectStream, 3000);
        }
      };

      eventSource.addEventListener('error', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          const timeStr = new Date().toLocaleTimeString();
          setLogs(prev => [...prev, {
            timestamp: timeStr,
            level: 'ERROR',
            message: data.error || 'Realtime event error received.'
          }]);
        } catch {
          // Ignore malformed error payloads
        }
      });

      eventSource.addEventListener('tender_discovered', (e: any) => {
        const data = JSON.parse(e.data);
        setTenders(prev => [data, ...prev]);
        const timeStr = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, {
          timestamp: timeStr,
          level: 'INFO',
          message: `New ${data.source_name} Tender Detected: [${data.tender_id}]`
        }]);
      });

      eventSource.addEventListener('eligibility_completed', (e: any) => {
        const data = JSON.parse(e.data);
        setTenders(prev => prev.map(t => t.id === data.id ? { ...t, status: 'analyzed' } : t));
        
        const selected = selectedTenderRef.current;
        if (selected && selected.id === data.id) {
          setSelectedTender(prev => prev ? { ...prev, status: 'analyzed' } : null);
          axios.get(`${API_BASE_URL}/api/tenders/${data.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => {
            setSelectedReport(res.data.eligibility_report);
          });
        }

        setAnalyzingTenderId(null);
      });

      eventSource.addEventListener('activity_log', (e: any) => {
        const data = JSON.parse(e.data);
        setLogs(prev => [...prev, data.log]);
        
        setTasks(prev => {
          const existing = prev.find(t => t.id === data.task_id);
          if (existing) {
            return prev.map(t => t.id === data.task_id ? {
              ...t,
              progress: data.progress ?? t.progress,
              status: data.status ?? t.status,
              current_agent: data.agent ?? t.current_agent,
              log_messages: [...(t.log_messages || []), data.log],
              updated_at: new Date().toISOString()
            } : t);
          }
          // Task not in local state yet — add it
          return [...prev, {
            id: data.task_id,
            task_type: data.agent === 'scraper' ? 'discovery' : 'analysis',
            status: data.status ?? 'running',
            progress: data.progress ?? 0,
            log_messages: [data.log],
            current_agent: data.agent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }];
        });

        if (activeUploadTaskIdRef.current === data.task_id && (data.status === 'completed' || data.status === 'failed')) {
          setActiveUploadTaskId(null);
          if (data.status === 'completed') fetchUserData();
        }
      });

      eventSource.addEventListener('notification_added', (e: any) => {
        const data = JSON.parse(e.data);
        setNotifications(prev => [data, ...prev]);
      });

      eventSource.addEventListener('message', (e: any) => {
        if (!e.data) return;
        try {
          const data = JSON.parse(e.data);
          const timeStr = new Date().toLocaleTimeString();
          setLogs(prev => [...prev, {
            timestamp: timeStr,
            level: 'INFO',
            message: data.message || 'Received generic event.'
          }]);
        } catch {
          // ignore non-JSON event payloads
        }
      });
    };

    connectStream();

    return () => {
      shouldReconnect = false;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [token]);

  // 4. TRIGGER AI DISCOVERY TASK
  const stopDiscoveryPolling = () => {
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsTriggeringDiscovery(false);
  };

  const pollTasks = async () => {
    const fetchedTasks = await fetchTasks();
    const activeDiscoveryTasks = fetchedTasks.filter(
      (task) => task.task_type === 'discovery' && (task.status === 'pending' || task.status === 'running')
    );

    if (activeDiscoveryTasks.length === 0) {
      console.log('No active discovery tasks remaining; stopping polling and refreshing tenders.');
      await fetchTenders();
      stopDiscoveryPolling();
    }
  };

  const startDiscoveryPolling = () => {
    if (pollingTimerRef.current) {
      return;
    }

    console.log('Polling started');
    setIsTriggeringDiscovery(true);
    pollingTimerRef.current = window.setInterval(() => {
      pollTasks();
    }, 5000);
    pollTasks();
  };

  const handleTriggerDiscovery = async () => {
    console.log('Button clicked');
    setApiError(null);
    setIsTriggeringDiscovery(true);
    try {
      console.log('Creating discovery task');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      console.log('Calling API: trigger discovery', API_BASE_URL);
      const response = await axios.post(`${API_BASE_URL}/api/tasks/start`, { task_type: 'discovery' }, config);
      console.log('API response', response.data);
      setTasks((prev) => [response.data, ...prev]);
      startDiscoveryPolling();
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Discovery request failed.';
      console.error('Discovery request failed', message, err);
      setApiError(message);
      stopDiscoveryPolling();
    }
  };

  // 5. TRIGGER MULTI-AGENT ANALYSIS TASK ON A TENDER
  const handleRunAnalysis = async (tenderId: number) => {
    setAnalyzingTenderId(tenderId);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/api/tasks/start`, { 
        task_type: 'analysis', 
        target_id: String(tenderId) 
      }, config);
    } catch (e) {
      console.error(e);
      setAnalyzingTenderId(null);
    }
  };

  // 6. SAVE PROFILE FORM SETTINGS
  const handleSaveProfile = async (payload: any) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_BASE_URL}/api/company/profile`, payload, config);
      setCompany(response.data);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // 7. INSPECT DETAILS DRAWER
  const handleTenderSelect = async (tender: Tender) => {
    setSelectedTender(tender);
    setSelectedReport(null);
    
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_BASE_URL}/api/tenders/${tender.id}`, config);
      setSelectedReport(response.data.eligibility_report);
    } catch (e) {
      console.error(e);
    }
  };

  // 8. TRIGGER REPORT EXPORT PDF/EXCEL WORKER
  const handleTriggerReport = async (format: string): Promise<string | null> => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_BASE_URL}/api/reports?format=${format}`, {}, config);
      const task = response.data;

      // Poll until task completes (up to 60s, checking every 1s)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await axios.get(`${API_BASE_URL}/api/tasks/${task.id}`, config);
        const taskData = statusResponse.data;

        if (taskData.status === 'completed' && taskData.log_messages?.length > 0) {
          // Find the log entry that has the file name: "Report generated successfully: TenderAI_XXX.pdf"
          const compiledLog = (taskData.log_messages as any[]).slice().reverse().find(
            (l: any) => l.message?.includes('generated successfully: ') || l.message?.includes('compiled: ')
          );
          if (compiledLog) {
            const splitToken = compiledLog.message.includes('generated successfully: ') 
              ? 'generated successfully: ' 
              : 'compiled: ';
            return compiledLog.message.split(splitToken)[1]?.trim() || null;
          }
        }

        if (taskData.status === 'failed') {
          const errorLog = (taskData.log_messages as any[])?.slice().reverse().find((l: any) => l.level === 'ERROR');
          throw new Error(errorLog?.message || 'Report generation failed.');
        }
      }

      throw new Error('Report generation timed out. Please try again.');
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_BASE_URL}/api/notifications/read-all`, {}, config);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };
  // 9. RENDER AUTH PANEL IF LOGGED OUT
  if (!token) {
    return (
      <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans relative">
        {/* FLOATING HEADER */}
        <header className="fixed top-0 left-0 right-0 h-20 bg-slate-950/65 backdrop-blur-md border-b border-slate-900/50 z-50 px-6 lg:px-12 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-premium-glow">
              🔮
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight text-white">TenderLive</span>
              <span className="block text-[11px] text-orange-500 font-semibold uppercase tracking-widest leading-none mt-0.5">Enterprise AI</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-10 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-orange-400 transition-colors duration-200">Features</a>
            <a href="#workflow" className="hover:text-orange-400 transition-colors duration-200">Workflow</a>
            <a href="#demo" className="hover:text-orange-400 transition-colors duration-200">Preview</a>
          </nav>

          <div>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="py-3 px-7 rounded-xl bg-orange-500 hover:bg-orange-600 text-base font-semibold text-white transition-all shadow-premium-glow hover:scale-[1.02]"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="relative min-h-[90vh] lg:min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-6 z-10 border-b border-slate-900">
          {/* Parallax Video Wrapper */}
          <motion.div 
            style={{ y: backgroundY }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <HeroVideo />
          </motion.div>

          {/* Hero Content Container */}
          <motion.div 
            style={{ y: contentY, opacity: contentOpacity }}
            className="max-w-7xl w-full mx-auto relative z-30 pt-28 pb-24 flex flex-col items-center text-center space-y-8"
          >
            <div className="inline-flex items-center space-x-2.5 px-5 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold tracking-wide">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
              <span>Platform Version 2.0 Now Live</span>
            </div>

            <motion.h1 
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12 } }
              }}
              initial="hidden"
              animate="visible"
              className="text-6xl md:text-7xl lg:text-[7rem] font-display font-extrabold text-white max-w-5xl select-none flex flex-wrap justify-center gap-x-4 md:gap-x-6" style={{ lineHeight: '0.9', letterSpacing: '-0.04em' }}
            >
              {["Win", "More", "Tenders."].map((word, idx) => (
                <motion.span
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 35, filter: "blur(10px)" },
                    visible: { opacity: 1, y: 0, filter: "blur(0px)" }
                  }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              ))}
              <div className="w-full h-0" />
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: 35, filter: "blur(10px)" },
                  visible: { opacity: 1, y: 0, filter: "blur(0px)" }
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="bg-gradient-to-r from-orange-450 via-amber-500 to-orange-500 bg-clip-text text-transparent inline-block"
              >
                Automatically.
              </motion.span>
            </motion.h1>

            <div className="w-full max-w-md">
              <MorphingText texts={[
                "Assess Risks",
                "Validate Eligibility",
                "Generate Proposals",
                "Monitor Opportunities",
                "Powered by AI"
              ]} />
            </div>

            <p className="text-lg md:text-xl text-slate-300/90 max-w-2xl mx-auto font-normal leading-relaxed">
              Discover, qualify, analyze, and generate winning tender proposals in minutes. Designed for enterprises and corporate bidding teams.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button 
                onClick={() => setShowLoginModal(true)}
                className="py-4 px-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base shadow-premium-glow hover:scale-[1.02] transition-all flex items-center space-x-2.5"
              >
                <span>Start Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a 
                href="#demo"
                className="py-4 px-10 rounded-xl bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800 text-base font-semibold text-slate-300 transition-all flex items-center space-x-2.5 backdrop-blur-sm shadow-premium hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 text-orange-400" />
                <span>View Demo Mockup</span>
              </a>
            </div>
          </motion.div>

          {/* Floating Glassmorphic Analytics Cards */}
          {/* Card 1: Match Score 92% */}
          <motion.div 
            className="hidden xl:block absolute left-[2%] top-[28%] z-30 p-4 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-premium pointer-events-none w-48 text-left"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: [0, -10, 0] 
            }}
            transition={{ 
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
              default: { duration: 0.5 }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Suitability</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-3xl font-extrabold text-white font-display">92%</div>
            <span className="text-xs text-emerald-400 font-medium block mt-1">✓ Match Score Excellent</span>
          </motion.div>

          {/* Card 2: Eligibility Approved */}
          <motion.div 
            className="hidden xl:block absolute right-[2%] top-[22%] z-30 p-4 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-premium pointer-events-none w-48 text-left"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: [0, 12, 0] 
            }}
            transition={{ 
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
              default: { duration: 0.5, delay: 0.2 }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Eligibility Audit</span>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            </div>
            <div className="text-xl font-extrabold text-white font-display flex items-center gap-1.5">
              Approved
            </div>
            <span className="text-xs text-orange-400 font-medium block mt-1">✓ Criteria checks passed</span>
          </motion.div>

          {/* Card 3: Risk Level Low */}
          <motion.div 
            className="hidden xl:block absolute left-[2%] bottom-[18%] z-30 p-4 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-premium pointer-events-none w-48 text-left"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: [0, 8, 0] 
            }}
            transition={{ 
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              default: { duration: 0.5, delay: 0.4 }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Contract Risk</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-white font-display">Low</div>
            <span className="text-xs text-emerald-400 font-medium block mt-1">✓ SLA & liability audit clear</span>
          </motion.div>

          {/* Card 4: Proposal Ready */}
          <motion.div 
            className="hidden xl:block absolute right-[2%] bottom-[20%] z-30 p-4 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-premium pointer-events-none w-48 text-left"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              y: [0, -12, 0] 
            }}
            transition={{ 
              y: { duration: 6.5, repeat: Infinity, ease: "easeInOut" },
              default: { duration: 0.5, delay: 0.6 }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">AI Draft Proposal</span>
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            </div>
            <div className="text-xl font-extrabold text-white font-display">Ready</div>
            <span className="text-xs text-orange-400 font-medium block mt-1">✓ Response draft generated</span>
          </motion.div>
        </section>

        {/* ENTERPRISE TRUST / PORTALS STRIP */}
        <section className="py-16 border-t border-b border-slate-200/50 bg-slate-50/50 relative z-10">
          <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
            <span className="block text-sm text-slate-500 font-medium uppercase tracking-widest">
              Live Monitoring & Indexing Portal Networks
            </span>
            <div className="flex flex-wrap justify-center gap-16 items-center opacity-85">
              <div className="flex items-center space-x-2 text-slate-700 font-display font-extrabold text-xl tracking-wider">
                <span>⚡ CPPP</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700 font-display font-extrabold text-xl tracking-wider">
                <span>🛒 GeM PORTAL</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700 font-display font-extrabold text-xl tracking-wider">
                <span>🌐 INDIAN BIDDING</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI AGENT WORKFLOW SYSTEM */}
        <section id="workflow" className="py-32 px-6 max-w-7xl mx-auto relative z-10 space-y-20">
          <div className="text-center space-y-5">
            <span className="text-sm text-primary-500 font-semibold uppercase tracking-widest block">Operational Architecture</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Multi-Agent Intelligence Pipeline</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Our specialized AI agents work sequentially to analyze documents, grade qualifications, and generate draft bids.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 relative">
            {[
              { step: '01', title: 'Tender Upload', icon: FileText, desc: 'Analyze layout PDF structure' },
              { step: '02', title: 'Tender Analyzer', icon: Cpu, desc: 'Extract key clauses & scope' },
              { step: '03', title: 'Match Scorer', icon: Activity, desc: 'Compare business alignment' },
              { step: '04', title: 'Eligibility Validator', icon: Shield, desc: 'Audit thresholds & terms' },
              { step: '05', title: 'Risk Assessment', icon: Award, desc: 'Highlight hidden contract traps' },
              { step: '06', title: 'Proposal Generator', icon: Zap, desc: 'Compile draft proposals' }
            ].map((node, index) => {
              const Icon = node.icon;
              return (
                <div key={index} className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center space-y-3 shadow-premium hover:border-primary-500/40 transition-all duration-300 relative group hover:scale-[1.02]">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-primary-500 group-hover:text-secondary-500 transition-all duration-300 shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-500">{node.step}</span>
                  <h4 className="text-sm font-bold text-slate-900">{node.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{node.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FEATURES BENTO GRID */}
        <section id="features" className="py-32 px-6 max-w-7xl mx-auto relative z-10 space-y-20">
          <div className="text-center space-y-5">
            <span className="text-sm text-secondary-500 font-semibold uppercase tracking-widest block">System Capabilities</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Engineered for Bid Operations</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Replace spreadsheets and manual PDF audits with modern procurement intelligence tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Box 1 (Large) */}
            <div className="md:col-span-2 glass-panel rounded-2xl p-10 flex flex-col justify-between min-h-[340px] shadow-premium hover:border-primary-500/30 transition-all hover:scale-[1.01]">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 shadow-sm">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900">AI Tender Analysis</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Automatically parses and indexes layout contracts, statement of works, and technical checklists directly from e-procurement PDF packages.
                </p>
              </div>
              <span className="block text-sm font-mono text-primary-500 mt-8 font-semibold uppercase tracking-wider">Zero-Shot Parsing Engine ➔</span>
            </div>

            {/* Box 2 */}
            <div className="glass-panel rounded-2xl p-10 flex flex-col justify-between min-h-[340px] shadow-premium hover:border-primary-500/30 transition-all hover:scale-[1.01]">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-secondary-500/10 border border-secondary-500/20 flex items-center justify-center text-secondary-500 shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900">Eligibility Screening</h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Instantly checks bid parameters against corporate MSME status, annual turnovers, locations, and past experiences.
                </p>
              </div>
              <span className="block text-sm font-mono text-secondary-500 mt-8 font-semibold uppercase tracking-wider">Compliance Matrix ➔</span>
            </div>

            {/* Box 3 */}
            <div className="glass-panel rounded-2xl p-10 flex flex-col justify-between min-h-[340px] shadow-premium hover:border-primary-500/30 transition-all hover:scale-[1.01]">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-sm">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900">Risk Intelligence</h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Identifies hidden clauses, strict SLA penalties, unrealistic timelines, and other commercial risks embedded in bid annexures.
                </p>
              </div>
              <span className="block text-sm font-mono text-rose-500 mt-8 font-semibold uppercase tracking-wider">Risk Audit Logs ➔</span>
            </div>

            {/* Box 4 (Large) */}
            <div className="md:col-span-2 glass-panel rounded-2xl p-10 flex flex-col justify-between min-h-[340px] shadow-premium hover:border-primary-500/30 transition-all hover:scale-[1.01]">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900">Proposal Outlines</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Generates technical response frameworks and draft content tailored specifically to match the tender scope and evaluation criteria.
                </p>
              </div>
              <span className="block text-sm font-mono text-emerald-500 mt-8 font-semibold uppercase tracking-wider">Draft Bid Architect ➔</span>
            </div>
          </div>
        </section>

        {/* DASHBOARD PREVIEW SECTION */}
        <section id="demo" className="py-32 px-6 max-w-7xl mx-auto relative z-10 space-y-20">
          <div className="text-center space-y-5">
            <span className="text-sm text-primary-500 font-semibold uppercase tracking-widest block">Dashboard Terminal Preview</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Built for High-Velocity Bid Operations</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Monitor discovered active tenders, track running multi-agent parsing queues, and export executive summary briefings.</p>
          </div>

          <div className="glass-panel border border-slate-200 rounded-2xl p-6 shadow-premium relative overflow-hidden bg-white/90 max-w-5xl mx-auto">
            {/* Mac topbar */}
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-200/80 mb-5 px-2 shrink-0">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-500 font-mono pl-4">tenderlive.internal/terminal</span>
            </div>

            {/* Dashboard Mockup Graphics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 opacity-90">
              <div className="glass-panel rounded-xl p-5 space-y-3 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Tenders Discovered</span>
                <span className="text-4xl font-display font-extrabold text-slate-900 block">128</span>
                <span className="text-xs text-emerald-600 font-medium block">✓ Real-time Index Active</span>
              </div>
              <div className="glass-panel rounded-xl p-5 space-y-3 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Running AI Agents</span>
                <span className="text-4xl font-display font-extrabold text-slate-900 block">4</span>
                <span className="text-xs text-amber-600 font-medium block">⚡ Active processing</span>
              </div>
              <div className="glass-panel rounded-xl p-5 space-y-3 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Avg Match Score</span>
                <span className="text-4xl font-display font-extrabold text-slate-900 block">84%</span>
                <span className="text-xs text-primary-500 font-medium block">🌐 High suitability average</span>
              </div>
              <div className="glass-panel rounded-xl p-5 space-y-3 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Proposal Tasks</span>
                <span className="text-4xl font-display font-extrabold text-slate-900 block">12</span>
                <span className="text-xs text-secondary-500 font-medium block">📋 Bidding pipelines</span>
              </div>
            </div>

            <div className="h-64 mt-5 rounded-xl border border-slate-250 bg-slate-900 p-6 flex flex-col justify-between text-slate-100">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm text-slate-400 font-mono">
                  <span>// ACTIVE EVALUATION LOGS</span>
                  <span className="text-emerald-400">STATUS: ACTIVE</span>
                </div>
                <div className="font-mono text-sm text-emerald-400/85 space-y-2.5">
                  <p>&gt; [TENDER DISCOVERY AGENT] Scanning GeM active bidding lists...</p>
                  <p>&gt; [DOCUMENT INTEL AGENT] layout PDF annexure structure mapped.</p>
                  <p>&gt; [ELIGIBILITY AGENT] turnover match passes (threshold: 500L, actual: 1250L).</p>
                  <p>&gt; [SUITABILITY SCORE AGENT] Opportunity score set to 84%.</p>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="py-2.5 px-6 rounded-lg bg-primary-500/25 hover:bg-primary-500/40 border border-primary-500/45 text-sm font-semibold text-primary-200 transition"
                >
                  Enter Live Terminal
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-200/60 py-16 bg-white relative z-10 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-lg shadow-premium-glow">
                🔮
              </div>
              <span className="font-display font-extrabold text-lg text-slate-900">TenderLive</span>
            </div>
            <span className="text-sm text-slate-500 font-mono">Enterprise Tender Intelligence System. All rights reserved.</span>
          </div>
        </footer>

        {/* LOGIN MODAL OVERLAY */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-6 select-text">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLoginModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              {/* Modal Container */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-premium relative z-10 max-h-[90vh] overflow-y-auto"
              >
                {/* Close Button */}
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 right-5 text-slate-400 hover:text-slate-700 text-2xl font-bold transition-all"
                >
                  ×
                </button>

                <div className="text-center space-y-3 mb-6">
                  <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-premium-glow">
                    🔮
                  </div>
                  <div>
                    <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">TenderLive Login</h1>
                    <span className="text-sm text-orange-500 font-semibold tracking-wide">Intelligence Terminal Access</span>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-base text-slate-900 placeholder:text-slate-400"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-base text-slate-900 placeholder:text-slate-400"
                      placeholder="••••••••"
                    />
                  </div>

                  {loginError && (
                    <span className="block text-sm text-rose-500 font-semibold">{loginError}</span>
                  )}

                  <button
                    type="submit"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('login button clicked');
                      handleLoginSubmit(e as unknown as React.FormEvent);
                    }}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-xl shadow-[0_0_25px_rgba(249,115,22,0.3)] hover:shadow-[0_0_35px_rgba(249,115,22,0.45)] hover:scale-[1.01] transition-all mt-2"
                  >
                    Sign In →
                  </button>
                </form>

                {/* Quick links to seed credentials */}
                <div className="border-t border-slate-200 pt-5 text-center space-y-3 select-text">
                  <span className="block text-xs text-slate-500 font-mono">Quick fill demo accounts</span>
                  <div className="flex gap-3 justify-center">
                    <button 
                      onClick={() => { setLoginEmail('user@tenderai.com'); setLoginPassword('user_secure_pwd_123'); }}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-lg text-sm text-slate-700 hover:text-slate-900 transition font-medium"
                    >
                      Corporate User
                    </button>
                    <button 
                      onClick={() => { setLoginEmail('admin@tenderai.com'); setLoginPassword('admin_secure_pwd_123'); }}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-lg text-sm text-slate-700 hover:text-slate-900 transition font-medium"
                    >
                      Administrator
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }


  // 10. DISPLAY FULL PLATFORM IF LOGGED IN
  const activeUploadTask = tasks.find(t => t.id === activeUploadTaskId) || null;

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      notifications={notifications}
      onLogout={handleLogout}
      onMarkNotificationsRead={handleMarkNotificationsRead}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          tenders={tenders}
          tasks={tasks}
          logs={logs}
          streamStatus={streamStatus}
          onTriggerDiscovery={handleTriggerDiscovery}
          isTriggering={isTriggeringDiscovery}
          onRefreshTasks={refreshTasks}
          onRefreshTenders={refreshTenders}
          onForceSync={forceSync}
          onTenderSelect={handleTenderSelect}
          errorMessage={apiError}
        />
      )}

      {activeTab === 'tenders' && (
        <TenderList
          tenders={tenders}
          onTenderSelect={handleTenderSelect}
          onRunAnalysis={handleRunAnalysis}
          analyzingTenderId={analyzingTenderId}
        />
      )}

      {activeTab === 'upload' && (
        <DocAnalyzer
          onAnalyzeComplete={(taskId) => {
            setActiveUploadTaskId(taskId);
            setActiveTab('upload');
          }}
          activeUploadTask={activeUploadTask}
        />
      )}

      {activeTab === 'company' && (
        <CompanyProfile
          company={company}
          onSaveProfile={handleSaveProfile}
          saving={false}
        />
      )}

      {/* Tender inspector details drawer */}
      {selectedTender && (
        <TenderDetails
          tender={selectedTender}
          eligibilityReport={selectedReport}
          onClose={() => setSelectedTender(null)}
          onRunAnalysis={handleRunAnalysis}
          analyzingTenderId={analyzingTenderId}
          onTriggerReport={handleTriggerReport}
        />
      )}
    </Layout>
  );
}
