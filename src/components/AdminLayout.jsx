import React, { useState, useEffect } from 'react';
import { logoutHOD, isMockMode, subscribeCollection } from '../firebase';
import { 
  LayoutGrid, 
  Settings, 
  Sliders, 
  LogOut, 
  Clock, 
  Database, 
  User, 
  ChevronRight,
  Tv,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import logoImg from '../logo.png';
import nailLogo from '../nail-logo.png';

function AdminLayout({ activeTab, setActiveTab, user, onLogout, children }) {
  const [time, setTime] = useState(new Date());

  // Client Update States
  const [appVersion, setAppVersion] = useState(() => {
    const stored = localStorage.getItem('hod_client_version');
    if (!stored || stored !== '1.0 Beta') {
      localStorage.setItem('hod_client_version', '1.0 Beta');
      return '1.0 Beta';
    }
    return stored;
  });
  const [targetVersion, setTargetVersion] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [downloadUrl, setDownloadUrl] = useState('');

  // Fetch local version from Electron on mount
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getVersion === 'function') {
      window.electronAPI.getVersion()
        .then(ver => {
          if (ver) setAppVersion(ver);
        })
        .catch(err => console.error('Failed to get app version:', err));
    }
  }, []);

  // Listen to Firestore version updates
  useEffect(() => {
    const unsubscribe = subscribeCollection('app_versions', (versions) => {
      const hodConfig = versions.find(v => v.id === 'hod');
      if (hodConfig) {
        setTargetVersion(hodConfig.version);
        setDownloadUrl(hodConfig.downloadUrl);
        if (hodConfig.version !== appVersion) {
          setUpdateAvailable(true);
        } else {
          setUpdateAvailable(false);
        }
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [appVersion]);

  const handleCheckUpdates = () => {
    setIsUpdating(true);
    setUpdateStatus('Checking for updates...');
    setTimeout(() => {
      setIsUpdating(false);
      setUpdateStatus('');
      if (updateAvailable) {
        // The modal will open automatically in UI
      } else {
        alert(`You are up to date! Currently running version ${appVersion}.`);
      }
    }, 1000);
  };

  const startUpdateDownload = () => {
    setUpdateAvailable(false);
    setIsUpdating(false);
    if (downloadUrl) {
      if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(downloadUrl);
      } else {
        window.open(downloadUrl, '_blank');
      }
    } else {
      alert('Update link is not configured in Firestore. Please contact the HOD.');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutHOD();
      if (onLogout) onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { id: 'monitoring', label: 'Monitor Grid', icon: LayoutGrid, desc: 'Real-time PC monitoring' },
    { id: 'global', label: 'Global Settings', icon: Settings, desc: 'Students, Batches & Modes' },
    { id: 'mode-settings', label: 'Mode Settings', icon: Sliders, desc: 'Parameters per category' }
  ];

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex h-screen w-screen bg-studio-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Background glow accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-studio-accent-purple/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-studio-accent-blue/5 blur-[100px] pointer-events-none"></div>

      {/* Left Sidebar */}
      <aside className="w-72 bg-studio-900 border-r border-white/5 flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <img src={logoImg} alt="PIVOT Logo" className="h-10 w-10 rounded-xl object-contain p-1 bg-white border border-white/10 shadow-glow-purple" />
            <div>
              <h2 className="text-lg font-gothic font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 uppercase leading-none">
                PIVOT
              </h2>
              <span className="text-[9px] text-studio-accent-purple font-extrabold uppercase tracking-wider block mt-1">HOD Dashboard</span>
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
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl transition duration-200 group text-left ${
                    isActive 
                      ? 'bg-studio-accent-purple/15 text-white border-l-2 border-studio-accent-purple' 
                      : 'text-slate-400 hover:text-white hover:bg-studio-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`h-5 w-5 transition duration-200 ${
                      isActive ? 'text-studio-accent-purple' : 'text-slate-500 group-hover:text-slate-300'
                    }`} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-normal leading-normal">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition duration-200 ${
                    isActive ? 'text-studio-accent-purple opacity-100' : 'opacity-0 group-hover:opacity-40 text-slate-400'
                  }`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - HOD Account & Logout */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {/* NAiL Logo - Above Version Text */}
          <div className="flex justify-start px-1">
            <img src={nailLogo} alt="Department of VFX & NAiL Logo" className="h-8 object-contain object-left -ml-5 drop-shadow-sm hover:scale-105 transition duration-300" />
          </div>

          {/* Update option just above HOD Admin section */}
          <div className="flex justify-between items-center text-[10px] text-slate-550 font-medium px-1">
            <span>Version: {appVersion}</span>
            <button
              onClick={handleCheckUpdates}
              disabled={isUpdating}
              className="text-studio-accent-purple hover:text-white transition flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              {isUpdating ? 'Checking Updates...' : 'Check for Updates'}
            </button>
          </div>

          <div className="flex items-center gap-3 bg-studio-950/60 p-3 rounded-xl border border-white/5">
            <div className="h-9 w-9 rounded-lg bg-studio-800 border border-white/10 flex items-center justify-center text-studio-accent-purple shadow-inner">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'HOD Admin'}</p>
              <p className="text-[10px] font-semibold text-studio-accent-purple uppercase tracking-wider">{user?.role || 'Administrator'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 bg-studio-950/30 hover:bg-rose-500/5 transition duration-200 text-xs font-semibold"
          >
            <LogOut className="h-4 w-4" />
            Exit Dashboard
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden z-10">
        
        {/* Top Header */}
        <header className="h-20 bg-studio-900/40 border-b border-white/5 flex justify-between items-center px-8 shrink-0 backdrop-blur-md">
          {/* Active Tab Info */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight capitalize">
              {navItems.find(n => n.id === activeTab)?.label || activeTab}
            </h2>
            <p className="text-xs text-slate-500">
              {navItems.find(n => n.id === activeTab)?.desc || 'Configurator'}
            </p>
          </div>

          {/* Right Header: Clock, Database badge */}
          <div className="flex items-center gap-6">
            {/* Live Studio Clock */}
            <div className="flex items-center gap-2.5 px-4 py-2 bg-studio-900 border border-white/5 rounded-xl shadow-inner font-mono">
              <Clock className="h-4 w-4 text-studio-accent-purple" />
              <span className="text-sm font-bold text-white">{formattedTime}</span>
              <span className="text-[10px] text-slate-500 font-medium ml-1 shrink-0">{formattedDate}</span>
            </div>

            {/* DB Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              isMockMode 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <Database className="h-3.5 w-3.5" />
              {isMockMode ? 'MOCK DATA' : 'CLOUD STORAGE'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-studio-950 p-8">
          {children}
        </main>

      </div>

      {/* UPDATE MODALS */}
      {updateAvailable && (
        <div className="absolute inset-0 z-50 bg-studio-950/90 flex items-center justify-center p-6 pointer-events-auto">
          <div className="w-full max-w-sm glass-panel-glow border-studio-accent-purple/30 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in">
            <div className="h-12 w-12 rounded-full bg-studio-accent-purple/20 text-studio-accent-purple flex items-center justify-center border border-studio-accent-purple/30">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide uppercase">Update Available</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Version v{targetVersion} is available. Update now to avoid manual uninstall/reinstall processes.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setUpdateAvailable(false);
                  setIsUpdating(false);
                }}
                className="flex-1 py-2.5 bg-studio-800 hover:bg-studio-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition border border-white/5"
              >
                Later
              </button>
              <button
                onClick={startUpdateDownload}
                className="flex-1 py-2.5 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-glow-purple"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdating && !updateAvailable && updateStatus && (
        <div className="absolute inset-0 z-50 bg-studio-950/90 flex items-center justify-center p-6 pointer-events-auto">
          <div className="w-full max-w-sm glass-panel-glow border-studio-accent-purple/30 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in">
            <div className="h-12 w-12 rounded-full bg-studio-accent-purple/20 text-studio-accent-purple flex items-center justify-center border border-studio-accent-purple/30 animate-spin-slow">
              <RefreshCw className="h-6 w-6 text-studio-accent-purple animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">{updateStatus}</h3>
            {updateStatus.includes('Downloading') && (
              <div className="w-full space-y-2">
                <div className="w-full bg-studio-900 rounded-full h-2 overflow-hidden border border-white/5">
                  <div 
                    className="bg-studio-accent-purple h-full transition-all duration-300"
                    style={{ width: `${updateProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono font-bold">{updateProgress}%</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminLayout;
