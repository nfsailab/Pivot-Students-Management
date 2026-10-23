import React, { useState, useEffect, useRef } from 'react';
import nailLogo from '../nail-logo.png';
import pivotLogo from '../pivot-logo.png';
import packageJson from '../../package.json';
import { 
  subscribeCollection, 
  getCollection,
  subscribeDocument,
  getDocument,
  addDocument,
  updateDocument,
  isMockMode 
} from '../firebase';
import { trafficTracker } from '../utils/trafficTracker';
import { 
  Tv, 
  User, 
  Layers, 
  Sliders, 
  Activity, 
  Play, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  GraduationCap, 
  Film, 
  BookOpen, 
  Sparkles,
  Info,
  LogOut,
  X,
  MessageSquare,
  RefreshCw,
  Power,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';

// Default session timings if none configured in batch
const DEFAULT_SESSIONS = [
  { name: 'Session 1', timing: '09:30 AM - 10:25 AM' },
  { name: 'Session 2', timing: '10:25 AM - 11:20 AM' },
  { name: 'Session 3', timing: '11:35 AM - 12:30 PM' },
  { name: 'Session 4', timing: '01:15 PM - 02:10 PM' },
  { name: 'Session 5', timing: '02:10 PM - 03:05 PM' },
  { name: 'Session 6', timing: '03:05 PM - 04:15 PM' },
  { name: 'Session 7', timing: '04:15 PM - 06:15 PM' }
];

const calculateSessionDuration = (timing) => {
  if (!timing || typeof timing !== 'string') return 0;
  const parts = timing.split(/\s*[-–to]+\s*/i);
  if (parts.length !== 2) {
    const hrMatch = timing.match(/^(\d+(?:\.\d+)?)\s*(?:hr|hours?|h|mins?|m)?$/i);
    if (hrMatch) {
      let n = Number(hrMatch[1]);
      if (/mins?|m/i.test(timing)) return Math.round(n);
      return Math.round(n * 60);
    }
    return 0;
  }
  
  const parseTime = (str) => {
    const m = str.trim().match(/^(\d+)(?::(\d+))?\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3] ? m[3].toUpperCase() : null;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };
  
  const s = parseTime(parts[0]);
  const e = parseTime(parts[1]);
  if (s !== null && e !== null) {
    let diff = e - s;
    if (diff < 0) diff += 24 * 60;
    return diff;
  }
  return 0;
};

const normalizeSessions = (sessions) => {
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) return DEFAULT_SESSIONS;
  return sessions.map((s, idx) => {
    if (typeof s === 'string') {
      return { name: `Session ${idx + 1}`, timing: s };
    }
    if (s && typeof s === 'object') {
      return {
        name: s.name || `Session ${idx + 1}`,
        timing: s.timing || s.time || ''
      };
    }
    return { name: `Session ${idx + 1}`, timing: '' };
  });
};

const calculateCombinedSessionsDuration = (sessionNames, availableSessions) => {
  if (!sessionNames) return 0;
  const namesArr = Array.isArray(sessionNames) ? sessionNames : [sessionNames];
  if (namesArr.length === 0) return 0;
  let totalMins = 0;
  const normAvailable = normalizeSessions(availableSessions);
  for (const name of namesArr) {
    if (!name) continue;
    const sObj = normAvailable.find(s => s && s.name && s.name.trim().toLowerCase() === String(name).trim().toLowerCase());
    if (sObj && sObj.timing) {
      totalMins += calculateSessionDuration(sObj.timing);
    }
  }
  return totalMins;
};

// Helper to extract session end time in minutes from midnight (0..1439)
const getTopicEndMinutesOfDay = (item, batchName, batchesList) => {
  if (!item) return null;

  let timingStr = '';
  if (typeof item === 'object' && item.timing) {
    timingStr = item.timing;
  }

  const currentBatch = (batchesList || []).find(
    b => (b.batchName || b.name || '').trim().toLowerCase() === String(batchName || '').trim().toLowerCase()
  );
  const rawSessions = (currentBatch?.sessionTimes && Array.isArray(currentBatch.sessionTimes) && currentBatch.sessionTimes.length > 0)
    ? currentBatch.sessionTimes
    : DEFAULT_SESSIONS;
  const availableSessions = normalizeSessions(rawSessions);

  if (typeof item === 'object' && (item.sessionNames || item.sessionName)) {
    const names = Array.isArray(item.sessionNames)
      ? item.sessionNames
      : String(item.sessionName).split(',').map(s => s.trim()).filter(Boolean);

    const matched = names
      .map(n => availableSessions.find(s => s && s.name && s.name.trim().toLowerCase() === String(n).trim().toLowerCase()))
      .filter(Boolean);

    if (matched.length > 0 && matched[matched.length - 1].timing) {
      timingStr = matched[matched.length - 1].timing;
    }
  }

  if (!timingStr || typeof timingStr !== 'string') return null;

  const parts = timingStr.split(/\s*[-–to]+\s*/i);
  if (parts.length < 2) return null;

  const endTimePart = parts[1].trim();
  const m = endTimePart.match(/^(\d+)(?::(\d+))?\s*(AM|PM)?$/i);
  if (!m) return null;

  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3] ? m[3].toUpperCase() : null;

  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  return h * 60 + min;
};

// Check if a topic's scheduled session time has passed today
const isTopicSessionExpired = (item, batchName, batchesList) => {
  const endMinutes = getTopicEndMinutesOfDay(item, batchName, batchesList);
  if (endMinutes === null) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= endMinutes;
};

