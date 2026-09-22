import React, { useState, useEffect, useRef } from 'react';
import nailLogo from '../nail-logo.png';
import { 
  subscribeCollection, 
  subscribeDocument,
  getDocument,
  addDocument,
  updateDocument,
  isMockMode 
} from '../firebase';
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

function StudentClient({ onSessionStateChange }) {
  // Database configuration states
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [modes, setModes] = useState([]);
  const [computers, setComputers] = useState([]);

  // Batch specific settings collections
  const [acadConfigsList, setAcadConfigsList] = useState([]);
  const [prodConfigsList, setProdConfigsList] = useState([]);
  const [resConfig, setResConfig] = useState(null);
  const [genaiConfigsList, setGenaiConfigsList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [workstationsList, setWorkstationsList] = useState([]);

  // Workstation Identifier
  const defaultPc = import.meta.env.VITE_PC_ID || '';
  const [selectedPC, setSelectedPC] = useState(defaultPc || 'VFX-01');

  // Form Inputs
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMode, setSelectedMode] = useState('Academic');
  const [todayWork, setTodayWork] = useState('');
  const [selectedTopicObj, setSelectedTopicObj] = useState(null);

  useEffect(() => {
    setSelectedTopicObj(null);
  }, [selectedMode, selectedBatch]);

  // Session State
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [adminResetNotice, setAdminResetNotice] = useState(false);
  const [concurrencyError, setConcurrencyError] = useState('');
  const [isRendering, setIsRendering] = useState(false);

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

  // Client Update States
  const [appVersion, setAppVersion] = useState(() => {
    const stored = localStorage.getItem('student_client_version');
    if (!stored || stored === '1.0 Beta') {
      localStorage.setItem('student_client_version', '1.0.0-beta');
      return '1.0.0-beta';
    }
    return stored;
  });
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
            localStorage.setItem('student_client_version', ver);
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
          setUpdateStatus(`Downloading update from GitHub... ${percent}%`);
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
    const unsubscribe = subscribeCollection('app_versions', (versions) => {
      const studentConfig = versions.find(v => v.id === 'student');
      if (studentConfig) {
        setTargetVersion(studentConfig.version);
        setDownloadUrl(studentConfig.downloadUrl);
        if (studentConfig.version && studentConfig.version !== appVersion) {
          setUpdateAvailable(true);
        }
      }
    });
    return () => unsubscribe && unsubscribe();
  }, [appVersion]);

  // Local Alerts & Timing States
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [localAlert, setLocalAlert] = useState(null);
  const [syncIntervalMs, setSyncIntervalMs] = useState(30000); // Default Eco 30s
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
      if (data && data.length > 0) setResConfig(data[0]);
    });

    const unsubGenai = subscribeCollection('settings_genai', (data) => {
      setGenaiConfigsList(data);
    });

    const unsubWorkstations = subscribeCollection('computers', (data) => {
      const list = (data || []).map(w => ({ ...w, name: w.name || w.id }));
      const sorted = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
      setWorkstationsList(sorted);
    });

    return () => {
      unsubBatches();
      unsubStudents();
      unsubWorkstations();
      unsubModes();
      unsubAcad();
      unsubProd();
      unsubRes();
      unsubGenai();
    };
  }, []);

  // Listen to the selected/active computer document in real-time (reduces reads by 96%)
  useEffect(() => {
    let unsubComp = null;
    const pcId = activeSession ? activeSession.computerId : selectedPC;
    if (pcId) {
      unsubComp = subscribeDocument('computers', pcId, (docData) => {
        setComputers(docData ? [docData] : []);
      });
    }
    return () => unsubComp && unsubComp();
  }, [selectedPC, activeSession]);

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
          lastActive: new Date().toISOString(),
          startTime: startTimeToSync
        }).catch(err => console.error('Heartbeat update failed:', err));
      };

      sendHeartbeat();

      // Calculate effective sync interval (Auto-throttle if active PCs >= 15)
      const onlineCount = onlineCountRef.current;
      let effectiveInterval = syncIntervalMs;
      if (autoThrottle && onlineCount >= 15) {
        effectiveInterval = Math.max(effectiveInterval, 30000); // Force Eco 30s+ under high lab load
      }

      heartbeatInterval = setInterval(sendHeartbeat, effectiveInterval);
    }
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [activeSession, syncIntervalMs, autoThrottle]);

  // 4. Remote Logout Listener (HOD Override Reset)
  useEffect(() => {
    if (!activeSession) return;

    // Listen to computers. If our current PC status changes to offline remotely, trigger logout.
    const currentPcStatus = computers.find(c => c.id === activeSession.computerId);
    if (currentPcStatus && currentPcStatus.status === 'offline' && currentPcStatus.currentUser === null) {
      handleLogout(true);
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
  const activeAcad = acadConfigsList.find(c => c.id === selectedBatch) || {
    topics: [],
    instructions: 'Follow batch instructions.',
    timeslot: 'N/A'
  };

  const activeProd = prodConfigsList.find(c => c.id === selectedBatch) || {
    projects: []
  };

  const activeGenai = genaiConfigsList.find(c => c.id === selectedBatch) || {
    projects: [],
    instructions: 'Execute independent GenAI workflows.'
  };

  const getSessionEndTime = () => {
    let slotStr = '';
    if (selectedTopicObj && selectedTopicObj.timing) {
      slotStr = selectedTopicObj.timing;
    } else if (selectedMode.toLowerCase() === 'academic') {
      slotStr = activeAcad.timeslot;
    } else if (selectedMode.toLowerCase() === 'production') {
      const firstProj = activeProd.projects?.[0];
      slotStr = firstProj ? firstProj.timing : '02:00 PM - 06:00 PM';
    } else if (selectedMode.toLowerCase() === 'research') {
      const firstTopic = resConfig?.assignmentTopics?.[0];
      slotStr = firstTopic ? firstTopic.timing : '09:00 AM - 01:00 PM';
    } else if (selectedMode.toLowerCase() === 'nail, genai lab' || selectedMode.toLowerCase() === 'genai lab') {
      const firstProj = activeGenai.projects?.[0];
      slotStr = firstProj ? firstProj.timing : '09:00 AM - 01:00 PM';
    } else {
      return null;
    }

    if (!slotStr || slotStr === 'N/A') return null;

    try {
      const parts = slotStr.split(' - ');
      if (parts.length !== 2) return null;
      
      const endTimePart = parts[1].trim();
      const match = endTimePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      if (target.getTime() < Date.now() - 12 * 60 * 60 * 1000) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    } catch (e) {
      console.error('Error parsing session end time:', e);
      return null;
    }
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
      setUpdateStatus('Starting download from GitHub...');
      setUpdateProgress(0);
      window.electronAPI.startUpdateDownload();
    } else if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } else {
      alert('Update link is not configured. Please contact the administrator.');
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
    let availableGuidelinesCount = 0;
    if (selectedMode.toLowerCase() === 'academic') {
      availableGuidelinesCount = (activeAcad?.topics || []).length;
    } else if (selectedMode.toLowerCase() === 'production') {
      availableGuidelinesCount = (activeProd?.projects || []).length;
    } else if (selectedMode.toLowerCase() === 'research') {
      availableGuidelinesCount = (resConfig?.assignmentTopics || []).length;
    } else if (selectedMode.toLowerCase() === 'genai lab' || selectedMode.toLowerCase() === 'nail, genai lab') {
      availableGuidelinesCount = (activeGenai?.projects || []).length;
    }

    if (availableGuidelinesCount > 0 && !selectedTopicObj) {
      alert(`You must select at least one ${selectedMode} guideline/topic from the bulletin board on the right before logging in (even if you typed on Today's Work).`);
      return;
    }

    if (isSubmittingSession) return;

    // PC OCCUPANCY CHECK: Verify if the selected PC is actively online (with self-healing for stale shutdown locks)
    const occupiedPc = computers.find(c => {
      if (c.id !== selectedPC || c.status !== 'online') return false;
      // Must have an active current user to be considered occupied
      if (!c.currentUser || !c.currentUser.trim()) return false;

      // Self-healing check: If PC has been inactive for > 45s (stale lock from forced shutdown/power off)
      if (c.lastActive) {
        const lastActiveMs = new Date(c.lastActive).getTime();
        if (!isNaN(lastActiveMs)) {
          const elapsedSecs = (Date.now() - lastActiveMs) / 1000;
          if (elapsedSecs > 45) {
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

    setIsSubmittingSession(true);

    const topicName = selectedTopicObj ? (typeof selectedTopicObj === 'string' ? selectedTopicObj : (selectedTopicObj.name || '')) : '';
    const sessionTaskDesc = (todayWork || '').trim() || topicName;

    const sessionData = {
      computerId: selectedPC,
      studentName: selectedStudent,
      studentBatch: selectedBatch,
      mode: selectedMode,
      taskDesc: sessionTaskDesc,
      startTime: new Date().toISOString()
    };

    try {
      // 1. Update computer status to Online in Firestore
      await updateDocument('computers', selectedPC, {
        status: 'online',
        currentUser: selectedStudent,
        currentBatch: selectedBatch,
        currentMode: selectedMode,
        currentTask: sessionTaskDesc,
        startTime: sessionData.startTime,
        lastActive: new Date().toISOString(),
        message: null
      });

      // 2. Clear notices and enter locking screen
      setAdminResetNotice(false);
      setConcurrencyError('');
      
      // Calculate session end time and reset alerts
      const targetEndTime = getSessionEndTime();
      setSessionEndTime(targetEndTime);
      setAlertTriggered({
        hour: false,
        mins30: false,
        mins15: false,
        min1: false,
        over: false
      });

      setActiveSession(sessionData);
      if (window.electronAPI && typeof window.electronAPI.startSession === 'function') {
        window.electronAPI.startSession();
      }
    } catch (err) {
      console.error('Failed to log in workstation:', err);
      alert('Session connection error. Please try again.');
    } finally {
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

    // Immediately clear activeSession state so that no effects or double-triggers can see it as active
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
        }).catch(err => console.error('Failed to update PC offline status:', err));
      }

      // 2. Write completed session details to activity_logs & update student total hours concurrently
      const logPromise = addDocument('activity_logs', {
        studentId: session.studentName,
        computerId: session.computerId,
        mode: session.mode,
        taskDesc: session.taskDesc,
        startTime: session.startTime,
        endTime: new Date().toISOString(),
        status: logoutStatus,
        durationSecs: durationSecs,
        totalHours: totalHours
      });

      const studentDoc = students.find(s => (s.name || '').toLowerCase() === (session.studentName || '').toLowerCase());
      let studentPromise = Promise.resolve();
      if (studentDoc) {
        const newTotalSecs = (studentDoc.totalSeconds || 0) + durationSecs;
        const newTotalHours = Number((newTotalSecs / 3600).toFixed(2));
        studentPromise = updateDocument('students', studentDoc.id, {
          totalSeconds: newTotalSecs,
          totalHours: newTotalHours,
          lastLogoutTime: new Date().toISOString()
        });
      }

      await Promise.allSettled([logPromise, studentPromise]);

      // 3. Reset local states
      setTodayWork('');
      if (batches.length > 0) {
        setSelectedBatch(batches[0].batchName || batches[0].name || batches[0].id);
      }
      setSelectedMode('Academic');
      setSelectedTopicObj(null);
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
    switch(modeName.toLowerCase()) {
      case 'academic': return { border: 'border-studio-accent-blue/30', bg: 'bg-studio-accent-blue/5', text: 'text-studio-accent-blue', icon: <GraduationCap className="h-4 w-4" /> };
      case 'production': return { border: 'border-studio-accent-purple/30', bg: 'bg-studio-accent-purple/5', text: 'text-studio-accent-purple', icon: <Film className="h-4 w-4" /> };
      case 'research': return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', icon: <BookOpen className="h-4 w-4" /> };
      case 'genai lab':
      case 'nail, genai lab': return { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', icon: <Sparkles className="h-4 w-4" /> };
      default: return { border: 'border-slate-500/30', bg: 'bg-slate-500/5', text: 'text-slate-400', icon: <Sparkles className="h-4 w-4" /> };
    }
  };

  // ----------------------------------------------------
  // RENDER DYNAMIC BULLETIN INFO
  // ----------------------------------------------------
  const renderBulletinBoard = () => {
    const theme = getModeTheme(selectedMode);
    
    return (
      <div className={`p-6 rounded-2xl border ${theme.border} ${theme.bg} space-y-4 h-full flex flex-col justify-between`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {theme.icon}
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
              {selectedMode} Guidelines
            </span>
          </div>

          {/* Academic view bulletin */}
          {selectedMode.toLowerCase() === 'academic' && (
            <div className="space-y-3.5 text-xs text-slate-400">
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Available Lesson Topics (Select One)</p>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                  {(activeAcad.topics || []).length === 0 ? (
                    <span className="text-[10px] text-slate-600">No topics registered.</span>
                  ) : (
                    (activeAcad.topics || []).map((t, i) => {
                      const name = typeof t === 'string' ? t : (t.name || 'Unnamed Topic');
                      const sessionName = typeof t === 'string' ? 'Session 1' : (t.sessionName || (batches.find(b => b.batchName === selectedBatch)?.sessionTimes || []).find(s => s.timing === t.timing)?.name || 'Session 1');
                      const category = typeof t === 'string' ? '' : (t.taskType || '');
                      const isSelected = selectedTopicObj && (selectedTopicObj.name || selectedTopicObj) === name;
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => {
                            setSelectedTopicObj(t);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-studio-accent-blue/20 border-studio-accent-blue ring-1 ring-studio-accent-blue text-white shadow-lg'
                              : 'bg-studio-950/60 border-white/5 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-[11px]">{name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isSelected ? 'bg-studio-accent-blue text-white' : 'bg-white/10 text-slate-400'
                            }`}>
                              {isSelected ? '✓ Selected' : 'Select'}
                            </span>
                          </div>
                          {(sessionName || category) && (
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              {category && <span className="text-studio-accent-blue font-bold uppercase inline-flex items-center justify-center">{category}</span>}
                              <span className="px-1.5 py-0.5 rounded bg-studio-accent-blue/10 border border-studio-accent-blue/20 text-studio-accent-blue font-bold text-[8px] inline-flex items-center justify-center">{sessionName}</span>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Instructions</p>
                <p className="mt-1 leading-relaxed">{activeAcad.instructions || 'Follow faculty guidance.'}</p>
              </div>
            </div>
          )}

          {/* Production view bulletin (Projects list) */}
          {selectedMode.toLowerCase() === 'production' && (
            <div className="space-y-3.5 text-xs text-slate-400">
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Active Batch Projects (Select One)</p>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                  {(activeProd.projects || []).length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic">No projects registered for this batch.</p>
                  ) : (
                    (activeProd.projects || []).map((proj, i) => {
                      const name = typeof proj === 'string' ? proj : (proj.name || 'Unnamed Project');
                      const sessionName = typeof proj === 'string' ? 'Session 1' : (proj.sessionName || (batches.find(b => b.batchName === selectedBatch)?.sessionTimes || []).find(s => s.timing === proj.timing)?.name || 'Session 1');
                      const category = typeof proj === 'string' ? '' : (proj.taskType || 'Production');
                      const isSelected = selectedTopicObj && (selectedTopicObj.name || selectedTopicObj) === name;
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => {
                            setSelectedTopicObj(proj);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1.5 text-[10px] ${
                            isSelected
                              ? 'bg-studio-accent-purple/20 border-studio-accent-purple ring-1 ring-studio-accent-purple text-white shadow-lg'
                              : 'bg-studio-950 border-white/5 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-[11px]">{name}</span>
                            <div className="flex items-center gap-1.5">
                              {category && <span className="px-1.5 py-0.5 rounded bg-studio-accent-purple/15 border border-studio-accent-purple/20 text-studio-accent-purple font-semibold text-[8px] uppercase tracking-wide leading-none shrink-0">{category}</span>}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isSelected ? 'bg-studio-accent-purple text-white' : 'bg-white/10 text-slate-400'
                              }`}>
                                {isSelected ? '✓ Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-studio-accent-purple/10 border border-studio-accent-purple/20 text-studio-accent-purple font-bold text-[8px] inline-flex items-center justify-center">{sessionName}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Instructions</p>
                <p className="mt-1 leading-relaxed">{activeProd.instructions || 'Execute assigned production shots and tasks.'}</p>
              </div>
            </div>
          )}

          {/* Research view bulletin */}
          {selectedMode.toLowerCase() === 'research' && resConfig && (
            <div className="space-y-3.5 text-xs text-slate-400">
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Observations & Analysis Topics (Select One)</p>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                  {(resConfig.assignmentTopics || []).length === 0 ? (
                    <span className="text-[10px] text-slate-600">No topics registered.</span>
                  ) : (
                    (resConfig.assignmentTopics || []).map((t, i) => {
                      const name = typeof t === 'string' ? t : (t.name || 'Unnamed Topic');
                      const sessionName = typeof t === 'string' ? 'Session 1' : (t.sessionName || (batches.find(b => b.batchName === selectedBatch)?.sessionTimes || []).find(s => s.timing === t.timing)?.name || 'Session 1');
                      const category = typeof t === 'string' ? '' : (t.taskType || '');
                      const isSelected = selectedTopicObj && (selectedTopicObj.name || selectedTopicObj) === name;
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => {
                            setSelectedTopicObj(t);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500 text-white shadow-lg'
                              : 'bg-studio-950/60 border-white/5 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-[11px]">{name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isSelected ? 'bg-emerald-500 text-black font-extrabold' : 'bg-white/10 text-slate-400'
                            }`}>
                              {isSelected ? '✓ Selected' : 'Select'}
                            </span>
                          </div>
                          {(sessionName || category) && (
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              {category && <span className="text-emerald-400 font-bold uppercase inline-flex items-center justify-center">{category}</span>}
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[8px] inline-flex items-center justify-center">{sessionName}</span>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Submission brief</p>
                <p className="mt-1 leading-relaxed text-slate-400">{(resConfig.instructions && !resConfig.instructions.includes('Research current state-of-the-art') && !resConfig.instructions.includes('industry papers') && !resConfig.instructions.includes('Conduct thorough observations')) ? resConfig.instructions : 'No instructions provided.'}</p>
              </div>
            </div>
          )}

          {/* GenAI Lab view bulletin */}
          {(selectedMode.toLowerCase() === 'nail, genai lab' || selectedMode.toLowerCase() === 'genai lab') && (
            <div className="space-y-3.5 text-xs text-slate-400">
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Active Batch GenAI Projects (Select One)</p>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
                  {(activeGenai.projects || []).length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic">No projects registered for this batch.</p>
                  ) : (
                    (activeGenai.projects || []).map((proj, i) => {
                      const name = typeof proj === 'string' ? proj : (proj.name || 'Unnamed Project');
                      const sessionName = typeof proj === 'string' ? 'Session 1' : (proj.sessionName || (batches.find(b => b.batchName === selectedBatch)?.sessionTimes || []).find(s => s.timing === proj.timing)?.name || 'Session 1');
                      const category = typeof proj === 'string' ? '' : (proj.taskType || 'GenAI');
                      const isSelected = selectedTopicObj && (selectedTopicObj.name || selectedTopicObj) === name;
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => {
                            setSelectedTopicObj(proj);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1.5 text-[10px] ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500 text-white shadow-lg'
                              : 'bg-studio-950 border-white/5 hover:border-white/20 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-[11px]">{name}</span>
                            <div className="flex items-center gap-1.5">
                              {category && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 font-semibold text-[8px] uppercase tracking-wide leading-none shrink-0">{category}</span>}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isSelected ? 'bg-amber-500 text-black font-extrabold' : 'bg-white/10 text-slate-400'
                              }`}>
                                {isSelected ? '✓ Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[8px] inline-flex items-center justify-center">{sessionName}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="font-bold text-white uppercase tracking-wide text-[10px] text-slate-500">Instructions</p>
                <p className="mt-1 leading-relaxed">{activeGenai.instructions || 'Execute independent GenAI workflows.'}</p>
              </div>
            </div>
          )}
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider shrink-0">{activeSession.computerId}</span>
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
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-extrabold text-emerald-400 tracking-wider">
                  ONLINE
                </span>
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
                  {activeSession.studentBatch} | <span className="text-studio-accent-purple font-semibold">{activeSession.mode}</span>
                </p>
              </div>

              {/* Live Stopwatch Clock */}
              <div className="bg-studio-900/40 border border-white/5 p-4 rounded-2xl text-center space-y-3 shadow-inner">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-studio-accent-purple" />
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
                <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block">Guideline Bulletin</span>
                <div className="max-h-36 overflow-y-auto pr-1">
                  {activeSession.mode.toLowerCase() === 'academic' && (
                    <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                      <p className="mt-1">{activeAcad.instructions}</p>
                      <div className="space-y-1.5 mt-1.5">
                        {(activeAcad.topics || []).map((t, i) => {
                          const name = typeof t === 'string' ? t : t.name;
                          const sessionName = typeof t === 'string' ? 'Session 1' : (t.sessionName || 'Session 1');
                          const category = typeof t === 'string' ? '' : t.taskType;
                          return (
                            <div key={i} className="p-2 bg-studio-950/60 border border-white/5 rounded-lg flex flex-col gap-1">
                              <span className="font-bold text-white text-[10px]">{name}</span>
                              <div className="flex gap-2 text-[8px] text-slate-500 font-mono">
                                {category && <span className="text-studio-accent-blue font-bold uppercase">{category}</span>}
                                <span className="text-studio-accent-blue font-bold">{sessionName}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                  {activeSession.mode.toLowerCase() === 'production' && (
                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      <p className="mt-1">{activeProd.instructions || 'Execute assigned production shots and tasks.'}</p>
                      {(activeProd.projects || []).map((proj, idx) => {
                        const name = typeof proj === 'string' ? proj : (proj.name || 'Unnamed Project');
                        const sessionName = typeof proj === 'string' ? 'Session 1' : (proj.sessionName || 'Session 1');
                        const category = typeof proj === 'string' ? '' : (proj.taskType || 'Production');
                        return (
                          <div key={idx} className="p-2.5 bg-studio-950 border border-white/5 rounded flex flex-col gap-0.5">
                            <span className="font-bold text-white text-xs">{name}</span>
                            <div className="flex gap-2 text-[9px] text-studio-accent-purple">
                              <span>{category}</span>
                              <span className="font-bold">| {sessionName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeSession.mode.toLowerCase() === 'research' && resConfig && (
                    <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                      <p className="mt-1">{resConfig.instructions}</p>
                      <div className="space-y-1.5 mt-1.5">
                        {(resConfig.assignmentTopics || []).map((t, i) => {
                          const name = typeof t === 'string' ? t : t.name;
                          const sessionName = typeof t === 'string' ? 'Session 1' : (t.sessionName || 'Session 1');
                          const category = typeof t === 'string' ? '' : t.taskType;
                          return (
                            <div key={i} className="p-2 bg-studio-950/60 border border-white/5 rounded-lg flex flex-col gap-1">
                              <span className="font-bold text-white text-[10px]">{name}</span>
                              <div className="flex gap-2 text-[8px] text-slate-500 font-mono">
                                {category && <span className="text-emerald-400 font-bold uppercase">{category}</span>}
                                <span className="text-emerald-400 font-bold">{sessionName}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(activeSession.mode.toLowerCase() === 'genai lab' || activeSession.mode.toLowerCase() === 'nail, genai lab') && (
                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      <p className="mt-1">{activeGenai.instructions || 'Execute independent GenAI workflows.'}</p>
                      {(activeGenai.projects || []).map((proj, idx) => {
                        const name = typeof proj === 'string' ? proj : (proj.name || 'Unnamed Project');
                        const sessionName = typeof proj === 'string' ? 'Session 1' : (proj.sessionName || 'Session 1');
                        const category = typeof proj === 'string' ? '' : (proj.taskType || 'GenAI');
                        return (
                          <div key={idx} className="p-2.5 bg-studio-950 border border-white/5 rounded flex flex-col gap-0.5">
                            <span className="font-bold text-white text-xs">{name}</span>
                            <div className="flex gap-2 text-[9px] text-amber-500">
                              <span>{category}</span>
                              <span className="font-bold">| {sessionName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                }`}>
                  {isMockMode ? 'SIMULATION' : 'LIVE'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Workstation Login</h3>
            </div>
            
            {/* Power Control Button */}
            <div className="flex items-center gap-2.5">
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
                        const id = `PC-${String(i + 1).padStart(2, '0')}`;
                        return <option key={id} value={id}>{id}</option>;
                      })
                    )}
                  </select>
                )}
                {(() => {
                  const currentWs = workstationsList.find(w => w.name === selectedPC);
                  if (!currentWs || (!currentWs.gpu && !currentWs.ram && !currentWs.vram && !currentWs.processor)) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 bg-studio-950/60 p-2 rounded-lg border border-white/5 font-mono mt-1">
                      {currentWs.gpu && <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-white/5 text-emerald-400 font-semibold">{currentWs.gpu}</span>}
                      {currentWs.vram && <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-white/5 text-amber-400">{currentWs.vram} VRAM</span>}
                      {currentWs.ram && <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-white/5 text-studio-accent-blue">{currentWs.ram} RAM</span>}
                      {currentWs.processor && <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-white/5 text-purple-300">{currentWs.processor}</span>}
                    </div>
                  );
                })()}
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

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-studio-accent-purple to-studio-accent-blue hover:from-studio-accent-purple/95 hover:to-studio-accent-blue/95 text-white font-bold rounded-xl transition duration-300 shadow-glow-purple flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-xs tracking-wider uppercase mt-2 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Initialize Session & Start Lab Work
            </button>

            {/* Version, Logo, and Update Option */}
            <div className="flex justify-between items-center pt-3 text-[10px] text-slate-500 font-medium">
              <span>Version: {appVersion}</span>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-studio-950/95 backdrop-blur-md pointer-events-auto">
          <div className={`w-full max-w-sm glass-panel-glow p-6 rounded-2xl shadow-glass-glow flex flex-col items-center text-center space-y-4 animate-scale-in ${
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
