import React, { useState } from 'react';
import { 
  Briefcase, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Bell, 
  Upload, 
  Sparkles,
  User
} from 'lucide-react';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="flex h-screen bg-background text-slate-900 overflow-hidden font-sans select-none">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-surface border-r border-slate-200 flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-200 flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-premium-glow">
              🔮
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight text-slate-900 leading-none">TenderLive</span>
              <span className="block text-[11px] text-primary-500 font-semibold tracking-widest uppercase mt-0.5">Enterprise AI</span>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-premium' 
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary-500' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
 
        {/* User profile details bottom */}
        <div className="p-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center space-x-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
            <div className="w-9 h-9 rounded-full bg-primary-500/10 border border-primary-500/25 flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">
              {currentUser?.full_name ? currentUser.full_name[0] : 'Y'}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-semibold text-slate-900 truncate">{currentUser?.full_name || 'Yashasvi Rajput'}</span>
              <span className="block text-xs text-slate-500 font-mono truncate">{currentUser?.email}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-danger/10 hover:text-danger border border-slate-200 hover:border-danger/30 text-sm font-medium text-slate-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
 
      {/* MAIN CONTENT SPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 bg-white">
        
        {/* HEADER */}
        <header className="h-16 bg-white/75 border-b border-slate-200 px-8 flex items-center justify-between backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4.5 h-4.5 text-primary-500" />
            <h1 className="text-sm font-semibold tracking-wide text-slate-500">
              {activeTab === 'dashboard' && 'Intelligence Terminal'}
              {activeTab === 'tenders' && 'Tenders Database'}
              {activeTab === 'upload' && 'Document Intelligence'}
              {activeTab === 'company' && 'Eligibility Matrix'}
            </h1>
          </div>
 
          <div className="flex items-center space-x-4">
            {/* Notification Badge Bell */}
            <div className="relative">
              <button 
                onClick={handleNotificationClick}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 relative transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border border-white shadow-premium-glow animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
 
              {/* Notification Overlay Popover */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-premium p-4 z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">System Alerts</span>
                        <span className="text-[9px] text-slate-500 font-mono">{notifications.length} Total</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 select-text">
                        {notifications.length === 0 ? (
                          <span className="block text-center py-6 text-xs text-slate-500 font-medium">No active alerts</span>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
                              n.is_read ? 'bg-slate-50/50 border-slate-100 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 font-medium'
                            }`}>
                              <p>{n.message}</p>
                              <span className="block text-[8px] text-slate-450 mt-1 font-mono">
                                {new Date(n.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
 
            <div className="text-xs px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-600 font-semibold flex items-center space-x-1.5 shadow-[inset_0_0_10px_rgba(249,115,22,0.02)]">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse"></span>
              <span className="tracking-wide font-mono">Live Node Connected</span>
            </div>
          </div>
        </header>
 
        {/* CHILDS VIEW */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