function StudentClient({ onSessionStateChange }) {
  // Database configuration states
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [modes, setModes] = useState([]);
  const [computers, setComputers] = useState([]);

  // Batch specific settings collections
  const [acadConfigsList, setAcadConfigsList] = useState([]);
  const [prodConfigsList, setProdConfigsList] = useState([]);
  const [resConfigsList, setResConfigsList] = useState([]);
  const [genaiConfigsList, setGenaiConfigsList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [workstationsList, setWorkstationsList] = useState([]);

  // Workstation Identifier
  const defaultPc = import.meta.env.VITE_PC_ID || '';
  const [selectedPC, setSelectedPC] = useState(() => {
    return defaultPc || localStorage.getItem('vfx_selected_pc') || 'VFX-01';
  });

  useEffect(() => {
    if (selectedPC) {
      try {
        localStorage.setItem('vfx_selected_pc', selectedPC);
      } catch (e) {}
    }
  }, [selectedPC]);

  // Form Inputs
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMode, setSelectedMode] = useState('Academic');
  const [todayWork, setTodayWork] = useState('');
  const [selectedTopicObj, setSelectedTopicObj] = useState(null);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
  const [loginClockTick, setLoginClockTick] = useState(Date.now());

  // Session State
  const [activeSession, setActiveSession] = useState(() => {
    try {
      const saved = localStorage.getItem('vfx_active_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.computerId && parsed.studentName) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [adminResetNotice, setAdminResetNotice] = useState(false);
  const [concurrencyError, setConcurrencyError] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    setSelectedTopicObj(null);
    setSelectedTopicIndex(null);
  }, [selectedMode, selectedBatch]);

  // Periodic ticker for login screen (every 15s) to update session expiry in real-time
  useEffect(() => {
    if (activeSession) return;
    const interval = setInterval(() => {
      setLoginClockTick(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Automatically deselect if active selection has expired while sitting on the login screen
  useEffect(() => {
    if (selectedTopicObj && isTopicSessionExpired(selectedTopicObj, selectedBatch, batches)) {
      setSelectedTopicObj(null);
      setSelectedTopicIndex(null);
    }
  }, [loginClockTick, selectedTopicObj, selectedBatch, batches]);

  // Messaging & UI States
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastMsgId, setLastMsgId] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [hasReadActiveMessage, setHasReadActiveMessage] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [confirmMainShutdown, setConfirmMainShutdown] = useState(false);
  const [showPowerDropdown, setShowPowerDropdown] = useState(false);
  const [powerActionType, setPowerActionType] = useState('shutdown'); // 'shutdown' | 'restart'
  const [messagesList, setMessagesList] = useState([]);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // IPC listener for Help / About Pivot
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.onShowAboutPivot === 'function') {
      const unsub = window.electronAPI.onShowAboutPivot(() => {
        setShowAboutModal(true);
      });
      return () => unsub();
    }
  }, []);

  const handleRefreshClient = () => {
    setIsReloading(true);
    setTimeout(() => {
      if (window.electronAPI && typeof window.electronAPI.reloadWindow === 'function') {
        window.electronAPI.reloadWindow();
      } else if (window.location && typeof window.location.reload === 'function') {
        window.location.reload();
      }
    }, 150);
  };

  // Helper for semver version comparison
  const isNewerVersion = (latest, current) => {
    if (!latest || !current) return false;
    const clean = (v) => String(v).replace(/^v/i, '').split('-')[0];
    const lParts = clean(latest).split('.').map(Number);
    const cParts = clean(current).split('.').map(Number);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  };

  // Client Update States
  const [appVersion, setAppVersion] = useState(() => packageJson.version);
  const [targetVersion, setTargetVersion] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  const [downloadUrl, setDownloadUrl] = useState('');

  // Fetch local version from Electron on mount
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getVersion === 'function') {
      window.electronAPI.getVersion()
        .then(ver => {
          if (ver) {
            setAppVersion(ver);
          }
        })
        .catch(err => console.error('Failed to get app version:', err));
    }
  }, []);

  // Listen to Electron OTA GitHub auto-updater events
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubStatus = typeof window.electronAPI.onUpdateStatus === 'function'
      ? window.electronAPI.onUpdateStatus((data) => {
          setIsUpdating(true);
          setUpdateStatus(data.text || 'Checking for updates...');
        })
      : null;

    const unsubAvail = typeof window.electronAPI.onUpdateAvailable === 'function'
      ? window.electronAPI.onUpdateAvailable((info) => {
          setIsUpdating(false);
          setUpdateStatus('');
          if (info && info.version) setTargetVersion(info.version);
          if (info && info.downloadUrl) setDownloadUrl(info.downloadUrl);
          setUpdateAvailable(true);
        })
      : null;

    const unsubNotAvail = typeof window.electronAPI.onUpdateNotAvailable === 'function'
      ? window.electronAPI.onUpdateNotAvailable((info) => {
          setIsUpdating(false);
          setUpdateStatus('');
          setUpdateAvailable(false);
          alert(`You are up to date! Currently running version ${info?.version || appVersion}.`);
        })
      : null;

    const unsubProgress = typeof window.electronAPI.onUpdateProgress === 'function'
      ? window.electronAPI.onUpdateProgress((progressObj) => {
          setIsUpdating(true);
          const percent = Math.round(progressObj.percent || 0);
          setUpdateProgress(percent);
          setUpdateStatus(`DOWNLOADING... ${percent}%`);
        })
      : null;

    const unsubDownloaded = typeof window.electronAPI.onUpdateDownloaded === 'function'
      ? window.electronAPI.onUpdateDownloaded((info) => {
          setIsUpdating(false);
          setUpdateStatus('');
          setUpdateAvailable(false);
          setUpdateDownloaded(true);
          if (info && info.version) setTargetVersion(info.version);
        })
      : null;

    const unsubError = typeof window.electronAPI.onUpdateError === 'function'
      ? window.electronAPI.onUpdateError((err) => {
          setIsUpdating(false);
          setUpdateStatus('');
          alert(`Update notice: ${err?.message || 'Error checking for updates.'}`);
        })
      : null;

    return () => {
      if (unsubStatus) unsubStatus();
      if (unsubAvail) unsubAvail();
      if (unsubNotAvail) unsubNotAvail();
      if (unsubProgress) unsubProgress();
      if (unsubDownloaded) unsubDownloaded();
      if (unsubError) unsubError();
    };
  }, [appVersion]);

  // Listen to Firestore version updates (fallback for browser / non-packaged mode)
  useEffect(() => {
    if (window.electronAPI) return;
    const unsubscribe = subscribeCollection('app_versions', (versions) => {
      const studentConfig = versions.find(v => v.id === 'student');
      if (studentConfig && studentConfig.version) {
        setTargetVersion(studentConfig.version);
        if (studentConfig.downloadUrl) setDownloadUrl(studentConfig.downloadUrl);
        if (isNewerVersion(studentConfig.version, appVersion)) {
          setUpdateAvailable(true);
        }
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [appVersion]);

  // Local Alerts & Timing States
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [localAlert, setLocalAlert] = useState(null);
  const [syncIntervalMs, setSyncIntervalMs] = useState(15000); // Default 15s to guarantee watchdog headroom
  const [autoThrottle, setAutoThrottle] = useState(true);

  useEffect(() => {
    let unsubTraffic = null;
    try {
      unsubTraffic = subscribeDocument('system_settings', 'traffic_control', (data) => {
        if (data) {
          if (data.syncIntervalMs) setSyncIntervalMs(data.syncIntervalMs);
          if (data.autoThrottle !== undefined) setAutoThrottle(data.autoThrottle);
        }
      });
    } catch (e) {
      console.error('Failed to subscribe traffic control:', e);
    }
    return () => unsubTraffic && unsubTraffic();
  }, []);

  // Ref to track online count without triggering re-renders in heartbeat useEffect
  const onlineCountRef = useRef(0);
  useEffect(() => {
    onlineCountRef.current = (computers || []).filter(c => c.status === 'online').length;
  }, [computers]);

  const [alertTriggered, setAlertTriggered] = useState({
    hour: false,
    mins30: false,
    mins15: false,
    min1: false,
    over: false
  });

  // Refs for tracking mutable session data inside callbacks
  const sessionRef = useRef(null);
  sessionRef.current = activeSession;
  const isLoggingOutRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const isRenderingRef = useRef(false);
  isRenderingRef.current = isRendering;

  // 0. Initial Active Session Recovery from localStorage (offline/reboot persistence)
  useEffect(() => {
    if (activeSession) {
      if (activeSession.computerId) setSelectedPC(activeSession.computerId);
      if (activeSession.studentName) setSelectedStudent(activeSession.studentName);
      if (activeSession.studentBatch) setSelectedBatch(activeSession.studentBatch);
      if (activeSession.mode) setSelectedMode(activeSession.mode);
      if (activeSession.taskDesc) setTodayWork(activeSession.taskDesc);

      if (window.electronAPI && typeof window.electronAPI.startSession === 'function') {
        window.electronAPI.startSession();
      }
      // Re-assert online status in Firestore
      updateDocument('computers', activeSession.computerId, {
        status: 'online',
        currentUser: activeSession.studentName,
        currentBatch: activeSession.studentBatch,
        currentMode: activeSession.mode,
        currentTask: activeSession.taskDesc,
        startTime: activeSession.startTime || new Date().toISOString(),
        lastActive: new Date().toISOString(),
        lastLogoutStatus: null
      }).catch(err => console.warn('Deferred online assertion on restored session:', err));
    }
  }, []);

  // Offline Synchronization: Drain local queue of completed sessions & hours to Firestore
  const syncOfflineQueue = async () => {
    if (!navigator.onLine) return;
    let queue = [];
    try {
      const raw = localStorage.getItem('vfx_offline_queue');
      if (!raw) return;
      queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;
    } catch (e) {
      return;
    }

    console.log(`🔄 Syncing ${queue.length} offline log(s) to Firestore...`);
    const remaining = [];

    for (const item of queue) {
      try {
        // 1. Write completed session log to activity_logs
        await addDocument('activity_logs', item.logData);

        // 2. Update student cumulative hours
        if (item.studentName) {
          try {
            const studentDoc = (students || []).find(s => (s.name || '').toLowerCase() === item.studentName.toLowerCase())
              || await getDocument('students', item.studentId);
            if (studentDoc) {
              const newTotalSecs = (studentDoc.totalSeconds || 0) + (item.durationSecs || 0);
              const newTotalHours = Number((newTotalSecs / 3600).toFixed(2));
              await updateDocument('students', studentDoc.id, {
                totalSeconds: newTotalSecs,
                totalHours: newTotalHours,
                lastLogoutTime: item.logData.endTime || new Date().toISOString()
              });
            }
          } catch (sErr) {
            console.warn('Student cumulative hours sync deferred:', sErr);
          }
        }

        // 3. Update workstation status to offline if this was a normal logout
        if (!item.wasResetByAdmin && item.computerId) {
          try {
            await updateDocument('computers', item.computerId, {
              status: 'offline',
              lastLogoutStatus: item.logoutStatus || 'Normal Logout',
              currentUser: null,
              currentMode: null,
              currentTask: null,
              isRendering: false,
              startTime: null,
              lastActive: new Date().toISOString(),
              message: null
            });
          } catch (cErr) {
            console.warn('Workstation offline status sync deferred:', cErr);
          }
        }

        console.log(`✅ Synced offline session log for ${item.logData.studentId} (${item.logData.computerId})`);
      } catch (err) {
        console.error('Failed to sync offline item, keeping in queue:', err);
        remaining.push(item);
      }
    }

    try {
      localStorage.setItem('vfx_offline_queue', JSON.stringify(remaining));
    } catch (e) {}
  };

  // Network connection listeners & automatic synchronization loop
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      console.log('🌐 Internet connection restored. Syncing offline data and workstation status.');
      syncOfflineQueue();
      if (sessionRef.current && sessionRef.current.computerId) {
        const active = sessionRef.current;
        updateDocument('computers', active.computerId, {
          status: 'online',
          currentUser: active.studentName,
          currentBatch: active.studentBatch,
          currentMode: active.mode,
          currentTask: active.taskDesc,
          startTime: active.startTime,
          lastActive: new Date().toISOString(),
          lastLogoutStatus: null
        }).catch(err => console.error('Active session reconnect sync failed:', err));
      }
    };

    const handleOffline = () => {
      setIsOfflineMode(true);
      console.warn('⚠️ Network offline detected. Switching to local offline mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync on mount
    syncOfflineQueue();

    // Periodic sync attempt every 15 seconds if online
    const syncTimer = setInterval(() => {
      const onlineNow = navigator.onLine;
      setIsOfflineMode(!onlineNow);
      if (onlineNow) {
        syncOfflineQueue();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncTimer);
    };
  }, [students]);

  // 1. Database Subscriptions
  useEffect(() => {
    const unsubBatches = subscribeCollection('batches', (data) => {
      const list = (data || []).map(b => ({ ...b, batchName: b.batchName || b.name || b.id }));
      const sorted = [...list].sort((a, b) => (a.batchName || '').localeCompare(b.batchName || ''));
      setBatches(sorted);
      if (sorted.length > 0 && !selectedBatch) {
        setSelectedBatch(sorted[0].batchName);
      }
    });

    const unsubStudents = subscribeCollection('students', (data) => {
      setStudents(data || []);
    });

    const unsubModes = subscribeCollection('modes', (data) => {
      const list = (data || []).map(m => ({ ...m, modeName: m.modeName || m.name || m.id }));
      setModes(list);
    });

    const unsubAcad = subscribeCollection('settings_academic', (data) => {
      setAcadConfigsList(data);
    });

    const unsubProd = subscribeCollection('settings_production', (data) => {
      setProdConfigsList(data);
    });

    const unsubRes = subscribeCollection('settings_research', (data) => {
      setResConfigsList(data || []);
    });

    const unsubGenai = subscribeCollection('settings_genai', (data) => {
      setGenaiConfigsList(data);
    });

    // Fetch workstations once on startup without continuous lab-wide heartbeat listener
    const loadWorkstations = async () => {
      try {
        const cached = localStorage.getItem('vfx_workstations_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWorkstationsList(parsed);
          }
        }
        const data = await getCollection('computers');
        if (Array.isArray(data) && data.length > 0) {
          const map = new Map();
          data.forEach(w => {
            const displayName = (w.name || w.id || '').trim();
            if (!displayName) return;
            if (map.has(displayName)) {
              const existing = map.get(displayName);
              map.set(displayName, { ...w, ...existing, name: displayName });
            } else {
              map.set(displayName, { ...w, name: displayName });
            }
          });
          const sorted = Array.from(map.values()).sort((a, b) => 
            (a.name || '').localeCompare(b.name || '', undefined, { numeric: true })
          );
          setWorkstationsList(sorted);
          try {
            localStorage.setItem('vfx_workstations_cache', JSON.stringify(sorted));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error loading workstations:', err);
      }
    };
    loadWorkstations();

    return () => {
      unsubBatches();
      unsubStudents();
      unsubModes();
      unsubAcad();
      unsubProd();
      unsubRes();
      unsubGenai();
    };
  }, []);

  // Listen to the selected/active computer document in real-time (reduces reads by 96%)
  const activePcId = activeSession ? activeSession.computerId : selectedPC;
  useEffect(() => {
    let unsubComp = null;
    if (activePcId) {
      unsubComp = subscribeDocument('computers', activePcId, (docData) => {
        setComputers(docData ? [docData] : []);
      });
    }
    return () => unsubComp && unsubComp();
  }, [activePcId]);

  // 2. Cascade Filter: Student list filters automatically based on selected Batch
  const filteredStudents = students.filter(s => s.batch === selectedBatch);

  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudent(filteredStudents[0].name);
    } else {
      setSelectedStudent('');
    }
    setConcurrencyError('');
  }, [selectedBatch, students]);

  useEffect(() => {
    setConcurrencyError('');
  }, [selectedStudent]);

  // Notify parent layout of active session state changes (transparent overlay coordination)
  useEffect(() => {
    if (onSessionStateChange) {
      onSessionStateChange(!!activeSession);
    }
  }, [activeSession, onSessionStateChange]);

  // 3. Ticking Active Session Timer
  useEffect(() => {
    let timerInterval = null;
    if (activeSession) {
      timerInterval = setInterval(() => {
        if (activeSession.startTime) {
          const start = new Date(activeSession.startTime).getTime();
          if (!isNaN(start)) {
            setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
          } else {
            setElapsedSeconds(prev => prev + 1);
          }
        } else {
          setElapsedSeconds(prev => prev + 1);
        }

        // Check countdown alerts if end time is available
        if (sessionEndTime) {
          const remainingSecs = Math.max(0, Math.floor((sessionEndTime.getTime() - Date.now()) / 1000));
          
          if (remainingSecs <= 3600 && remainingSecs > 1800 && !alertTriggered.hour) {
            setAlertTriggered(prev => ({ ...prev, hour: true }));
            if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
              window.electronAPI.showNotification({
                title: "1 Hour Remaining",
                text: "You have 1 hour remaining in this laboratory session.",
                timestamp: Date.now()
              });
            } else {
              setLocalAlert({
                title: "1 Hour Remaining",
                message: "You have 1 hour remaining in this laboratory session.",
                forceLogout: false
              });
            }
          } else if (remainingSecs <= 1800 && remainingSecs > 900 && !alertTriggered.mins30) {
            setAlertTriggered(prev => ({ ...prev, mins30: true }));
            if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
              window.electronAPI.showNotification({
                title: "30 Minutes Remaining",
                text: "You have 30 minutes remaining in this laboratory session.",
                timestamp: Date.now()
              });
            } else {
              setLocalAlert({
                title: "30 Minutes Remaining",
                message: "You have 30 minutes remaining in this laboratory session.",
                forceLogout: false
              });
            }
          } else if (remainingSecs <= 900 && remainingSecs > 60 && !alertTriggered.mins15) {
            setAlertTriggered(prev => ({ ...prev, mins15: true }));
            if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
              window.electronAPI.showNotification({
                title: "15 Minutes Remaining",
                text: "You have 15 minutes remaining in this laboratory session. Please save your work.",
                timestamp: Date.now()
              });
            } else {
              setLocalAlert({
                title: "15 Minutes Remaining",
                message: "You have 15 minutes remaining in this laboratory session. Please save your work.",
                forceLogout: false
              });
            }
          } else if (remainingSecs <= 60 && remainingSecs > 0 && !alertTriggered.min1) {
            setAlertTriggered(prev => ({ ...prev, min1: true }));
            if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
              window.electronAPI.showNotification({
                title: "1 Minute Remaining",
                text: "Final 1 minute! Please wrap up your tasks immediately.",
                timestamp: Date.now()
              });
            } else {
              setLocalAlert({
                title: "1 Minute Remaining",
                message: "Final 1 minute! Please wrap up your tasks immediately.",
                forceLogout: false
              });
            }
          } else if (remainingSecs === 0 && !alertTriggered.over) {
            setAlertTriggered(prev => ({ ...prev, over: true }));
            if (window.electronAPI && typeof window.electronAPI.timeOver === 'function') {
              window.electronAPI.timeOver();
            }
            setLocalAlert({
              title: "Time Over",
              message: "The time is over , Meet Faculty",
              forceLogout: true
            });
          }
        }
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [activeSession, sessionEndTime, alertTriggered]);

  // Dynamic Heartbeat loop: updating lastActive dynamically based on HOD Traffic Normalizer mode
  useEffect(() => {
    let heartbeatInterval = null;
    if (activeSession && activeSession.computerId) {
      const startTimeToSync = activeSession.startTime || new Date().toISOString();

      const sendHeartbeat = () => {
        updateDocument('computers', activeSession.computerId, {
          status: 'online',
          currentUser: activeSession.studentName,
          currentBatch: activeSession.studentBatch,
          currentMode: activeSession.mode,
          currentTask: activeSession.taskDesc,
          startTime: startTimeToSync,
          lastActive: new Date().toISOString(),
          lastLogoutStatus: null,
          clientReads: trafficTracker.dailyReads,
          clientWrites: trafficTracker.dailyWrites
        })
        .then(() => {
          setIsOfflineMode(false);
        })
        .catch(err => {
          console.warn('Heartbeat deferred (offline):', err);
          setIsOfflineMode(true);
        });
      };

      sendHeartbeat();

      // Respect HOD Dynamic Sync Control (Eco 30s, Std 15s, Exam 5s), clamped safely between 10s and 60s
      const effectiveInterval = Math.max(10000, Math.min(syncIntervalMs || 30000, 60000));

      heartbeatInterval = setInterval(sendHeartbeat, effectiveInterval);
    }
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [activeSession, syncIntervalMs]);

  // 4. Remote Logout Listener (HOD Override Reset)
  useEffect(() => {
    if (!activeSession) return;

    // 5-second login grace period to prevent stale pre-login snapshots from triggering immediate logout
    if (activeSession.startTime) {
      const sessionAgeMs = Date.now() - new Date(activeSession.startTime).getTime();
      if (!isNaN(sessionAgeMs) && sessionAgeMs >= 0 && sessionAgeMs < 5000) {
        return;
      }
    }

    // Listen to computers. If our current PC status changes to offline remotely, check reason.
    const currentPcStatus = computers.find(c => c.id === activeSession.computerId);
    if (currentPcStatus && currentPcStatus.status === 'offline' && currentPcStatus.currentUser === null) {
      // ONLY log out if the HOD deliberately performed an administrative reset ("Reset by HOD")
      // AND that reset occurred after our current session started
      const resetTimeMs = currentPcStatus.lastActive ? new Date(currentPcStatus.lastActive).getTime() : 0;
      const sessionStartMs = activeSession.startTime ? new Date(activeSession.startTime).getTime() : 0;
      if (currentPcStatus.lastLogoutStatus === 'Reset by HOD' && resetTimeMs > sessionStartMs) {
        handleLogout(true);
        return;
      }

      // If marked offline by watchdog timeout, network flicker, or stale cache while client is alive, re-assert online state
      updateDocument('computers', activeSession.computerId, {
        status: 'online',
        currentUser: activeSession.studentName,
        currentBatch: activeSession.studentBatch,
        currentMode: activeSession.mode,
        currentTask: activeSession.taskDesc,
        startTime: activeSession.startTime,
        lastActive: new Date().toISOString(),
        lastLogoutStatus: null
      }).catch(err => console.error('Failed to re-assert online status:', err));
    }
  }, [computers, activeSession]);

  // 5. Workstation Messages Alert Listener
  useEffect(() => {
    if (!activeSession || !computers.length) return;

    const myPCData = computers.find(c => c.id === activeSession.computerId);
    if (myPCData && myPCData.message) {
      if (myPCData.message.id !== lastMsgId) {
        setLastMsgId(myPCData.message.id);
        setActiveMessage(myPCData.message);
        setHasReadActiveMessage(false); // Reset to false for new incoming message
        setMessagesList(prev => {
          if (prev.some(m => m.id === myPCData.message.id)) return prev;
          return [...prev, myPCData.message];
        });
        if (window.electronAPI && typeof window.electronAPI.showNotification === 'function') {
          window.electronAPI.showNotification(myPCData.message);
        }
      }
    } else {
      setActiveMessage(null);
    }
  }, [computers, activeSession, lastMsgId]);

  // IPC listener to restore panel and view message when notification is clicked
  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.onFocusMessage === 'function') {
      const cleanup = window.electronAPI.onFocusMessage(() => {
        setIsMinimized(false);
        setShowMessagesModal(true); // Open messages modal automatically
        setHasReadActiveMessage(true); // Stop vibration movement
      });
      return () => {
        cleanup();
      };
    }
  }, []);

  // IPC listeners for shutdown attempt, auto-logout, and emergency exit
  useEffect(() => {
    if (window.electronAPI) {
      let cleanupShutdown = () => {};
      let cleanupAutoLogout = () => {};
      let cleanupEmergencyExit = () => {};

      if (typeof window.electronAPI.onShutdownAttempt === 'function') {
        cleanupShutdown = window.electronAPI.onShutdownAttempt(() => {
          if (sessionRef.current) {
            setShowShutdownModal(true);
          } else if (typeof window.electronAPI.proceedShutdown === 'function') {
            window.electronAPI.proceedShutdown();
          }
        });
      }

      if (typeof window.electronAPI.onPerformAutoLogout === 'function') {
        cleanupAutoLogout = window.electronAPI.onPerformAutoLogout(() => {
          if (isRenderingRef.current) {
            console.log('Auto-logout triggered by main process, but RENDERING MODE is ON. Suppressing logout.');
            return;
          }
          console.log('Workstation idle >= 15 mins detected by main process. Logging out automatically.');
          handleLogout(false, 'Auto Logout (Idle 15 Mins)');
        });
      }

      if (typeof window.electronAPI.onEmergencyExitCleanup === 'function') {
        cleanupEmergencyExit = window.electronAPI.onEmergencyExitCleanup(async () => {
          try {
            if (sessionRef.current) {
              await handleLogout(false, 'Emergency Exit (Secret Shortcut)');
            }
          } catch (e) {
            console.error('Error during emergency exit cleanup:', e);
          } finally {
            if (typeof window.electronAPI.quitApp === 'function') {
              window.electronAPI.quitApp();
            }
          }
        });
      }

      return () => {
        cleanupShutdown();
        cleanupAutoLogout();
        cleanupEmergencyExit();
      };
    }
  }, []);

  // Secret emergency shortcut listener (Ctrl + Alt + Shift + Q) in window/DOM
  useEffect(() => {
    const handleEmergencyKeyDown = async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (sessionRef.current) {
            await handleLogout(false, 'Emergency Exit (Secret Shortcut)');
          }
        } catch (err) {
          console.error('Error logging out during emergency exit:', err);
        } finally {
          if (window.electronAPI && typeof window.electronAPI.quitApp === 'function') {
            window.electronAPI.quitApp();
          } else {
            console.log('⚡ Emergency exit triggered via Ctrl+Alt+Shift+Q');
          }
        }
      }
    };

    window.addEventListener('keydown', handleEmergencyKeyDown, true);
    return () => window.removeEventListener('keydown', handleEmergencyKeyDown, true);
  }, []);

  // Track local DOM activity as fallback for non-Electron / web environments
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  // 15-Minute Workstation Idle Auto-Logout Check
  useEffect(() => {
    if (!activeSession) return;
    lastActivityRef.current = Date.now();

    const idleCheckInterval = setInterval(async () => {
      let idleSeconds = 0;
      if (window.electronAPI && typeof window.electronAPI.getSystemIdleTime === 'function') {
        try {
          idleSeconds = await window.electronAPI.getSystemIdleTime();
        } catch (err) {
          idleSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        }
      } else {
        idleSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      }

      // 15 Minutes = 900 seconds
      if (idleSeconds >= 900) {
        if (isRenderingRef.current) {
          console.log(`Workstation idle for ${idleSeconds}s, but RENDERING MODE is ON. Suppressing auto-logout.`);
          return;
        }
        console.log(`Workstation idle for ${idleSeconds}s (>= 15 mins). Logging out automatically.`);
        handleLogout(false, 'Auto Logout (Idle 15 Mins)');
      }
    }, 10000);

    return () => clearInterval(idleCheckInterval);
  }, [activeSession]);

  // Helper calculation: exact duration across all topics added by HOD
  const getTopicsTotalAllocatedHours = (topics) => {
    if (!topics || !Array.isArray(topics) || topics.length === 0) return 0;
    let totalSecs = 0;
    for (const t of topics) {
      if (!t || typeof t === 'string') continue;
      if (t.allottedHours || t.hours || t.durationHours || t.allocatedHours || t.duration) {
        const val = Number(t.allottedHours ?? t.hours ?? t.durationHours ?? t.allocatedHours ?? t.duration);
        if (!isNaN(val) && val > 0) {
          totalSecs += val * 3600;
          continue;
        }
      }
      const timing = String(t.timing || '').trim();
      if (!timing) continue;

      const hrMatch = timing.match(/^(\d+(?:\.\d+)?)\s*(?:hr|hours?|h|mins?|m)?$/i);
      if (hrMatch) {
        let n = Number(hrMatch[1]);
        if (/mins?|m/i.test(timing)) n = n / 60;
        totalSecs += n * 3600;
        continue;
      }

      const parts = timing.split(/\s*[-–to]+\s*/i);
      if (parts.length === 2) {
        const parseTime = (str) => {
          const m = str.trim().match(/^(\d+)(?::(\d+))?\s*(AM|PM)?$/i);
          if (!m) return null;
          let h = parseInt(m[1], 10);
          const min = m[2] ? parseInt(m[2], 10) : 0;
          const ampm = m[3] ? m[3].toUpperCase() : null;
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          return h * 3600 + min * 60;
        };
        const s = parseTime(parts[0]);
        const e = parseTime(parts[1]);
        if (s !== null && e !== null) {
          let diff = e - s;
          if (diff < 0) diff += 24 * 3600;
          totalSecs += diff;
        }
      }
    }
    return Number((totalSecs / 3600).toFixed(2));
  };

  const getValidNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return (!isNaN(n) && n > 0) ? n : null;
  };

  // Find configuration specific to selected batch
  const effectiveBatchForConfig = activeSession?.studentBatch || selectedBatch;
  const activeAcad = acadConfigsList.find(c => c.id === effectiveBatchForConfig) || {
    topics: [],
    instructions: 'Follow batch instructions.',
    timeslot: 'N/A'
  };

  const activeProd = prodConfigsList.find(c => c.id === effectiveBatchForConfig) || {
    projects: [],
    instructions: 'Execute assigned production shots and tasks.'
  };

  const activeGenai = genaiConfigsList.find(c => c.id === effectiveBatchForConfig) || {
    projects: [],
    instructions: 'Execute independent GenAI workflows.'
  };

  const activeRes = resConfigsList.find(c => c.id === effectiveBatchForConfig) || resConfigsList.find(c => c.id === 'config') || {
    assignmentTopics: [],
    instructions: 'Follow faculty guidance.'
  };

  const getSessionEndTime = (topicObjParam, durMinsParam) => {
    let slotStr = '';
    const topic = topicObjParam || selectedTopicObj;
    if (topic && topic.timing) {
      slotStr = topic.timing;
    } else if (topic && (topic.sessionNames || topic.sessionName)) {
      const names = Array.isArray(topic.sessionNames) ? topic.sessionNames : String(topic.sessionName).split(',').map(s => s.trim());
      const currentBatch = batches.find(b => (b.batchName || b.name || '').trim().toLowerCase() === String(selectedBatch || '').trim().toLowerCase());
      const sessions = normalizeSessions(currentBatch?.sessionTimes);
      const matched = names.map(n => sessions.find(s => s.name === n)).filter(Boolean);
      if (matched.length > 0 && matched[matched.length - 1].timing) {
        slotStr = matched[matched.length - 1].timing;
      }
    } else if (selectedMode.toLowerCase() === 'academic') {
      slotStr = activeAcad.timeslot;
    } else if (selectedMode.toLowerCase() === 'production') {
      const firstProj = activeProd.projects?.[0];
      slotStr = firstProj ? firstProj.timing : '02:00 PM - 06:00 PM';
    } else if (selectedMode.toLowerCase() === 'research') {
      const firstTopic = activeRes?.assignmentTopics?.[0];
      slotStr = firstTopic ? firstTopic.timing : '09:00 AM - 01:00 PM';
    } else if (selectedMode.toLowerCase() === 'nail, genai lab' || selectedMode.toLowerCase() === 'genai lab') {
      const firstProj = activeGenai.projects?.[0];
      slotStr = firstProj ? firstProj.timing : '09:00 AM - 01:00 PM';
    }

    if (slotStr && slotStr !== 'N/A') {
      try {
        const parts = slotStr.split(' - ');
        if (parts.length === 2) {
          const endTimePart = parts[1].trim();
          const match = endTimePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const ampm = match[3].toUpperCase();

            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            const target = new Date();
            target.setHours(hours, minutes, 0, 0);

            // If target is in the future today, use it
            if (target.getTime() > Date.now()) {
              return target;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing session end time:', e);
      }
    }

    // Fallback: countdown based on allotted duration from now
    const durationMinutes = durMinsParam || 55;
    return new Date(Date.now() + durationMinutes * 60 * 1000);
  };

  // ----------------------------------------------------
  // CLIENT SOFTWARE UPDATE ACTION
  // ----------------------------------------------------
  const handleCheckUpdates = () => {
    if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
      setIsUpdating(true);
      setUpdateStatus('Connecting to GitHub Releases...');
      window.electronAPI.checkForUpdates();
    } else {
      setIsUpdating(true);
      setUpdateStatus('Checking for updates...');
      setTimeout(() => {
        setIsUpdating(false);
        setUpdateStatus('');
        if (targetVersion && targetVersion !== appVersion) {
          setUpdateAvailable(true);
        } else {
          alert(`You are up to date! Currently running version ${appVersion}.`);
        }
      }, 800);
    }
  };

  const startUpdateDownload = () => {
    setUpdateAvailable(false);
    if (window.electronAPI && typeof window.electronAPI.startUpdateDownload === 'function') {
      setIsUpdating(true);
      setUpdateStatus('DOWNLOADING...');
      setUpdateProgress(0);
      window.electronAPI.startUpdateDownload();
    } else if (downloadUrl && !downloadUrl.includes('your_student_folder_id')) {
      window.open(downloadUrl, '_blank');
    } else {
      window.open('https://github.com/nfsailab/Pivot-Students-Management/releases/latest', '_blank');
    }
  };

  // ----------------------------------------------------
  // LOG IN / START SESSION ACTION (with Concurrency Lock)
  // ----------------------------------------------------
  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedStudent.trim()) {
      alert('Please select a student name before starting your session.');
      return;
    }
    if (!selectedPC || !selectedPC.trim()) {
      alert('Please select a workstation ID.');
      return;
    }
    if (!(todayWork || '').trim() && !selectedTopicObj) {
      alert("Please fill out Today's Work / Assignment Task or select a guideline/topic from the bulletin board on the right.");
      return;
    }

    // MANDATORY GUIDELINE SELECTION: Check if guidelines/topics exist and enforce selection
    let currentModeItems = [];
    const modeKey = (selectedMode || '').toLowerCase();
    if (modeKey === 'academic') currentModeItems = activeAcad?.topics || [];
    else if (modeKey === 'production') currentModeItems = activeProd?.projects || [];
    else if (modeKey === 'research') currentModeItems = activeRes?.assignmentTopics || [];
    else if (modeKey === 'genai lab' || modeKey === 'nail, genai lab') currentModeItems = activeGenai?.projects || [];

    const activeGuidelines = currentModeItems.filter(item => !isTopicSessionExpired(item, selectedBatch, batches));

    // Option B: If all registered sessions for this mode have concluded today, strictly prevent login
    if (currentModeItems.length > 0 && activeGuidelines.length === 0) {
      alert(`All scheduled sessions for ${selectedMode} have concluded for today. Please contact your instructor or HOD.`);
      return;
    }

    if (activeGuidelines.length > 0 && !selectedTopicObj) {
      alert(`You must select an active ${selectedMode} guideline/topic from the bulletin board on the right before logging in (even if you typed on Today's Work).`);
      return;
    }

    if (selectedTopicObj && isTopicSessionExpired(selectedTopicObj, selectedBatch, batches)) {
      alert("The scheduled time for this session is over. Please select an active session.");
      return;
    }

    if (isSubmittingSession) return;

    // PC OCCUPANCY CHECK: Only enforce when online (to allow offline local usage)
    if (navigator.onLine) {
      const occupiedPc = computers.find(c => {
        if (c.id !== selectedPC || c.status !== 'online') return false;
        // Must have an active current user to be considered occupied
        if (!c.currentUser || !c.currentUser.trim()) return false;

        // Self-healing check: If PC has been inactive for > 120s (stale lock from forced shutdown/power off)
        if (c.lastActive) {
          const lastActiveMs = new Date(c.lastActive).getTime();
          if (!isNaN(lastActiveMs)) {
            const elapsedSecs = (Date.now() - lastActiveMs) / 1000;
            if (elapsedSecs > 120) {
              console.warn(`Self-healing: Overriding stale shutdown lock on ${c.id} (inactive for ${Math.floor(elapsedSecs)}s).`);
              return false; // Treat as vacant
            }
          }
        }
        return true;
      });

      if (occupiedPc) {
        // Check if occupied by SAME student on SAME computer (e.g. re-click or re-login)
        const isSameStudent = (occupiedPc.currentUser || '').trim().toLowerCase() === selectedStudent.trim().toLowerCase();
        if (!isSameStudent) {
          const warningMsg = `Access Denied: Workstation ${selectedPC} is currently occupied by ${occupiedPc.currentUser}. Please select a vacant workstation or contact HOD.`;
          setConcurrencyError(warningMsg);
          alert(warningMsg);
          return;
        } else {
          console.log(`Same student (${selectedStudent}) re-initializing session on ${selectedPC}. Overriding lock.`);
        }
      }
    }

    setIsSubmittingSession(true);

    let topicObjToUse = selectedTopicObj;
    if (!topicObjToUse && currentModeItems.length > 0) {
      const taskText = (todayWork || '').trim().toLowerCase();
      const matched = currentModeItems.find(i => (typeof i === 'string' ? i : (i.name || '')).trim().toLowerCase() === taskText);
      topicObjToUse = matched || currentModeItems[0];
    }

    const topicName = topicObjToUse ? (typeof topicObjToUse === 'string' ? topicObjToUse : (topicObjToUse.name || '')) : '';
    const sessionTaskDesc = (todayWork || '').trim() || topicName || 'General Lab Work';
    const topicDurInfo = getTopicAllocatedDuration(topicObjToUse, selectedBatch);
    const topicSessionDisplay = resolveSessionDisplay(topicObjToUse, selectedBatch);
    const sessionNamesArr = topicObjToUse && Array.isArray(topicObjToUse.sessionNames) && topicObjToUse.sessionNames.length > 0
      ? topicObjToUse.sessionNames
      : (topicObjToUse?.sessionName ? String(topicObjToUse.sessionName).split(',').map(s => s.trim()).filter(Boolean) : [topicSessionDisplay]);

    const sessionData = {
      computerId: selectedPC,
      studentName: selectedStudent,
      studentBatch: selectedBatch,
      mode: selectedMode,
      taskDesc: sessionTaskDesc,
      topicName: topicName || sessionTaskDesc,
      sessionNames: sessionNamesArr,
      sessionName: topicSessionDisplay,
      timing: topicObjToUse?.timing || '',
      allottedMinutes: topicDurInfo.durationMins,
      allottedHours: topicDurInfo.hoursNum,
      allottedSecs: topicDurInfo.durationSecs,
      startTime: new Date().toISOString()
    };

    try {
      const onlinePayload = {
        status: 'online',
        currentUser: selectedStudent,
        currentBatch: selectedBatch,
        currentMode: selectedMode,
        currentTask: sessionTaskDesc,
        currentTopic: topicName || sessionTaskDesc,
        currentSession: topicSessionDisplay,
        currentSessionNames: sessionNamesArr,
        allottedMinutes: topicDurInfo.durationMins,
        allottedHours: topicDurInfo.hoursNum,
        allottedSecs: topicDurInfo.durationSecs,
        startTime: sessionData.startTime,
        lastActive: new Date().toISOString(),
        lastLogoutStatus: null,
        message: null
      };

      // Save active session locally immediately so reload/refresh/offline keeps it active
      try {
        localStorage.setItem('vfx_active_session', JSON.stringify(sessionData));
      } catch (e) {}

      // Optimistically update local computer state before activating session so stale offline state never triggers reset
      setComputers([{ id: selectedPC, ...onlinePayload }]);

      // Clear notices and enter locking screen
      setAdminResetNotice(false);
      setConcurrencyError('');
      
      // Calculate session end time and reset alerts
      const targetEndTime = getSessionEndTime(topicObjToUse, topicDurInfo.durationMins);
      setSessionEndTime(targetEndTime);
      setAlertTriggered({
        hour: false,
        mins30: false,
        mins15: false,
        min1: false,
        over: false
      });

      // Activate session immediately in state & Electron
      setActiveSession(sessionData);
      if (window.electronAPI && typeof window.electronAPI.startSession === 'function') {
        window.electronAPI.startSession();
      }

      // Update computer status in Firestore non-blockingly (resilient to offline)
      updateDocument('computers', selectedPC, onlinePayload)
        .then(() => {
          console.log('Workstation online status synced to Firestore');
        })
        .catch((err) => {
          console.warn('Network offline or update deferred during session start:', err);
        })
        .finally(() => {
          setIsSubmittingSession(false);
        });
    } catch (err) {
      console.error('Failed to log in workstation:', err);
      // Even if local error occurs, ensure session state is unlocked
      setIsSubmittingSession(false);
    }
  };

  // ----------------------------------------------------
  // TOGGLE RENDERING / DO NOT DISTURB MODE
  // ----------------------------------------------------
  const toggleRenderingMode = async () => {
    const nextState = !isRendering;
    setIsRendering(nextState);
    isRenderingRef.current = nextState;

    if (activeSession && activeSession.computerId) {
      try {
        await updateDocument('computers', activeSession.computerId, {
          isRendering: nextState,
          currentTask: nextState 
            ? `[🎬 RENDERING] ${activeSession.taskDesc}` 
            : activeSession.taskDesc
        });
      } catch (err) {
        console.error('Failed to update rendering mode:', err);
      }
    }
  };

  // Safety guard: guarantee minimized state is false if no active session
  useEffect(() => {
    if (!activeSession && isMinimized) {
      setIsMinimized(false);
      if (window.electronAPI && typeof window.electronAPI.endSession === 'function') {
        window.electronAPI.endSession();
      }
    }
  }, [activeSession, isMinimized]);

  // ----------------------------------------------------
  // LOG OUT / END SESSION ACTION
  // ----------------------------------------------------
  const handleLogout = async (wasResetByAdmin = false, logoutStatus = 'Normal Logout') => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    const session = sessionRef.current;
    if (!session) {
      isLoggingOutRef.current = false;
      return;
    }

    // Immediately restore window size and reset minimized state FIRST
    setIsMinimized(false);
    if (window.electronAPI && typeof window.electronAPI.endSession === 'function') {
      window.electronAPI.endSession();
    }

    // Immediately clear activeSession from localStorage & state so that no effects or double-triggers can see it as active
    try {
      localStorage.removeItem('vfx_active_session');
    } catch (e) {}

    setActiveSession(null);
    sessionRef.current = null;
    setIsRendering(false);
    isRenderingRef.current = false;

    try {
      // Calculate duration and total hours (no idle time calculated or deducted)
      const startMs = session.startTime ? new Date(session.startTime).getTime() : Date.now();
      const endMs = Date.now();
      const durationSecs = Math.max(0, Math.floor((endMs - startMs) / 1000));
      const totalHours = Number((durationSecs / 3600).toFixed(2));

      // 1. IMMEDIATELY update database PC document to 'offline' FIRST (and update local state optimistically)
      // so that new logins are never blocked by Firestore network latency
      if (!wasResetByAdmin) {
        setComputers(prev => prev.map(c => c.id === session.computerId ? {
          ...c,
          status: 'offline',
          currentUser: null,
          currentMode: null,
          currentTask: null,
          isRendering: false,
          startTime: null,
          lastActive: new Date().toISOString()
        } : c));

        updateDocument('computers', session.computerId, {
          status: 'offline',
          lastLogoutStatus: logoutStatus,
          currentUser: null,
          currentMode: null,
          currentTask: null,
          isRendering: false,
          startTime: null,
          lastActive: new Date().toISOString(),
          message: null
        }).catch(err => console.warn('Failed to update PC offline status immediately (will sync later):', err));
      }

      // 2. Prepare offline log queue item so data is NEVER lost regardless of connectivity
      const logData = {
        studentId: session.studentName,
        studentName: session.studentName,
        computerId: session.computerId,
        batch: session.studentBatch,
        mode: session.mode,
        taskDesc: session.taskDesc,
        topicName: session.topicName || session.taskDesc,
        sessionNames: session.sessionNames || [],
        sessionName: session.sessionName || (Array.isArray(session.sessionNames) ? session.sessionNames.join(', ') : ''),
        timing: session.timing || '',
        allottedMinutes: session.allottedMinutes || 0,
        allottedHours: session.allottedHours || 0,
        allottedSecs: session.allottedSecs || 0,
        startTime: session.startTime,
        endTime: new Date().toISOString(),
        status: logoutStatus,
        durationSecs: durationSecs,
        totalHours: totalHours
      };

      const studentDoc = (students || []).find(s => (s.name || '').toLowerCase() === (session.studentName || '').toLowerCase());

      const queueItem = {
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        logData,
        studentId: studentDoc ? studentDoc.id : null,
        studentName: session.studentName,
        durationSecs,
        computerId: session.computerId,
        wasResetByAdmin,
        logoutStatus,
        timestamp: Date.now()
      };

      // Add to offline queue in localStorage
      try {
        const existingQueue = JSON.parse(localStorage.getItem('vfx_offline_queue') || '[]');
        existingQueue.push(queueItem);
        localStorage.setItem('vfx_offline_queue', JSON.stringify(existingQueue));
      } catch (e) {
        console.error('Failed to save to offline queue:', e);
      }

      // 3. Attempt immediate sync to Firestore if online
      syncOfflineQueue();

      // 4. Reset local states
      setTodayWork('');
      if (batches.length > 0) {
        setSelectedBatch(batches[0].batchName || batches[0].name || batches[0].id);
      }
      setSelectedMode('Academic');
      setSelectedTopicObj(null);
      setSelectedTopicIndex(null);
      setLastMsgId(null);
      setActiveMessage(null);
      setHasReadActiveMessage(false);
      setShowNotification(false);
      setIsMinimized(false);
      setMessagesList([]);
      setShowMessagesModal(false);
      setShowShutdownModal(false);
      if (window.electronAPI && typeof window.electronAPI.endSession === 'function') {
        window.electronAPI.endSession();
      }
      if (wasResetByAdmin) {
        setAdminResetNotice(true);
      }
    } catch (err) {
      console.error('Failed to write logout session:', err);
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  const handleLogoutAndShutdown = async () => {
    await handleLogout(false, 'Shutdown Logout');
    if (window.electronAPI && typeof window.electronAPI.proceedShutdown === 'function') {
      window.electronAPI.proceedShutdown();
    }
  };

  const handleCancelShutdown = () => {
    setShowShutdownModal(false);
  };

  // Time formatter (HH:MM:SS)
  const formatTime = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Helper mode styling
  const getModeTheme = (modeName) => {
    switch((modeName || '').toLowerCase()) {
      case 'academic': return {
        border: 'border-studio-accent-blue/30',
        bg: 'bg-studio-accent-blue/5',
        text: 'text-studio-accent-blue',
        categoryText: 'text-studio-accent-blue',
        pillBorder: 'border-studio-accent-blue/40',
        pillBg: 'bg-studio-accent-blue/10',
        pillText: 'text-studio-accent-blue',
        selectedBg: 'bg-studio-accent-blue/20',
        selectedBorder: 'border-studio-accent-blue',
        selectedRing: 'ring-studio-accent-blue',
        badgeSelectedBg: 'bg-studio-accent-blue text-white',
        icon: <GraduationCap className="h-4 w-4" />
      };
      case 'production': return {
        border: 'border-studio-accent-purple/30',
        bg: 'bg-studio-accent-purple/5',
        text: 'text-studio-accent-purple',
        categoryText: 'text-studio-accent-purple',
        pillBorder: 'border-studio-accent-purple/40',
        pillBg: 'bg-studio-accent-purple/10',
        pillText: 'text-studio-accent-purple',
        selectedBg: 'bg-studio-accent-purple/20',
        selectedBorder: 'border-studio-accent-purple',
        selectedRing: 'ring-studio-accent-purple',
        badgeSelectedBg: 'bg-studio-accent-purple text-white',
        icon: <Film className="h-4 w-4" />
      };
      case 'research': return {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/5',
        text: 'text-emerald-400',
        categoryText: 'text-emerald-400',
        pillBorder: 'border-emerald-500/40',
        pillBg: 'bg-emerald-500/10',
        pillText: 'text-emerald-400',
        selectedBg: 'bg-emerald-500/20',
        selectedBorder: 'border-emerald-500',
        selectedRing: 'ring-emerald-500',
        badgeSelectedBg: 'bg-emerald-500 text-slate-950 font-black',
        icon: <BookOpen className="h-4 w-4" />
      };
      case 'genai lab':
      case 'nail, genai lab': return {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/5',
        text: 'text-amber-400',
        categoryText: 'text-amber-400',
        pillBorder: 'border-amber-500/40',
        pillBg: 'bg-amber-500/10',
        pillText: 'text-amber-400',
        selectedBg: 'bg-amber-500/20',
        selectedBorder: 'border-amber-500',
        selectedRing: 'ring-amber-500',
        badgeSelectedBg: 'bg-amber-500 text-slate-950 font-black',
        icon: <Sparkles className="h-4 w-4" />
      };
      default: return {
        border: 'border-slate-500/30',
        bg: 'bg-slate-500/5',
        text: 'text-slate-400',
        categoryText: 'text-slate-400',
        pillBorder: 'border-slate-500/40',
        pillBg: 'bg-slate-500/10',
        pillText: 'text-slate-400',
        selectedBg: 'bg-slate-500/20',
        selectedBorder: 'border-slate-500',
        selectedRing: 'ring-slate-500',
        badgeSelectedBg: 'bg-slate-500 text-white',
        icon: <Sparkles className="h-4 w-4" />
      };
    }
  };

  // Resolve session display text (handles multi-sessions, single session, or timing fallback)
  const resolveSessionDisplay = (item, batchName) => {
    if (!item) return 'Session 1';
    if (typeof item === 'string') return 'Session 1';
    if (Array.isArray(item.sessionNames) && item.sessionNames.length > 0) {
      return item.sessionNames.join(', ');
    }
    if (item.sessionName && typeof item.sessionName === 'string' && item.sessionName.trim()) {
      return item.sessionName.trim();
    }
    if (item.timing) {
      const currentBatch = batches.find(b => (b.batchName || b.name || '').trim().toLowerCase() === String(batchName || '').trim().toLowerCase());
      const matched = (currentBatch?.sessionTimes || []).find(s => s.timing === item.timing);
      if (matched?.name) return matched.name;
    }
    return 'Session 1';
  };

  // Calculate exact allocated duration for a topic based on sessions assigned by HOD
  const getTopicAllocatedDuration = (item, batchName) => {
    if (!item) return { durationMins: 55, durationSecs: 3300, hoursNum: 0.92, durationStr: '55 min' };
    
    const currentBatch = batches.find(b => (b.batchName || b.name || '').trim().toLowerCase() === String(batchName || '').trim().toLowerCase());
    const rawSessions = (currentBatch?.sessionTimes && Array.isArray(currentBatch.sessionTimes) && currentBatch.sessionTimes.length > 0)
      ? currentBatch.sessionTimes
      : DEFAULT_SESSIONS;
    const availableSessions = normalizeSessions(rawSessions);

    let totalMins = 0;

    if (typeof item === 'object') {
      if (Array.isArray(item.sessionNames) && item.sessionNames.length > 0) {
        totalMins = calculateCombinedSessionsDuration(item.sessionNames, availableSessions);
      } else if (item.sessionName && typeof item.sessionName === 'string' && item.sessionName.trim()) {
        const names = item.sessionName.split(',').map(s => s.trim()).filter(Boolean);
        totalMins = calculateCombinedSessionsDuration(names, availableSessions);
      }

      if (totalMins === 0 && item.timing) {
        totalMins = calculateSessionDuration(item.timing);
      }

      if (totalMins === 0 && (item.allottedHours || item.durationHours || item.hours)) {
        const val = Number(item.allottedHours ?? item.durationHours ?? item.hours);
        if (!isNaN(val) && val > 0) totalMins = Math.round(val * 60);
      }
    }

    if (totalMins === 0 && availableSessions.length > 0 && availableSessions[0].timing) {
      totalMins = calculateSessionDuration(availableSessions[0].timing) || 55;
    }
    if (totalMins === 0) totalMins = 55;

    const durationSecs = totalMins * 60;
    const hoursNum = Number((totalMins / 60).toFixed(2));
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const durationStr = hrs > 0 ? (mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`) : `${mins} min`;

    return { durationMins: totalMins, durationSecs, hoursNum, durationStr };
  };

  // Resolve category (e.g., SAX, Pre Production, Production, Observation Report, GenAI Project)
  const resolveCategory = (item, modeName) => {
    if (!item || typeof item === 'string') {
      switch ((modeName || '').toLowerCase()) {
        case 'academic': return 'SAX';
        case 'production': return 'PRODUCTION';
        case 'research': return 'RESEARCH';
        case 'genai lab':
        case 'nail, genai lab': return 'GENAI';
        default: return '';
      }
    }
    if (item.taskType && item.taskType.trim()) {
      const trimmed = item.taskType.trim();
      return trimmed === 'Analysis Report' ? 'General' : trimmed;
    }
    switch ((modeName || '').toLowerCase()) {
      case 'academic': return 'SAX';
      case 'production': return 'PRODUCTION';
      case 'research': return 'RESEARCH';
      case 'genai lab':
      case 'nail, genai lab': return 'GENAI';
      default: return '';
    }
  };

  // ----------------------------------------------------
  // RENDER DYNAMIC BULLETIN INFO
  // ----------------------------------------------------
  const renderBulletinBoard = () => {
    const theme = getModeTheme(selectedMode);
    const modeKey = (selectedMode || '').toLowerCase();

    let items = [];
    let sectionTitle = 'AVAILABLE LESSON TOPICS (SELECT ONE)';
    let emptyMessage = 'No topics registered.';
    let instructions = '';

    if (modeKey === 'academic') {
      items = activeAcad.topics || [];
      sectionTitle = 'AVAILABLE LESSON TOPICS (SELECT ONE)';
      emptyMessage = 'No topics registered for this batch.';
      instructions = activeAcad.instructions || 'Follow faculty guidance.';
    } else if (modeKey === 'production') {
      items = activeProd.projects || [];
      sectionTitle = 'AVAILABLE PRODUCTION PROJECTS (SELECT ONE)';
      emptyMessage = 'No projects registered for this batch.';
      instructions = activeProd.instructions || 'Execute assigned production shots and tasks.';
    } else if (modeKey === 'research') {
      items = activeRes?.assignmentTopics || [];
      sectionTitle = 'AVAILABLE RESEARCH TOPICS (SELECT ONE)';
      emptyMessage = 'No research topics registered for this batch.';
      instructions = (activeRes?.instructions && !activeRes.instructions.includes('Research current state-of-the-art') && !activeRes.instructions.includes('industry papers') && !activeRes.instructions.includes('Conduct thorough observations')) 
        ? activeRes.instructions 
        : 'Follow faculty guidance.';
    } else if (modeKey === 'genai lab' || modeKey === 'nail, genai lab') {
      items = activeGenai.projects || [];
      sectionTitle = 'AVAILABLE GENAI PROJECTS (SELECT ONE)';
      emptyMessage = 'No GenAI projects registered for this batch.';
      instructions = activeGenai.instructions || 'Execute independent GenAI workflows.';
    }

    return (
      <div className={`p-6 rounded-2xl border ${theme.border} ${theme.bg} space-y-4 h-full flex flex-col justify-between`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {theme.icon}
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
              {selectedMode} Guidelines
            </span>
          </div>

          <div className="space-y-3.5 text-xs text-slate-400">
            <div>
              <p className="font-bold text-white uppercase tracking-wide text-[10px]">
                {sectionTitle}
              </p>
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic py-2">{emptyMessage}</p>
                ) : (() => {
                  const allExpired = items.every(item => isTopicSessionExpired(item, selectedBatch, batches));
                  return (
                    <>
                      {allExpired && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-medium flex items-center gap-2 mb-2">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                          <span>All scheduled sessions for today have concluded.</span>
                        </div>
                      )}
                      {items.map((item, i) => {
                        const name = typeof item === 'string' ? item : (item.name || 'Unnamed Topic');
                        const sessionDisplay = resolveSessionDisplay(item, selectedBatch);
                        const topicDur = getTopicAllocatedDuration(item, selectedBatch);
                        const category = resolveCategory(item, selectedMode);
                        const isExpired = isTopicSessionExpired(item, selectedBatch, batches);
                        const isSelected = !isExpired && (selectedTopicIndex !== null
                          ? selectedTopicIndex === i
                          : Boolean(
                              selectedTopicObj && (
                                selectedTopicObj === item ||
                                (
                                  (typeof item === 'string' ? item : item.name) === (typeof selectedTopicObj === 'string' ? selectedTopicObj : selectedTopicObj.name) &&
                                  resolveSessionDisplay(selectedTopicObj, selectedBatch) === sessionDisplay &&
                                  (selectedTopicObj.timing || '') === (item.timing || '')
                                )
                              )
                            ));

                        return (
                          <button
                            type="button"
                            key={i}
                            disabled={isExpired}
                            onClick={() => {
                              if (isExpired) return;
                              if (isSelected) {
                                setSelectedTopicObj(null);
                                setSelectedTopicIndex(null);
                              } else {
                                setSelectedTopicObj(item);
                                setSelectedTopicIndex(i);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1.5 ${
                              isExpired
                                ? 'opacity-40 cursor-not-allowed bg-studio-950/40 border-white/5 text-slate-500'
                                : isSelected
                                ? `${theme.selectedBg} ${theme.selectedBorder} ring-1 ${theme.selectedRing} text-white shadow-lg`
                                : 'bg-studio-950/70 border-white/5 hover:border-white/20 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full gap-2">
                              <span className={`font-bold text-[11px] tracking-wide truncate ${isExpired ? 'text-slate-500' : 'text-white'}`}>{name}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 transition-colors ${
                                isExpired
                                  ? 'bg-rose-500/10 text-rose-400/80 border border-rose-500/20'
                                  : isSelected
                                  ? theme.badgeSelectedBg
                                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
                              }`}>
                                {isExpired ? 'Session Over' : isSelected ? `✓ Selected • ${topicDur.durationStr}` : `Select • ${topicDur.durationStr}`}
                              </span>
                            </div>
                            {(category || sessionDisplay) && (
                              <div className="flex items-center gap-2 text-[9px] font-mono mt-0.5 flex-wrap">
                                {category && (
                                  <span className={`${isExpired ? 'text-slate-600' : theme.categoryText} font-bold uppercase inline-flex items-center justify-center shrink-0`}>
                                    {category}
                                  </span>
                                )}
                                {sessionDisplay && (
                                  <span className={`px-2 py-0.5 rounded border ${isExpired ? 'border-white/5 bg-white/5 text-slate-600' : `${theme.pillBorder} ${theme.pillBg} ${theme.pillText}`} font-bold text-[8px] inline-flex items-center justify-center`}>
                                    {sessionDisplay} ({topicDur.durationStr})
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="pt-1">
              <p className="font-bold text-white uppercase tracking-wide text-[10px]">
                Instructions
              </p>
              <p className="mt-1 text-slate-300 text-xs leading-relaxed">
                {instructions || 'Follow faculty guidance.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[10px] text-slate-500 leading-snug border-t border-white/5 pt-4">
          <Info className="h-4 w-4 shrink-0 text-slate-600 mt-0.5" />
          <p>This workstation logs system telemetry. Please exit session and log out when leaving this computer node.</p>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // VIEW RENDER: LOCKED ACTIVE SESSION VIEW (SIMULATED DESKTOP + FLOATING TIMER OVERLAY)
  // ----------------------------------------------------
  if (activeSession) {
    const theme = getModeTheme(activeSession.mode);
    return (
      <div className="fixed inset-0 z-45 bg-transparent pointer-events-none overflow-hidden font-sans select-none">



        {isMinimized ? (
          /* COLLAPSED WIDGET STATE (fits the Electron widget window) */
          <div 
            onClick={() => {
              setIsMinimized(false);
              setHasReadActiveMessage(true);
              if (window.electronAPI && typeof window.electronAPI.maximizeWidget === 'function') {
                window.electronAPI.maximizeWidget();
              }
            }}
            className={`w-full h-full glass-panel px-3 py-1.5 rounded-full flex items-center justify-center gap-2.5 cursor-pointer transition duration-200 pointer-events-auto shadow-2xl ${
              activeMessage && !hasReadActiveMessage 
                ? 'animate-alert-attention border-amber-500/80 bg-amber-500/10 opacity-100' 
                : 'border-studio-accent-purple/30 hover:border-studio-accent-purple/60 opacity-80 hover:opacity-100'
            }`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {isOfflineMode ? (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              )}
            </span>
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider shrink-0">{activeSession.computerId}</span>
            {isOfflineMode && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[8px] font-extrabold text-amber-400 shrink-0">
                OFFLINE
              </span>
            )}
            {isRendering && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[8px] font-extrabold text-amber-300 animate-pulse shrink-0">
                🎬 RENDERING
              </span>
            )}
            <div className="h-3.5 w-[1px] bg-white/10 shrink-0"></div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white shrink-0">
              <Clock className="h-3.5 w-3.5 text-studio-accent-purple" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
          </div>
        ) : (
          /* EXPANDED DIALOGUE BOX STATE (fits the Electron widget window) */
          <div className="w-full h-full glass-panel border-studio-accent-purple/20 p-5 rounded-2xl flex flex-col justify-between overflow-hidden pointer-events-auto relative">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-studio-accent-purple to-transparent"></div>
 
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white bg-studio-900 border border-white/5 px-2.5 py-0.5 rounded-lg">
                  {activeSession.computerId}
                </span>
                {isOfflineMode ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[8px] font-extrabold text-amber-400 tracking-wider">
                    OFFLINE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-extrabold text-emerald-400 tracking-wider">
                    ONLINE
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setShowMessagesModal(true);
                    setHasReadActiveMessage(true);
                  }}
                  className="relative px-2.5 py-1 text-[10px] font-bold text-slate-450 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 transition flex items-center gap-1"
                  title="View HOD Messages"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                  Messages
                  {messagesList.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black font-extrabold text-[8px] h-4 w-4 rounded-full flex items-center justify-center border border-studio-950 animate-bounce">
                      {messagesList.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => {
                    setIsMinimized(true);
                    if (window.electronAPI && typeof window.electronAPI.minimizeWidget === 'function') {
                      window.electronAPI.minimizeWidget();
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-450 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 transition"
                  title="Minimize Widget"
                >
                  Minimize
                </button>
              </div>
            </div>

            {/* Content (Scrollable) */}
            <div className="overflow-y-auto space-y-4 flex-1 pr-1 text-xs">
              {/* Student details */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Active Workspace Student</span>
                <h4 className="font-bold text-white text-base leading-tight">{activeSession.studentName}</h4>
                <p className="text-[11px] text-slate-550 font-medium">
                  {activeSession.studentBatch} | <span className={`${theme.text} font-semibold`}>{activeSession.mode}</span>
                </p>
                {(activeSession.topicName || activeSession.sessionName) && (
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {activeSession.topicName && (
                      <span className="px-2 py-0.5 rounded bg-studio-950 border border-white/5 text-[9px] font-bold text-white">
                        Topic: {activeSession.topicName}
                      </span>
                    )}
                    {activeSession.sessionName && (
                      <span className={`px-2 py-0.5 rounded border ${theme.pillBorder} ${theme.pillBg} ${theme.pillText} font-bold text-[9px]`}>
                        {activeSession.sessionName} &bull; {formatTime(activeSession.allottedSecs || (activeSession.allottedMinutes ? activeSession.allottedMinutes * 60 : 3300))} Allotted
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Live Stopwatch Clock */}
              <div className="bg-studio-900/40 border border-white/5 p-4 rounded-2xl text-center space-y-3 shadow-inner">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                    <Clock className={`h-3.5 w-3.5 ${theme.text}`} />
                    Elapsed Work Time
                  </span>
                  <p className="text-3xl font-extrabold font-mono text-white tracking-widest">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>
                {sessionEndTime && (
                  <div className="border-t border-white/5 pt-2 space-y-0.5">
                    <span className="text-[8px] text-rose-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Time Remaining
                    </span>
                    <p className="text-xl font-extrabold font-mono text-rose-405 tracking-wider">
                      {formatTime(Math.max(0, Math.floor((sessionEndTime.getTime() - Date.now()) / 1000)))}
                    </p>
                  </div>
                )}
              </div>


              {/* Rendering Lock Toggle */}
              <div className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                isRendering 
                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/40 text-amber-300 shadow-glow-amber' 
                  : 'bg-studio-900/60 border-white/5 text-slate-400 hover:border-white/10'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isRendering ? 'bg-amber-500 text-black font-extrabold shadow-md' : 'bg-white/5 text-slate-500'}`}>
                    <Sparkles className={`h-4 w-4 ${isRendering ? 'animate-spin-slow' : ''}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${isRendering ? 'text-amber-300' : 'text-slate-200'}`}>
                      {isRendering ? '🎬 Rendering in Progress' : 'Standard Lab Session'}
                    </p>
                    <p className="text-[9px] text-slate-450 leading-tight">
                      {isRendering ? '15-min idle auto-logout is PAUSED' : 'Toggle ON when running long renders'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleRenderingMode}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-[9px] uppercase tracking-wider transition shrink-0 ${
                    isRendering
                      ? 'bg-amber-500 text-black shadow-lg hover:bg-amber-400'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {isRendering ? 'LOCK ON' : 'LOCK OFF'}
                </button>
              </div>

              {/* Task desc */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Today's Work Task</span>
                <div className="p-3 bg-studio-950 rounded-xl border border-white/5 text-[11px] text-slate-355 leading-relaxed font-mono max-h-24 overflow-y-auto">
                  "{activeSession.taskDesc}"
                </div>
              </div>

              {/* Admin alert display */}
              {activeMessage && (
                <div className={`p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1 ${
                  hasReadActiveMessage ? 'animate-pulse' : 'animate-alert-attention'
                }`}>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">HOD Alert Message</span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                    {activeMessage.text}
                  </p>
                  <span className="text-[8px] text-slate-555 block text-right font-mono">
                    {new Date(activeMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {/* Mode Guideline Bulletin Reference */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Guideline Bulletin</span>
                <div className="max-h-36 overflow-y-auto pr-1">
                  {(() => {
                    const modeKey = (activeSession.mode || '').toLowerCase();
                    let items = [];
                    let instructions = '';

                    if (modeKey === 'academic') {
                      items = activeAcad.topics || [];
                      instructions = activeAcad.instructions;
                    } else if (modeKey === 'production') {
                      items = activeProd.projects || [];
                      instructions = activeProd.instructions || 'Execute assigned production shots and tasks.';
                    } else if (modeKey === 'research') {
                      items = activeRes?.assignmentTopics || [];
                      instructions = (activeRes?.instructions && !activeRes.instructions.includes('Research current state-of-the-art') && !activeRes.instructions.includes('industry papers') && !activeRes.instructions.includes('Conduct thorough observations')) ? activeRes.instructions : '';
                    } else if (modeKey === 'genai lab' || modeKey === 'nail, genai lab') {
                      items = activeGenai.projects || [];
                      instructions = activeGenai.instructions || 'Execute independent GenAI workflows.';
                    }

                    return (
                      <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                        {instructions && <p className="mt-1 text-slate-300 text-xs">{instructions}</p>}
                        <div className="space-y-1.5 mt-1.5">
                          {items.length === 0 ? (
                            <span className="text-[10px] text-slate-500 italic">No topics registered.</span>
                          ) : (
                            items.map((item, idx) => {
                              const name = typeof item === 'string' ? item : (item.name || 'Unnamed Topic');
                              const sessionDisplay = resolveSessionDisplay(item, activeSession.studentBatch);
                              const topicDur = getTopicAllocatedDuration(item, activeSession.studentBatch);
                              const category = resolveCategory(item, activeSession.mode);

                              return (
                                <div key={idx} className="p-2 bg-studio-950/70 border border-white/5 rounded-lg flex flex-col gap-1">
                                  <span className="font-bold text-white text-[10px]">{name}</span>
                                  {(category || sessionDisplay) && (
                                    <div className="flex items-center gap-2 text-[8px] font-mono mt-0.5 flex-wrap">
                                      {category && (
                                        <span className={`${theme.categoryText} font-bold uppercase inline-flex items-center justify-center shrink-0`}>
                                          {category}
                                        </span>
                                      )}
                                      {sessionDisplay && (
                                        <span className={`px-1.5 py-0.5 rounded border ${theme.pillBorder} ${theme.pillBg} ${theme.pillText} font-bold text-[8px] inline-flex items-center justify-center`}>
                                          {sessionDisplay} ({topicDur.durationStr})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer Logout Action */}
            <div className="border-t border-white/5 pt-4 mt-4 shrink-0">
              <button
                onClick={() => handleLogout(false)}
                className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-gradient-to-r from-studio-accent-red to-red-700 hover:from-studio-accent-red/90 hover:to-red-700/90 text-white font-bold rounded-xl transition duration-200 shadow-md text-xs tracking-wider uppercase"
              >
                <LogOut className="h-4 w-4" />
                End Session & Logout
              </button>
            </div>

            {/* UPDATE MODALS FOR ACTIVE SESSION */}
            {updateAvailable && (
              <div className="absolute inset-0 z-50 rounded-2xl bg-studio-900/98 flex items-center justify-center p-4">
                <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4 animate-scale-in">
                  <div className="h-10 w-10 rounded-full bg-studio-accent-blue/20 text-studio-accent-blue flex items-center justify-center border border-studio-accent-blue/30">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">Update Available</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                    Version v{targetVersion} is available. Update now to avoid manual uninstall/reinstall processes.
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => {
                        setUpdateAvailable(false);
                        setIsUpdating(false);
                      }}
                      className="flex-1 py-1.5 bg-studio-800 hover:bg-studio-700 text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider transition border border-white/5"
                    >
                      Later
                    </button>
                    <button
                      onClick={startUpdateDownload}
                      className="flex-1 py-1.5 bg-studio-accent-blue hover:bg-studio-accent-blue/90 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition shadow-glow-blue"
                    >
                      Update Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isUpdating && !updateAvailable && updateStatus && (
              <div className="absolute inset-0 z-50 rounded-2xl bg-studio-900/98 flex items-center justify-center p-4">
                <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4 animate-scale-in">
                  <div className="h-10 w-10 rounded-full bg-studio-accent-purple/20 text-studio-accent-purple flex items-center justify-center border border-studio-accent-purple/30 animate-spin-slow">
                    <RefreshCw className="h-5 w-5 text-studio-accent-purple animate-spin" />
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">{updateStatus}</h3>
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

            {updateDownloaded && (
              <div className="absolute inset-0 z-50 rounded-2xl bg-studio-900/98 flex items-center justify-center p-4">
                <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4 animate-scale-in">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">Update Ready</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                    Version v{targetVersion} is downloaded and ready to install.
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setUpdateDownloaded(false)}
                      className="flex-1 py-1.5 bg-studio-800 hover:bg-studio-700 text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider transition border border-white/5"
                    >
                      Later
                    </button>
                    <button
                      onClick={() => {
                        if (window.electronAPI && typeof window.electronAPI.installUpdate === 'function') {
                          window.electronAPI.installUpdate();
                        }
                      }}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition shadow-glow-emerald"
                    >
                      Restart & Install
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* LOCAL TIMING ALERT MODAL */}
        {localAlert && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-studio-950/95 pointer-events-auto">
            <div className="w-full max-w-md glass-panel-glow border-studio-accent-purple/30 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg ${localAlert.forceLogout ? 'bg-rose-500/20 text-rose-450 border border-rose-500/30' : 'bg-studio-accent-purple/20 text-studio-accent-purple border border-studio-accent-purple/30'}`}>
                <AlertCircle className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase">{localAlert.title}</h3>
              <p className="text-xs text-slate-355 leading-relaxed font-mono whitespace-pre-line">
                {localAlert.message}
              </p>
              <button
                onClick={() => {
                  if (localAlert.forceLogout) {
                    handleLogout(false);
                  }
                  setLocalAlert(null);
                }}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${localAlert.forceLogout ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-glow-red' : 'bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white shadow-glow-purple'}`}
              >
                {localAlert.forceLogout ? 'End Session' : 'Acknowledge'}
              </button>
            </div>
          </div>
        )}

        {/* HOD MESSAGES HISTORY MODAL */}
        {showMessagesModal && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-studio-950/95 pointer-events-auto">
            <div className="w-full max-w-sm glass-panel-glow border-studio-accent-purple/30 p-5 rounded-2xl shadow-glass-glow flex flex-col space-y-4 animate-scale-in max-h-[80vh]">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2 text-white">
                  <MessageSquare className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">HOD Broadcast Messages</span>
                </div>
                <button 
                  onClick={() => setShowMessagesModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded transition hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs max-h-64">
                {messagesList.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-6 text-[11px]">No messages received during this session.</p>
                ) : (
                  [...messagesList].reverse().map((msg, index) => (
                    <div key={msg.id || index} className="p-3 bg-studio-900 border border-white/5 rounded-xl space-y-1">
                      <p className="text-[11px] text-slate-205 leading-relaxed font-medium font-sans">
                        {msg.text}
                      </p>
                      <span className="text-[9px] text-slate-555 block text-right font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowMessagesModal(false)}
                className="w-full py-2.5 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* WINDOWS SHUTDOWN INTERCEPTION MODAL */}
        {showShutdownModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-studio-950/95 backdrop-blur-md pointer-events-auto">
            <div className="w-full max-w-md glass-panel-glow border-studio-accent-red/40 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-5 animate-scale-in">
              <div className="h-14 w-14 rounded-full bg-studio-accent-red/20 text-studio-accent-red flex items-center justify-center border border-studio-accent-red/30 shadow-lg">
                <AlertTriangle className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white tracking-wide uppercase">System Shutdown Detected</h3>
                <p className="text-xs font-bold text-studio-accent-red">Active Student Session Running</p>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans px-2">
                Please logout from the Student Monitoring System before shutting down.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                <button
                  onClick={handleCancelShutdown}
                  className="flex-1 py-3 px-4 bg-studio-800 hover:bg-studio-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition border border-white/5"
                >
                  Cancel Shutdown
                </button>
                <button
                  onClick={handleLogoutAndShutdown}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-studio-accent-red to-red-700 hover:from-studio-accent-red/90 hover:to-red-700/90 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-glow-red flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout & Shutdown
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW RENDER: SETUP SESSION LOGIN FORM
  // ----------------------------------------------------
  return (
    <div 
      className="w-full max-w-4xl glass-panel-glow border-white/5 p-6 rounded-3xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative select-none"
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      
      {/* Reset Alarm Notice */}
      {adminResetNotice && (
        <div className="lg:col-span-12 flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs animate-shake">
          <AlertCircle className="h-5 w-5 shrink-0 animate-bounce" />
          <div>
            <p className="font-bold">Workstation Session Force Closed</p>
            <p className="text-[11px] text-rose-550 mt-0.5">Your workstation session was reset remotely by HOD Administrator. Session telemetry was logged.</p>
          </div>
        </div>
      )}

      {/* Concurrency Error Banner */}
      {concurrencyError && (
        <div className="lg:col-span-12 flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs animate-shake">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold">Session Lock Warning</p>
            <p className="text-[11px] text-rose-550 mt-0.5">{concurrencyError}</p>
          </div>
        </div>
      )}

      {/* Left Form (7 cols) */}
      <div className="lg:col-span-7 space-y-4 flex flex-col justify-between" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="space-y-4 font-sans">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-gothic font-extrabold text-studio-accent-blue tracking-widest uppercase">PIVOT</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider ${
                  isMockMode 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                    : isOfflineMode
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                }`}>
                  {isMockMode ? 'SIMULATION' : isOfflineMode ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Workstation Login</h3>
            </div>
            
            {/* Action Buttons: Refresh & Power */}
            <div className="flex items-center gap-2">
              {/* Refresh Client Button */}
              <button
                type="button"
                onClick={handleRefreshClient}
                disabled={isReloading}
                className="h-[30px] w-[30px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-slate-400 hover:text-studio-accent-blue transition active:scale-95 flex items-center justify-center shadow-sm disabled:opacity-50"
                title="Refresh Client"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? 'animate-spin text-studio-accent-blue' : ''}`} />
              </button>

              {/* Power Control Split Button & Dropdown */}
              <div className="relative inline-flex items-center">
                <div className="inline-flex rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm transition">
                  <button
                    type="button"
                    onClick={() => {
                      setPowerActionType('shutdown');
                      setConfirmMainShutdown(true);
                    }}
                    className="px-3 py-1.5 hover:bg-rose-500/20 font-bold rounded-l-xl text-xs flex items-center gap-1.5 transition active:scale-95"
                    title="Shut Down Workstation PC"
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>Shut Down</span>
                  </button>
                  <div className="w-[1px] bg-rose-500/30"></div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPowerDropdown(!showPowerDropdown);
                    }}
                    className="px-2 py-1.5 hover:bg-rose-500/20 rounded-r-xl transition flex items-center justify-center"
                    title="Power Options"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition duration-200 ${showPowerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showPowerDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowPowerDropdown(false)} 
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-studio-900 border border-rose-500/30 rounded-xl shadow-2xl py-1.5 z-50 animate-scale-in">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPowerDropdown(false);
                          setPowerActionType('shutdown');
                          setConfirmMainShutdown(true);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-rose-500/15 text-rose-400 font-bold text-xs flex items-center gap-2 transition"
                      >
                        <Power className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <div>
                          <div>Shut Down PC</div>
                          <div className="text-[9px] font-normal text-slate-400">Turn off workstation</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPowerDropdown(false);
                          setPowerActionType('restart');
                          setConfirmMainShutdown(true);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-amber-500/15 text-amber-400 font-bold text-xs flex items-center gap-2 transition border-t border-white/5 mt-1 pt-2"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <div>
                          <div>Restart PC</div>
                          <div className="text-[9px] font-normal text-slate-400">Reboot workstation</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleStartSession} className="space-y-3">
            
            {/* Cascading selectors: Batch, Workstation, Student */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  Select Batch
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl studio-input text-slate-100 text-xs select-dark"
                >
                  {batches.length === 0 ? (
                    <option value="">No Batches Available</option>
                  ) : (
                    batches.map((b, idx) => (
                      <option key={b.id || idx} value={b.batchName || b.name || b.id}>{b.batchName || b.name || b.id}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Workstation Selector (repositioned between Batch and Student Name) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tv className="h-3.5 w-3.5 text-slate-500" />
                  Workstation
                </label>
                {defaultPc ? (
                  <div className="w-full px-3.5 py-2.5 rounded-xl studio-input text-slate-100 text-xs font-mono font-bold flex items-center bg-studio-900 border border-white/5">
                    {selectedPC}
                  </div>
                ) : (
                  <select
                    value={selectedPC}
                    onChange={(e) => setSelectedPC(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl studio-input text-slate-100 text-xs font-mono font-bold select-dark"
                  >
                    {workstationsList.length > 0 ? (
                      workstationsList.map(ws => (
                        <option key={ws.id || ws.name} value={ws.name}>
                          {ws.name}
                        </option>
                      ))
                    ) : (
                      Array.from({ length: 25 }, (_, i) => {
                        const id = `VFX-${String(i + 1).padStart(2, '0')}`;
                        return <option key={id} value={id}>{id}</option>;
                      })
                    )}
                  </select>
                )}
              </div>

              {/* Student Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  Student Name
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={filteredStudents.length === 0}
                  className="w-full px-3.5 py-2.5 rounded-xl studio-input text-slate-100 text-xs select-dark disabled:opacity-40"
                >
                  {filteredStudents.length === 0 ? (
                    <option value="">No Students in Batch</option>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <option key={s.id || idx} value={s.name}>{s.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Mode selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-slate-500" />
                Active Mode
              </label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl studio-input text-slate-100 text-xs select-dark"
              >
                {modes.map((m, idx) => (
                  <option key={m.id || idx} value={m.modeName || m.name || m.id}>{m.modeName || m.name || m.id}</option>
                ))}
              </select>
            </div>

            {/* Assignment description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Today's Work / Assignment Task
              </label>
              <textarea
                placeholder="What VFX pipeline, render plate, or AI model R&D task are you executing today?"
                value={todayWork}
                onChange={(e) => setTodayWork(e.target.value)}
                className="w-full h-16 px-3.5 py-2 rounded-xl studio-input text-slate-150 placeholder:text-slate-700 text-xs resize-none"
              />
            </div>

            {/* Selected Topic & Session Allotted Indicator */}
            {selectedTopicObj ? (() => {
              const topicDur = getTopicAllocatedDuration(selectedTopicObj, selectedBatch);
              const sessionDisplay = resolveSessionDisplay(selectedTopicObj, selectedBatch);
              const name = typeof selectedTopicObj === 'string' ? selectedTopicObj : (selectedTopicObj.name || 'Selected Topic');
              return (
                <div className="p-3 bg-studio-accent-purple/10 border border-studio-accent-purple/30 rounded-xl flex items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-studio-accent-purple/20 text-studio-accent-purple flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate">{name}</p>
                      <p className="text-[10px] text-studio-accent-purple font-medium">
                        Allocated: <span className="font-bold">{sessionDisplay}</span> &bull; Allotted: <span className="font-bold text-white font-mono">{topicDur.durationStr}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopicObj(null);
                      setSelectedTopicIndex(null);
                    }}
                    className="px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-white rounded border border-white/10 hover:bg-white/5 transition shrink-0"
                  >
                    Clear
                  </button>
                </div>
              );
            })() : (() => {
              const currentModeItemsForInd = selectedMode.toLowerCase() === 'academic' ? (activeAcad?.topics || [])
                : selectedMode.toLowerCase() === 'production' ? (activeProd?.projects || [])
                : selectedMode.toLowerCase() === 'research' ? (activeRes?.assignmentTopics || [])
                : (activeGenai?.projects || []);
              const allConcluded = currentModeItemsForInd.length > 0 && currentModeItemsForInd.every(item => isTopicSessionExpired(item, selectedBatch, batches));

              return (
                <div className="p-2.5 bg-studio-950/60 border border-white/5 rounded-xl text-center">
                  <p className="text-[10px] text-slate-400">
                    {allConcluded ? (
                      <span className="text-rose-400 font-semibold flex items-center justify-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        All scheduled {selectedMode} sessions for today have concluded.
                      </span>
                    ) : (
                      <>Select an active topic from the <strong className="text-slate-200">{selectedMode} Guidelines</strong> on the right to set your session allotted time.</>
                    )}
                  </p>
                </div>
              );
            })()}

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-studio-accent-purple to-studio-accent-blue hover:from-studio-accent-purple/95 hover:to-studio-accent-blue/95 text-white font-bold rounded-xl transition duration-300 shadow-glow-purple flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-xs tracking-wider uppercase mt-2 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Initialize Session & Start Lab Work
            </button>

            {/* Version, Help, Logo, and Update Option */}
            <div className="flex justify-between items-center pt-3 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span>Version: {appVersion}</span>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setShowAboutModal(true)}
                  className="text-slate-400 hover:text-white hover:underline transition cursor-pointer font-semibold"
                >
                  Help
                </button>
              </div>
              <img src={nailLogo} alt="PIVOT Logo" className="h-4 object-contain drop-shadow-sm hover:scale-105 transition duration-300" />
              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={isUpdating}
                className="text-studio-accent-blue hover:text-white transition flex items-center gap-1 hover:underline disabled:opacity-50 disabled:pointer-events-none"
              >
                {isUpdating ? 'Checking Updates...' : 'Check for Updates'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Right Bulletin Board (5 cols) */}
      <div className="lg:col-span-5" style={{ WebkitAppRegion: 'no-drag' }}>
        {renderBulletinBoard()}
      </div>

      {/* UPDATE MODALS */}
      {updateAvailable && (
        <div className="absolute inset-0 z-50 rounded-3xl bg-studio-900/98 flex items-center justify-center p-6 pointer-events-auto">
          <div className="w-full max-w-sm glass-panel-glow border-studio-accent-blue/30 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in">
            <div className="h-12 w-12 rounded-full bg-studio-accent-blue/20 text-studio-accent-blue flex items-center justify-center border border-studio-accent-blue/30">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide uppercase">Update Available</h3>
            <p className="text-xs text-slate-355 leading-relaxed font-sans">
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
                className="flex-1 py-2.5 bg-studio-accent-blue hover:bg-studio-accent-blue/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-glow-blue"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdating && !updateAvailable && updateStatus && (
        <div className="absolute inset-0 z-50 rounded-3xl bg-studio-900/98 flex items-center justify-center p-6 pointer-events-auto">
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

      {updateDownloaded && (
        <div className="absolute inset-0 z-50 rounded-3xl bg-studio-900/98 flex items-center justify-center p-6 pointer-events-auto">
          <div className="w-full max-w-sm glass-panel-glow border-emerald-500/30 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide uppercase">Update Ready</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Version v{targetVersion} is downloaded and ready to install.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setUpdateDownloaded(false)}
                className="flex-1 py-2.5 bg-studio-800 hover:bg-studio-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition border border-white/5"
              >
                Later
              </button>
              <button
                onClick={() => {
                  if (window.electronAPI && typeof window.electronAPI.installUpdate === 'function') {
                    window.electronAPI.installUpdate();
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-glow-emerald"
              >
                Restart & Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN WINDOW SHUTDOWN/RESTART CONFIRMATION MODAL */}
      {confirmMainShutdown && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-transparent pointer-events-auto">
          <div 
            className="absolute inset-0" 
            onClick={() => setConfirmMainShutdown(false)} 
          />
          <div className={`relative z-10 w-full max-w-sm glass-panel-glow bg-studio-900/95 p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in ${
            powerActionType === 'restart' ? 'border-amber-500/40' : 'border-rose-500/40'
          }`}>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center border shadow-lg ${
              powerActionType === 'restart'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {powerActionType === 'restart' ? <RefreshCw className="h-6 w-6 animate-pulse" /> : <Power className="h-6 w-6 animate-pulse" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                {powerActionType === 'restart' ? 'Restart Workstation?' : 'Shut Down Workstation?'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {powerActionType === 'restart'
                  ? 'Are you sure you want to restart this computer?'
                  : 'Are you sure you want to shut down this computer?'}
              </p>
            </div>
            <div className="flex gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setConfirmMainShutdown(false)}
                className="flex-1 py-2.5 bg-studio-800 hover:bg-studio-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition border border-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmMainShutdown(false);
                  if (powerActionType === 'restart') {
                    if (window.electronAPI && typeof window.electronAPI.proceedRestart === 'function') {
                      window.electronAPI.proceedRestart();
                    }
                  } else {
                    if (window.electronAPI && typeof window.electronAPI.proceedShutdown === 'function') {
                      window.electronAPI.proceedShutdown();
                    }
                  }
                }}
                className={`flex-1 py-2.5 bg-gradient-to-r text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                  powerActionType === 'restart'
                    ? 'from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 shadow-glow-amber'
                    : 'from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-glow-red'
                }`}
              >
                {powerActionType === 'restart' ? <RefreshCw className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                {powerActionType === 'restart' ? 'Restart Now' : 'Shut Down Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Pivot / Help Dialogue Box Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-transparent p-4 animate-fade-in pointer-events-auto">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0" 
            onClick={() => setShowAboutModal(false)} 
          />

          <div className="relative z-10 w-full max-w-lg glass-panel-glow border border-white/10 bg-studio-900/95 p-8 rounded-2xl shadow-2xl flex flex-col justify-between min-h-[300px] overflow-hidden text-left">
            {/* Background glow accents */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-studio-accent-purple/10 blur-[90px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-studio-accent-blue/10 blur-[90px] pointer-events-none" />

            {/* Close button top right */}
            <button 
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition border border-white/5 z-20 cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Top Section: Top Left - Logo & Below - Version Name */}
            <div className="space-y-3 text-left z-10">
              <img 
                src={pivotLogo} 
                alt="PIVOT Workstation Monitoring" 
                className="h-[88px] w-auto object-contain object-left block" 
              />
              <p className="text-xs font-mono font-bold text-studio-accent-purple tracking-wider uppercase">
                Version {appVersion}
              </p>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-white/10 z-10" />

            {/* Bottom Row - Developed By (Bottom Left) & NAIL Logo (Right Bottom) */}
            <div className="flex justify-between items-end z-10">
              {/* Bottom Left - Developed By */}
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-300">
                  Developed By : <span className="text-white font-bold">Sreejith Balachandran</span>
                </p>
              </div>

              {/* Right Bottom - NAIL Logo */}
              <div className="flex flex-col items-end">
                <img 
                  src={nailLogo} 
                  alt="NAIL Logo" 
                  className="h-9 object-contain object-right" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

class StudentClientBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("StudentClient rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[400px] glass-panel border-rose-500/40 p-6 rounded-2xl text-white flex flex-col justify-between overflow-y-auto pointer-events-auto shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Widget Rendering Notice</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              An error occurred while rendering the widget display. This usually happens if a project/topic format from an older batch was unexpectedly formatted.
            </p>
            <div className="p-3 bg-studio-950/90 border border-rose-500/20 rounded-xl text-[10px] font-mono text-rose-300 overflow-x-auto max-h-40">
              {this.state.error && this.state.error.toString()}
            </div>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onSessionStateChange) this.props.onSessionStateChange(false);
            }}
            className="mt-6 w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg"
          >
            Reset Widget View
          </button>
        </div>
      );
    }
    return <StudentClient {...this.props} />;
  }
}

export default StudentClientBoundary;
