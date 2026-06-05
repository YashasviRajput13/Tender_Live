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

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Tab control
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
      <div className="flex h-screen items-center justify-center bg-[#0B0F19] text-slate-200 p-6 font-['Plus_Jakarta_Sans'] select-text">
        <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative">
          
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-slate-950 font-bold text-2xl mx-auto shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse">
              🔮
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white font-['Outfit'] tracking-wide">TenderAI</h1>
              <span className="text-xs text-brand-400 font-semibold tracking-widest uppercase">Agentic Discovery & Analysis</span>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password Credentials</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
              />
            </div>

            {loginError && (
              <span className="block text-xs text-rose-500 font-semibold">{loginError}</span>
            )}

            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                console.log('login button clicked');
                handleLoginSubmit(e as unknown as React.FormEvent);
              }}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg hover:scale-[1.01] transition-all pt-3.5"
            >
              Sign In to Intelligence Terminal
            </button>
          </form>

          {/* Quick links to seed credentials */}
          <div className="border-t border-slate-850 pt-4 text-center space-y-2 select-text">
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest">// Local Seed Credentials</span>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => { setLoginEmail('user@tenderai.com'); setLoginPassword('user_secure_pwd_123'); }}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-slate-400 hover:text-slate-200"
              >
                Corporate Profile User
              </button>
              <button 
                onClick={() => { setLoginEmail('admin@tenderai.com'); setLoginPassword('admin_secure_pwd_123'); }}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-slate-400 hover:text-slate-200"
              >
                Portal Administrator
              </button>
            </div>
          </div>

        </div>
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
