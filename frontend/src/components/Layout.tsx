import React, { useState } from 'react';
import { 
  Briefcase, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Bell, 
  Upload, 
  Sparkles,
  User,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp
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
  onMarkNotificationRead?: (id: number) => void;
}

export default function Layout({ 
  children, 
  activeTab, 
  setActiveTab, 
  currentUser, 
  notifications, 
  onLogout,
  onMarkNotificationsRead,
  onMarkNotificationRead
}: LayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedNotifId, setExpandedNotifId] = useState<number | null>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      onMarkNotificationsRead();
    }
  };

  const handleItemClick = (n: Notification) => {
    setExpandedNotifId(expandedNotifId === n.id ? null : n.id);
    if (!n.is_read && onMarkNotificationRead) {
      onMarkNotificationRead(n.id);
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
                    className="absolute right-0 mt-2.5 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium p-4 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-mono">System Alerts</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{notifications.length} Total</span>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto space-y-2.5 pr-1 select-text">
                      {notifications.length === 0 ? (
                        <span className="block text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">No active alerts</span>
                      ) : (
                        notifications.map((n) => {
                          const isExpanded = expandedNotifId === n.id;
                          const isCritical = n.priority === 'CRITICAL';
                          
                          // Determine colors based on priority / status / type
                          let cardBorderColor = 'border-slate-200 dark:border-slate-800';
                          let cardBgColor = 'bg-white dark:bg-slate-900';
                          let iconColor = 'text-slate-500';
                          let IconComponent = AlertCircle;

                          if (isCritical) {
                            cardBorderColor = 'border-rose-500 dark:border-rose-600';
                            cardBgColor = 'bg-rose-50/20 dark:bg-rose-950/10';
                            iconColor = 'text-rose-500';
                            IconComponent = AlertTriangle;
                          } else if (n.type === 'RISK_ALERT') {
                            cardBorderColor = 'border-red-400 dark:border-red-900/50';
                            cardBgColor = 'bg-red-50/10 dark:bg-red-950/5';
                            iconColor = 'text-red-500';
                            IconComponent = AlertTriangle;
                          } else if (n.type === 'DEADLINE_ALERT') {
                            cardBorderColor = 'border-blue-400 dark:border-blue-900/50';
                            cardBgColor = 'bg-blue-50/10 dark:bg-blue-950/5';
                            iconColor = 'text-blue-500';
                            IconComponent = Clock;
                          } else if (n.type === 'HIGH_MATCH') {
                            cardBorderColor = 'border-emerald-400 dark:border-emerald-900/50';
                            cardBgColor = 'bg-emerald-50/10 dark:bg-emerald-950/5';
                            iconColor = 'text-emerald-500';
                            IconComponent = Sparkles;
                          } else if (n.type === 'MEDIUM_MATCH') {
                            cardBorderColor = 'border-amber-400 dark:border-amber-900/50';
                            cardBgColor = 'bg-amber-50/10 dark:bg-amber-950/5';
                            iconColor = 'text-amber-500';
                            IconComponent = AlertCircle;
                          }

                          // If read, mute the colors
                          if (n.is_read) {
                            cardBgColor = 'bg-slate-50/50 dark:bg-slate-800/20';
                            cardBorderColor = 'border-slate-200 dark:border-slate-800';
                            iconColor = 'text-slate-400 dark:text-slate-500';
                          }

                          return (
                            <div 
                              key={n.id} 
                              onClick={() => handleItemClick(n)}
                              className={`p-3 rounded-xl border text-[11px] leading-relaxed transition-all cursor-pointer relative shadow-sm hover:shadow-md ${cardBorderColor} ${cardBgColor} ${
                                !n.is_read && isCritical ? 'shadow-[0_0_10px_rgba(244,63,94,0.22)] border-rose-500 dark:border-rose-400 animate-pulse' : ''
                              }`}
                            >
                              {/* Header row with Icon, Title, Badge, Read dot, check button */}
                              <div className="flex items-start justify-between space-x-2">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <IconComponent className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                                  <span className={`font-bold truncate ${n.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {n.title || "Tender Alert"}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  {/* Priority Badge */}
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider select-none ${
                                    isCritical 
                                      ? 'bg-rose-500 text-white' 
                                      : n.priority === 'HIGH' 
                                        ? 'bg-red-500 text-white' 
                                        : n.priority === 'MEDIUM' 
                                          ? 'bg-[#C9A84C] text-white' 
                                          : 'bg-slate-400 text-white'
                                  }`}>
                                    {n.priority}
                                  </span>
                                  {/* Mark Read button */}
                                  {!n.is_read && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onMarkNotificationRead) onMarkNotificationRead(n.id);
                                      }}
                                      className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-450"
                                      title="Mark as read"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                </div>
                              </div>

                              {/* Message snippet/full */}
                              <p className={`mt-1.5 text-slate-650 dark:text-slate-350 ${isExpanded ? '' : 'line-clamp-2 text-slate-500'}`}>
                                {n.message}
                              </p>

                              {/* Expandable details */}
                              {isExpanded && (
                                <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                  {/* Evidence block */}
                                  {n.metadata?.evidence && n.metadata.evidence.length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <span className="font-bold text-[10px] text-slate-500 dark:text-slate-450 block mb-1 uppercase tracking-wider font-mono">
                                        📋 Deterministic Evidence
                                      </span>
                                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[10.5px]">
                                        {n.metadata.evidence.map((ev, i) => (
                                          <li key={i}>{ev}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* AI summaries */}
                                  {n.metadata && (
                                    <div className="space-y-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-850">
                                      {n.metadata.why_this_tender_matches && (
                                        <div>
                                          <strong className="text-slate-600 dark:text-slate-350">Why it matches:</strong> {n.metadata.why_this_tender_matches}
                                        </div>
                                      )}
                                      {n.metadata.recommended_action && (
                                        <div>
                                          <strong className="text-slate-600 dark:text-slate-350">Recommendation:</strong> {n.metadata.recommended_action}
                                        </div>
                                      )}
                                      {n.metadata.risk_summary && (
                                        <div>
                                          <strong className="text-slate-600 dark:text-slate-350 text-rose-500 dark:text-rose-400">Risk summary:</strong> {n.metadata.risk_summary}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Timestamp */}
                              <span className="block text-[8.5px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                                {new Date(n.created_at).toLocaleString()}
                              </span>
                            </div>
                          );
                        })
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
