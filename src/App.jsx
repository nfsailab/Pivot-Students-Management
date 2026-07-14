import React, { useState, useEffect } from 'react';
import { isMockMode, subscribeCollection, subscribeAuth } from './firebase';
import { 
  Monitor, 
  ShieldAlert, 
  Sparkles, 
  UserCheck, 
  RefreshCw, 
  Tv, 
  ArrowLeft,
  Settings,
  Sliders,
  X,
  AlertTriangle
} from 'lucide-react';
import logoImg from './logo.png';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/AdminLayout';
import GlobalSettingsTab from './components/GlobalSettingsTab';
import ModeSettingsTab from './components/ModeSettingsTab';
import MonitoringGrid from './components/MonitoringGrid';
import StudentClient from './components/StudentClient';

function App() {
  // Navigation & View States
  const [currentView, setCurrentView] = useState('welcome'); // welcome, admin, student, notification
  const [activeTab, setActiveTab] = useState('global'); // monitoring, global, mode-settings
  const [adminUser, setAdminUser] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Stats Counters
  const [computersCount, setComputersCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Student active session state tracker (lifted from StudentClient)
  const [isStudentSessionActive, setIsStudentSessionActive] = useState(false);

  useEffect(() => {
    let cleanupNotification = () => {};

    // Check if running inside Electron and auto-route
    if (window.electronAPI && typeof window.electronAPI.getAppMode === 'function') {
      const mode = window.electronAPI.getAppMode();
      if (mode === 'student') {
        setCurrentView('student');
      } else if (mode === 'admin') {
        setCurrentView('admin');
      } else if (mode === 'notification') {
        setCurrentView('notification');
        if (typeof window.electronAPI.onNotificationMessage === 'function') {
          cleanupNotification = window.electronAPI.onNotificationMessage((data) => {
            setNotificationMsg(data);
          });
        }
      }
    }

    // Listen to HOD Authentication changes
    const unsubAuth = subscribeAuth((user) => {
      setAdminUser(user);
    });

    // Subscriptions for basic dashboard stats
    const unsubComps = subscribeCollection('computers', (comps) => {
      setComputersCount(comps.length);
      const activeCount = comps.filter(c => c.status === 'online').length;
      setStudentsCount(activeCount);
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubComps();
      cleanupNotification();
    };
  }, []);

  // Dynamically toggle body and html background for transparent desktop overlay
  useEffect(() => {
    const isTransparentOverlay = currentView === 'student' || currentView === 'notification';
    if (isTransparentOverlay) {
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.backgroundColor = '#0b0c10';
      document.body.style.backgroundColor = '#0b0c10';
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.documentElement.style.backgroundColor = '#0b0c10';
      document.body.style.backgroundColor = '#0b0c10';
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, [currentView]);

  const isTransparentOverlay = currentView === 'student' || currentView === 'notification';

  return (
    <div className={`min-h-screen text-slate-100 flex flex-col justify-between relative transition-colors duration-300 ${isTransparentOverlay ? 'bg-transparent' : 'bg-studio-950'}`}>
      
      {/* ----------------------------------------------------
          ADMIN VIEW (DASHBOARD)
         ---------------------------------------------------- */}
      {currentView === 'admin' && (
        <div className="flex-1 flex flex-col min-h-screen">
          {!adminUser ? (
            // HOD Login Screen View
            <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
              {/* Dev Background glows */}
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-studio-accent-purple/10 blur-[120px] pointer-events-none"></div>
              
              <div className="z-10 mb-6 flex gap-3">
                {window.electronAPI && (
                  <button 
                    onClick={() => window.electronAPI.quitApp()} 
                    className="flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-200 bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/40 px-4 py-2 rounded-xl transition"
                  >
                    <X className="h-4 w-4" />
                    Exit Application
                  </button>
                )}
                {(!window.electronAPI || window.electronAPI.getAppMode() === 'welcome') && (
                  <button 
                    onClick={() => setCurrentView('welcome')} 
                    className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-studio-900 border border-white/5 px-4 py-2 rounded-xl transition hover:border-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to System Screen
                  </button>
                )}
              </div>

              <div className="z-10 w-full flex justify-center">
                <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />
              </div>
            </div>
          ) : (
            // Authenticated HOD Layout
            <AdminLayout 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              user={adminUser}
              onLogout={() => setAdminUser(null)}
            >
              {/* Tab: Real-time Monitor Grid */}
              {activeTab === 'monitoring' && <MonitoringGrid />}

              {/* Tab: Global Configuration Settings */}
              {activeTab === 'global' && <GlobalSettingsTab />}

              {/* Tab: Mode Parameters Config */}
              {activeTab === 'mode-settings' && <ModeSettingsTab />}
            </AdminLayout>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          STUDENT VIEW (DESKTOP LOGIN)
         ---------------------------------------------------- */}
      {currentView === 'student' && (
        <div className="flex-1 flex flex-col justify-center items-center relative w-full bg-transparent p-6">
          {!isStudentSessionActive && (!window.electronAPI || window.electronAPI.getAppMode() === 'welcome') && (
            <div className="z-10 mb-6 flex gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
              <button 
                onClick={() => setCurrentView('welcome')} 
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-studio-900 border border-white/5 px-4 py-2 rounded-xl transition hover:border-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to System Screen
              </button>
            </div>
          )}

          <div className="z-10 w-full flex justify-center p-2">
            <StudentClient onSessionStateChange={setIsStudentSessionActive} />
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          WELCOME VIEW (HOME VIEW SELECTION)
         ---------------------------------------------------- */}
      {currentView === 'welcome' && (
        <div className="flex-1 flex flex-col justify-between p-6 relative">
          {/* Dynamic Background Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-studio-accent-purple/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-studio-accent-blue/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

          {/* Header */}
          <header className="flex justify-between items-center z-10 p-2">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="PIVOT Logo" className="h-10 w-10 rounded-xl object-contain p-1 bg-white border border-white/10 shadow-glow-purple" />
              <div>
                <h1 className="text-2xl font-gothic font-extrabold uppercase tracking-widest text-white">
                  PIVOT <span className="text-studio-accent-purple font-sans font-normal text-sm tracking-normal">| Control Panel</span>
                </h1>
                <p className="text-xs text-slate-500">Standalone Client & Monitor Dashboard</p>
              </div>
            </div>

            {/* Database Status Indicator */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md ${
              isMockMode 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <div className={`h-2.5 w-2.5 rounded-full ${isMockMode ? 'status-dot-idle' : 'status-dot-active'}`} />
              {isMockMode ? 'Simulation Mode' : 'Firebase Cloud Online'}
            </div>
          </header>

          {/* Main View Area */}
          <main className="flex-1 flex flex-col items-center justify-center py-12 z-10">
            <div className="max-w-2xl w-full text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-accent-purple/15 text-studio-accent-purple text-xs font-semibold border border-studio-accent-purple/20">
                <Sparkles className="h-3 w-3 animate-pulse" />
                VFX Lab Control System Active
              </div>
              
              <div className="space-y-4">
                <h2 className="text-5xl md:text-6xl font-gothic font-extrabold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  PIVOT
                </h2>
                <p className="text-slate-400 text-lg max-w-lg mx-auto">
                  Cross-platform environment to oversee student workstations in real-time, configure mode guidelines, and view lab sessions.
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col items-center hover-glow">
                  <span className="text-xs text-slate-500 font-medium">TOTAL WORKSTATIONS</span>
                  <span className="text-3xl font-extrabold text-white mt-1">
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin text-studio-accent-purple" /> : computersCount}
                  </span>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col items-center hover-glow">
                  <span className="text-xs text-slate-500 font-medium">ACTIVE STUDENTS</span>
                  <span className="text-3xl font-extrabold text-white mt-1">
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin text-studio-accent-purple" /> : studentsCount}
                  </span>
                </div>
              </div>

              {/* View selectors */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <button
                  onClick={() => setCurrentView('admin')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-studio-accent-purple to-violet-600 hover:from-studio-accent-purple/90 hover:to-violet-600/90 text-white font-semibold rounded-xl transition duration-300 shadow-glow-purple flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ShieldAlert className="h-5 w-5" />
                  Launch HOD Dashboard
                </button>

                <button
                  onClick={() => setCurrentView('student')}
                  className="w-full sm:w-auto px-8 py-4 bg-studio-800 hover:bg-studio-700 text-white font-semibold rounded-xl border border-studio-700 transition duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <UserCheck className="h-5 w-5 text-studio-accent-blue" />
                  Launch Student Client
                </button>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="text-center text-xs text-slate-600 mt-8 z-10">
            <p>PIVOT v1.0 Beta • Developed with Electron + React + Tailwind + Firestore</p>
          </footer>
        </div>
      )}

      {/* ----------------------------------------------------
          NOTIFICATION VIEW (POPUP WINDOW)
         ---------------------------------------------------- */}
      {currentView === 'notification' && notificationMsg && (
        <div 
          onClick={() => window.electronAPI.clickNotification()}
          className="fixed inset-0 z-50 w-full h-full glass-panel border-amber-500/30 p-4 rounded-2xl shadow-2xl bg-amber-955 flex items-start gap-3 cursor-pointer select-none hover:border-amber-500/50 transition duration-200"
        >
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between flex-row">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">{notificationMsg.title || 'HOD Broadcast'}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.electronAPI.closeNotification();
                }}
                className="p-1 text-slate-400 hover:text-white rounded transition hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-white font-medium leading-relaxed line-clamp-3">
              {notificationMsg.text}
            </p>
            <span className="text-[9px] text-slate-500 font-mono block pt-0.5">
              Received at {new Date(notificationMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
