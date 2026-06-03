import React, { useState } from 'react';
import { 
  Briefcase, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  Bell, 
  Upload, 
  Sparkles,
  Search
} from 'lucide-react';
import { Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { email: string; role: string; full_name?: string } | null;
  notifications: Notification[];
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
}

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab, 
  currentUser, 
  notifications, 
  onLogout,
  onMarkNotificationsRead
}: LayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      onMarkNotificationsRead();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Intelligence Hub', icon: LayoutDashboard },
    { id: 'tenders', label: 'Tender Explorer', icon: Briefcase },
    { id: 'upload', label: 'Document Analyzer', icon: Upload },
    { id: 'company', label: 'Company Profile', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-200 overflow-hidden font-['Plus_Jakarta_Sans']">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800/80 flex items-center space-x-3">
            <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              🔮
            </div>
            <div>
              <span className="font-extrabold text-lg text-white font-['Outfit'] tracking-wide">TenderAI</span>
              <span className="block text-[10px] text-brand-400 font-semibold tracking-wider uppercase">Agentic Discovery</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-slate-800 text-brand-400 shadow-[inset_3px_0_0_#10B981]' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile details bottom */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-brand-400 font-bold border border-slate-600">
              {currentUser?.full_name ? currentUser.full_name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-semibold text-white truncate">{currentUser?.full_name || 'Yashasvi Rajput'}</span>
              <span className="block text-[10px] text-slate-500 truncate">{currentUser?.email}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-700/60 hover:border-rose-900/40 text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT SPACE */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-[#0F172A]/80 border-b border-slate-800/80 px-8 flex items-center justify-between backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h1 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
              {activeTab === 'dashboard' && 'Intelligence Terminal'}
              {activeTab === 'tenders' && 'Tenders Database'}
              {activeTab === 'upload' && 'Document Intelligence Agent'}
              {activeTab === 'company' && 'Company Eligibility Matrix'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Badge Bell */}
            <div className="relative">
              <button 
                onClick={handleNotificationClick}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 relative transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center border border-slate-900 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="text-xs font-bold text-white uppercase">System Alerts</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{notifications.length} Total</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <span className="block text-center py-6 text-xs text-slate-500">No active alerts</span>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-2.5 rounded-lg border text-[11px] leading-relaxed transition-all ${
                          n.is_read ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' : 'bg-slate-700/40 border-slate-600/60 text-slate-200'
                        }`}>
                          <p>{n.message}</p>
                          <span className="block text-[9px] text-slate-500 mt-1">
                            {new Date(n.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-brand-400 font-bold flex items-center space-x-1.5 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-ping"></span>
              <span className="uppercase text-[10px] font-mono tracking-wider">Live Node Connected</span>
            </div>
          </div>
        </header>

        {/* CHILDS VIEW */}
        <main className="flex-1 overflow-y-auto bg-[#0B0F19]">
          {children}
        </main>
      </div>

    </div>
  );
}
