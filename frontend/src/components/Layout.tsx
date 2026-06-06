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
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler";
import Logo from './Logo';

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
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-hidden font-sans select-none transition-colors duration-300">
      
      {/* HEADER NAVBAR */}
      <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between z-30 shrink-0 shadow-sm transition-colors duration-300">
        
        {/* Logo (Left) */}
        <div className="flex items-center select-none shrink-0">
          <Logo variant="header" className="h-10 w-auto" />
        </div>


        {/* Capsule Navigation (Center) */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-inner relative shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative">
                {/* Active indicator bar above button */}
                {isActive && (
                  <div className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-8 h-1 bg-[#C9A84C] rounded-full shadow-[0_0_8px_#C9A84C]" />
                )}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2.5 px-5 h-11 rounded-full text-[14px] font-semibold tracking-wide transition-all duration-300 border ${
                    isActive 
                      ? 'bg-white dark:bg-slate-900 border-[#C9A84C] text-slate-900 dark:text-white shadow-[0_8px_24px_rgba(201,168,76,0.18)]' 
                      : 'bg-transparent border-transparent text-slate-700 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white hover:border-[#C9A84C]/45 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:translate-y-[-1px] active:scale-[0.98]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors duration-300 ${isActive ? 'text-[#C9A84C]' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Controls & User Profile (Right) */}
        <div className="flex items-center space-x-4 shrink-0">
          <AnimatedThemeToggler />
          
          {/* Notification Badge Bell */}
          <div className="relative">
            <button 
              onClick={handleNotificationClick}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 relative transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9A84C] rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-white shadow-premium-glow animate-pulse">
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
                    className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium p-4 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">System Alerts</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{notifications.length} Total</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 select-text">
                      {notifications.length === 0 ? (
                        <span className="block text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">No active alerts</span>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-2.5 rounded-xl border text-xs leading-relaxed transition-all ${
                            n.is_read ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400' : 'bg-[#C9A84C]/5 dark:bg-[#C9A84C]/10 border-[#C9A84C]/20 text-slate-800 dark:text-slate-200 font-medium'
                          }`}>
                            <p>{n.message}</p>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
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

          <div className="text-sm px-3.5 py-1.5 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] font-semibold flex items-center space-x-1.5 hidden xl:flex">
            <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full animate-pulse"></span>
            <span className="tracking-wide font-mono">Live Node</span>
          </div>

          {/* User profile dropdown box */}
          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-1.5 pr-3 rounded-full select-none max-w-[200px]">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center text-[#C9A84C] font-bold text-sm shrink-0">
              {currentUser?.full_name ? currentUser.full_name[0] : 'Y'}
            </div>
            <div className="overflow-hidden leading-tight flex-1 hidden md:block">
              <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">{currentUser?.full_name || 'Yashasvi Rajput'}</span>
              <span className="block text-[9px] text-slate-500 dark:text-slate-450 font-semibold font-mono truncate">{currentUser?.email}</span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* CHILDS VIEW */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {children}
      </main>
    </div>
  );
}
