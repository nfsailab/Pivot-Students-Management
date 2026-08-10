import React, { useState, useEffect } from 'react';
import { subscribeCollection, updateDocument, addDocument } from '../firebase';
import { 
  Tv, 
  Search, 
  User, 
  Clock, 
  Activity, 
  Sparkles, 
  GraduationCap, 
  Film, 
  BookOpen, 
  HelpCircle,
  LogOut,
  History,
  X,
  Calendar,
  Download,
  MessageSquare
} from 'lucide-react';

const getSessionTimesTotalHours = (batch) => {
  if (!batch || !batch.useSessionTimes || !batch.sessionTimes || !Array.isArray(batch.sessionTimes)) return 0;
  
  const parseTimeToMinutes = (str) => {
    const m = str.trim().match(/^(\d+)(?::(\d+))?\s*(AM|PM)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3] ? m[3].toUpperCase() : null;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  let totalMins = 0;
  for (const s of batch.sessionTimes) {
    if (!s) continue;
    const timing = typeof s === 'string' ? s : s.timing;
    if (!timing) continue;
    const parts = timing.split(/\s*[-–to]+\s*/i);
    if (parts.length === 2) {
      const start = parseTimeToMinutes(parts[0]);
      const end = parseTimeToMinutes(parts[1]);
      if (start !== null && end !== null) {
        let diff = end - start;
        if (diff < 0) diff += 24 * 60;
        totalMins += diff;
      }
    }
  }
  return Number((totalMins / 60).toFixed(2));
};

function MonitoringGrid() {
  const [computers, setComputers] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  const [studentsList, setStudentsList] = useState([]);

  // History modal states
  const [historyTab, setHistoryTab] = useState('computer'); // 'computer' | 'student'
  const [selectedPC, setSelectedPC] = useState(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [batchesList, setBatchesList] = useState([]);
  const [academicSettingsList, setAcademicSettingsList] = useState([]);

  // Messaging states
  const [messagingPC, setMessagingPC] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showGroupMessageModal, setShowGroupMessageModal] = useState(false);
  const [groupTargetMode, setGroupTargetMode] = useState('all');
  const [groupMessageText, setGroupMessageText] = useState('');
  const [isSendingGroup, setIsSendingGroup] = useState(false);

  // Date range filters (default to last 1 month, even though total search date is past 6 months)
  const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultEndDate = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Live ticking clock for online workstation session timers
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionDuration = (startTime) => {
    if (!startTime) return '00:00:00';
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return '00:00:00';
    const diffSecs = Math.max(0, Math.floor((currentTime - start) / 1000));
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getPCBatch = (pc) => {
    if (pc.currentBatch) return pc.currentBatch.trim();
    if (pc.currentUser) {
      const studentObj = studentsList.find(s => (s.name || '').toLowerCase() === (pc.currentUser || '').toLowerCase());
      if (studentObj?.batch) return studentObj.batch.trim();
    }
    return '';
  };

  const getAvailableBatches = () => {
    const batchSet = new Set();
    batchesList.forEach(b => { if (b.batchName) batchSet.add(b.batchName.trim()); });
    studentsList.forEach(s => { if (s.batch) batchSet.add(s.batch.trim()); });
    computers.forEach(pc => {
      const b = getPCBatch(pc);
      if (b) batchSet.add(b);
    });
    return Array.from(batchSet).filter(Boolean).sort();
  };

  // Subscriptions
  useEffect(() => {
    const unsubComps = subscribeCollection('computers', (data) => {
      const sorted = [...data].sort((a, b) => a.id.localeCompare(b.id));
      setComputers(sorted);
    });

    const unsubLogs = subscribeCollection('activity_logs', (data) => {
      // Sort logs by newest first
      const sorted = [...data].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      setLogs(sorted);
    });

    const unsubStudents = subscribeCollection('students', (data) => {
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setStudentsList(sorted);
    });

    const unsubBatches = subscribeCollection('batches', (data) => {
      const sorted = [...data].sort((a, b) => (a.batchName || '').localeCompare(b.batchName || ''));
      setBatchesList(sorted);
    });

    const unsubAcad = subscribeCollection('settings_academic', (data) => {
      setAcademicSettingsList(data || []);
    });

    return () => {
      unsubComps();
      unsubLogs();
      unsubStudents();
      unsubBatches();
      unsubAcad();
    };
  }, []);

  // Watchdog: detect if any computer marked online has stopped sending heartbeats (>45 seconds)
  useEffect(() => {
    const watchdog = setInterval(() => {
      computers.forEach(async (pc) => {
        if (pc.status === 'online' && pc.lastActive) {
          const elapsedSecs = (Date.now() - new Date(pc.lastActive).getTime()) / 1000;
          if (elapsedSecs > 45) {
            console.warn(`Watchdog detected forced shutdown or offline on ${pc.id}. Last active ${Math.floor(elapsedSecs)}s ago.`);
            try {
              const startMs = pc.startTime ? new Date(pc.startTime).getTime() : new Date(pc.lastActive).getTime();
              const endMs = new Date(pc.lastActive).getTime();
              const durationSecs = Math.max(0, Math.floor((endMs - startMs) / 1000));
              const totalHours = Number((durationSecs / 3600).toFixed(2));

              await addDocument('activity_logs', {
                studentId: pc.currentUser || 'Unknown Student',
                computerId: pc.id,
                mode: pc.currentMode || 'Academic',
                taskDesc: pc.currentTask || 'Session abruptly ended via forced shutdown or offline event',
                startTime: pc.startTime || pc.lastActive,
                endTime: pc.lastActive,
                status: 'Logged out via forced shutdown',
                durationSecs: durationSecs,
                totalHours: totalHours
              });

              const studentDoc = studentsList.find(s => (s.name || '').toLowerCase() === (pc.currentUser || '').toLowerCase());
              if (studentDoc) {
                const newTotalSecs = (studentDoc.totalSeconds || 0) + durationSecs;
                const newTotalHours = Number((newTotalSecs / 3600).toFixed(2));
                await updateDocument('students', studentDoc.id, {
                  totalSeconds: newTotalSecs,
                  totalHours: newTotalHours,
                  lastLogoutTime: new Date().toISOString()
                });
              }

              await updateDocument('computers', pc.id, {
                status: 'offline',
                lastLogoutStatus: 'Logged out via forced shutdown',
                currentUser: null,
                currentMode: null,
                currentTask: null,
                startTime: null,
                lastActive: new Date().toISOString(),
                message: null
              });
            } catch (err) {
              console.error('Watchdog error:', err);
            }
          }
        }
      });
    }, 15000);

    return () => clearInterval(watchdog);
  }, [computers, studentsList]);

  // Force reset computer session
  const handleResetSession = async (pcId) => {
    if (confirm(`Force logout active session on workstation ${pcId}?`)) {
      try {
        await updateDocument('computers', pcId, {
          status: 'offline',
          currentUser: null,
          currentMode: null,
          currentTask: null,
          currentSession: null,
          startTime: null,
          lastActive: new Date().toISOString()
        });
      } catch (err) {
        console.error(`Failed to reset session on ${pcId}:`, err);
      }
    }
  };

  // Helper icons for modes
  const getModeIcon = (modeName) => {
    if (!modeName) return null;
    switch(modeName.toLowerCase()) {
      case 'academic': 
        return <GraduationCap className="h-3.5 w-3.5 text-studio-accent-blue" />;
      case 'production': 
        return <Film className="h-3.5 w-3.5 text-studio-accent-purple" />;
      case 'research': 
        return <BookOpen className="h-3.5 w-3.5 text-studio-accent-green" />;
      case 'genai lab':
        return <Sparkles className="h-3.5 w-3.5 text-amber-400" />;
      default: 
        return <Sparkles className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  // Occupancy metrics
  const totalPCs = computers.length;
  const activeCount = computers.filter(c => c.status === 'online').length;
  const idleCount = totalPCs - activeCount;
  
  const academicCount = computers.filter(c => c.status === 'online' && c.currentMode?.toLowerCase() === 'academic').length;
  const productionCount = computers.filter(c => c.status === 'online' && c.currentMode?.toLowerCase() === 'production').length;
  const researchCount = computers.filter(c => c.status === 'online' && c.currentMode?.toLowerCase() === 'research').length;
  const genaiCount = computers.filter(c => c.status === 'online' && (c.currentMode?.toLowerCase().includes('genai') || c.currentMode?.toLowerCase().includes('nail'))).length;

  // Filter & Search logic
  const filteredComputers = computers.filter((pc) => {
    const matchesSearch = 
      pc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pc.currentUser && pc.currentUser.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesMode = true;
    if (filterMode === 'active') {
      matchesMode = pc.status === 'online';
    } else if (filterMode === 'offline') {
      matchesMode = pc.status === 'offline';
    } else if (filterMode === 'academic') {
      matchesMode = pc.status === 'online' && pc.currentMode?.toLowerCase() === 'academic';
    } else if (filterMode === 'production') {
      matchesMode = pc.status === 'online' && pc.currentMode?.toLowerCase() === 'production';
    } else if (filterMode === 'research') {
      matchesMode = pc.status === 'online' && pc.currentMode?.toLowerCase() === 'research';
    } else if (filterMode === 'custom') {
      matchesMode = pc.status === 'online' && (pc.currentMode?.toLowerCase().includes('genai') || pc.currentMode?.toLowerCase().includes('nail'));
    }

    return matchesSearch && matchesMode;
  });

  // Modal logs query
  const pcLogs = logs.filter(log => log.computerId === selectedPC);
  const studentLogs = logs.filter(log => (log.studentId || '').toLowerCase() === (selectedStudentHistory || '').toLowerCase());
  const currentLogs = historyTab === 'student' ? studentLogs : pcLogs;

  // Date filter logic
  const filteredLogs = currentLogs.filter(log => {
    if (!log.startTime) return false;
    
    let dateObj;
    if (log.startTime && typeof log.startTime === 'object' && log.startTime.seconds !== undefined) {
      dateObj = new Date(log.startTime.seconds * 1000);
    } else if (log.startTime && typeof log.startTime.toDate === 'function') {
      dateObj = log.startTime.toDate();
    } else {
      dateObj = new Date(log.startTime);
    }

    if (isNaN(dateObj.getTime())) return false;

    // Convert to local YYYY-MM-DD string to align with date input fields
    const localYear = dateObj.getFullYear();
    const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const localDay = String(dateObj.getDate()).padStart(2, '0');
    const logLocalDateStr = `${localYear}-${localMonth}-${localDay}`;

    return logLocalDateStr >= startDate && logLocalDateStr <= endDate;
  });

  const lastLogin = currentLogs[0] || null; // Most recent session details

  // Helper calculation: exact duration and hours for a log entry (no idle time calculated/deducted)
  const getLogDurationSecs = (log) => {
    if (log.durationSecs !== undefined && !isNaN(log.durationSecs) && Number(log.durationSecs) > 0) {
      return Number(log.durationSecs);
    }
    if (log.totalHours !== undefined && !isNaN(log.totalHours) && Number(log.totalHours) > 0) {
      return Math.round(Number(log.totalHours) * 3600);
    }
    if (!log.startTime) return 0;
    const start = new Date(log.startTime).getTime();
    const end = log.endTime ? new Date(log.endTime).getTime() : Date.now();
    if (isNaN(start) || isNaN(end)) return 0;
    return Math.max(0, Math.floor((end - start) / 1000));
  };

  const formatSecsToHrsMins = (totalSecs) => {
    if (!totalSecs || isNaN(totalSecs) || totalSecs <= 0) return '0 hr 0 min';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs === 0 && mins === 0 && totalSecs > 0) return '< 1 min';
    return `${hrs} hr ${mins} min`;
  };

  const getLogTotalHours = (log) => {
    const secs = getLogDurationSecs(log);
    return formatSecsToHrsMins(secs);
  };

  const totalFilteredSecs = filteredLogs.reduce((acc, log) => acc + getLogDurationSecs(log), 0);
  const totalFilteredHours = formatSecsToHrsMins(totalFilteredSecs);
  const totalFilteredHoursInt = Math.floor(totalFilteredSecs / 3600);
  const totalFilteredMinsInt = Math.floor((totalFilteredSecs % 3600) / 60);

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

  // Helper calculation: count number of days inside selected date interval
  const getSelectedDaysCount = (startStr, endStr) => {
    if (!startStr || !endStr) return 1;
    const s = new Date(startStr + 'T00:00:00');
    const e = new Date(endStr + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
    return Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
  };

  const getValidNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return (!isNaN(n) && n > 0) ? n : null;
  };

  // ----------------------------------------------------
  // GENERATE & DOWNLOAD PDF REPORT (A4 portrait size)
  // ----------------------------------------------------
  const handleDownloadPDF = () => {
    const isStudentReport = historyTab === 'student';
    const targetTitle = isStudentReport ? (selectedStudentHistory || 'Student') : (selectedPC || 'Workstation');
    if (!targetTitle) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker blocked report generation. Please allow popups.');
      return;
    }

    const reportDateStr = new Date().toLocaleDateString();
    const studentInfo = isStudentReport ? studentsList.find(s => (s.name || '').trim().toLowerCase() === (selectedStudentHistory || '').trim().toLowerCase()) : null;
    const batchNameTrimmed = (studentInfo?.batch || '').trim().toLowerCase();
    const batchInfo = isStudentReport ? batchesList.find(b => (b.batchName || b.name || '').trim().toLowerCase() === batchNameTrimmed) : null;
    const acadGuideline = isStudentReport ? academicSettingsList.find(a => (a.id || '').trim().toLowerCase() === batchNameTrimmed || (a.batchName || '').trim().toLowerCase() === batchNameTrimmed) : null;
    const topicsHours = isStudentReport ? getTopicsTotalAllocatedHours(acadGuideline?.topics || []) : 0;
    const anyAcadWithTopics = isStudentReport ? academicSettingsList.find(a => getTopicsTotalAllocatedHours(a.topics || []) > 0 || Number(a.allottedHours) > 0) : null;
    const fallbackTopicsHours = anyAcadWithTopics ? getTopicsTotalAllocatedHours(anyAcadWithTopics.topics || []) : 0;
    const fallbackAcadHours = anyAcadWithTopics ? getValidNum(anyAcadWithTopics.allottedHours) : null;

    const baseAllottedHoursNum = isStudentReport ? Number(
      (batchInfo?.useSessionTimes && getSessionTimesTotalHours(batchInfo) > 0)
        ? getSessionTimesTotalHours(batchInfo)
        : (
          getValidNum(studentInfo?.allottedHours) ?? 
          getValidNum(studentInfo?.allocatedHours) ?? 
          getValidNum(acadGuideline?.allottedHours) ?? 
          getValidNum(acadGuideline?.allocatedHours) ?? 
          getValidNum(acadGuideline?.totalAllocatedHours) ?? 
          getValidNum(batchInfo?.allottedHours) ?? 
          getValidNum(batchInfo?.allocatedHours) ?? 
          (topicsHours > 0 ? topicsHours : null) ?? 
          fallbackAcadHours ?? 
          (fallbackTopicsHours > 0 ? fallbackTopicsHours : 0)
        )
    ) : 0;
    const daysSelected = getSelectedDaysCount(startDate, endDate);
    const allottedHoursNum = Number((baseAllottedHoursNum * daysSelected).toFixed(2));
    const allottedSecs = Math.round(allottedHoursNum * 3600);
    const studentLogs = isStudentReport ? logs.filter(l => (l.studentId || l.studentName || '').toLowerCase() === (selectedStudentHistory || '').toLowerCase()) : [];
    const dateFilteredLogs = studentLogs.filter(log => {
      if (!log.startTime) return false;
      let dateObj = (log.startTime && typeof log.startTime === 'object' && log.startTime.seconds !== undefined)
        ? new Date(log.startTime.seconds * 1000)
        : (log.startTime && typeof log.startTime.toDate === 'function')
          ? log.startTime.toDate()
          : new Date(log.startTime);
      if (isNaN(dateObj.getTime())) return false;
      const localYear = dateObj.getFullYear();
      const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const localDay = String(dateObj.getDate()).padStart(2, '0');
      const logLocalDateStr = `${localYear}-${localMonth}-${localDay}`;
      return logLocalDateStr >= startDate && logLocalDateStr <= endDate;
    });
    const dateFilteredSecs = dateFilteredLogs.reduce((acc, l) => acc + getLogDurationSecs(l), 0);
    const allTimeSecs = isStudentReport ? dateFilteredSecs : 0;
    const allTimeHrsMins = formatSecsToHrsMins(allTimeSecs);
    const diffSecs = allottedSecs - allTimeSecs;
    const diffStr = `${formatSecsToHrsMins(Math.abs(diffSecs))} (Time Lapsed)`;
    
    // Style and markup content
    let htmlContent = `
      <html>
      <head>
        <title>${targetTitle} - Login History & Total Hours Report</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            line-height: 1.5;
          }
          @page {
            size: A4 portrait;
            margin: 20mm;
          }
          .header {
            border-bottom: 2px solid #6366f1;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            color: #1e1b4b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .subtitle {
            font-size: 10px;
            color: #64748b;
            margin: 4px 0 0 0;
            font-weight: 500;
          }
          .metadata-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
          }
          .metadata-table td {
            padding: 4px 0;
            font-size: 10px;
          }
          .metadata-label {
            font-weight: bold;
            color: #475569;
            width: 130px;
          }
          .metadata-value {
            color: #0f172a;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            color: #312e81;
            margin-bottom: 8px;
            text-transform: uppercase;
            border-left: 3px solid #6366f1;
            padding-left: 6px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 30px;
          }
          .data-table th {
            background-color: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 8px 10px;
            font-weight: bold;
            border-bottom: 1.5px solid #cbd5e1;
            font-size: 9px;
            text-transform: uppercase;
          }
          .data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 9px;
          }
          .data-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 15px;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
          }
          .sign-area {
            margin-top: 50px;
            display: flex;
            justify-content: justify;
            width: 100%;
          }
          .sign-box {
            text-align: center;
            width: 150px;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
            font-size: 9px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">VFX & Animation AI Lab</h1>
          <p class="subtitle">${isStudentReport ? 'Student Session History & Total Hours Report' : 'System Usage & Workstation Telemetry Report'}</p>
        </div>

        <table class="metadata-table">
          ${isStudentReport ? `
          <tr>
            <td class="metadata-label">Student Name:</td>
            <td class="metadata-value"><strong>${selectedStudentHistory}</strong></td>
            <td class="metadata-label">Generated Date:</td>
            <td class="metadata-value">${reportDateStr}</td>
          </tr>
          <tr>
            <td class="metadata-label">Assigned Batch:</td>
            <td class="metadata-value">${studentInfo?.batch || 'N/A'}</td>
            <td class="metadata-label">Report Date Filter:</td>
            <td class="metadata-value">${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td class="metadata-label">Allotted (HOD Allocated):</td>
            <td class="metadata-value"><strong>${allottedHoursNum} hr 0 min</strong></td>
            <td class="metadata-label">Actual (Student Total):</td>
            <td class="metadata-value"><strong>${allTimeSecs > 0 ? allTimeHrsMins : totalFilteredHours}</strong></td>
          </tr>
          <tr>
            <td class="metadata-label">Time (Lapsed):</td>
            <td class="metadata-value" style="color: ${diffSecs >= 0 ? '#047857' : '#b91c1c'};" colspan="3"><strong>${diffStr}</strong> &bull; <em>Allotted - Actual = ${formatSecsToHrsMins(Math.abs(diffSecs))}</em></td>
          </tr>
          ` : `
          <tr>
            <td class="metadata-label">Workstation ID:</td>
            <td class="metadata-value"><strong>${selectedPC}</strong></td>
            <td class="metadata-label">Generated Date:</td>
            <td class="metadata-value">${reportDateStr}</td>
          </tr>
          <tr>
            <td class="metadata-label">Report Date Filter:</td>
            <td class="metadata-value">${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</td>
            <td class="metadata-label">Recorded Sessions:</td>
            <td class="metadata-value">${filteredLogs.length} entries</td>
          </tr>
          <tr>
            <td class="metadata-label">Total Time Used:</td>
            <td class="metadata-value" colspan="3"><strong>${totalFilteredHours}</strong> &bull; <em>No idle deduction</em></td>
          </tr>
          `}
        </table>

        <h2 class="section-title">Session Telemetry & Total Hours Sheet</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 18%">${isStudentReport ? 'Workstation ID' : 'Student Name'}</th>
              <th style="width: 13%">Date</th>
              <th style="width: 13%">Login Time</th>
              <th style="width: 13%">Logout Time</th>
              <th style="width: 13%">Lab Mode</th>
              <th style="width: 12%">Total Time</th>
              <th style="width: 18%">Task / Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredLogs.length === 0) {
      htmlContent += `
        <tr>
          <td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">
            No usage logs recorded during the selected date interval.
          </td>
        </tr>
      `;
    } else {
      filteredLogs.forEach(log => {
        const dateStr = log.startTime ? new Date(log.startTime).toLocaleDateString() : 'N/A';
        const logInStr = log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const logOutStr = log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
        const hoursUsed = getLogTotalHours(log);
        const col1 = isStudentReport ? (log.computerId || 'Unknown') : (log.studentId || 'Unknown');
        const taskOrStatus = (log.taskDesc ? log.taskDesc + ' (' + (log.status || 'Normal Logout') + ')' : (log.status || 'Normal Logout'));
        
        htmlContent += `
          <tr>
            <td><strong>${col1}</strong></td>
            <td>${dateStr}</td>
            <td>${logInStr}</td>
            <td>${logOutStr}</td>
            <td>${log.mode || 'N/A'}</td>
            <td><strong>${hoursUsed}</strong></td>
            <td>${taskOrStatus}</td>
          </tr>
        `;
      });
    }

    htmlContent += `
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #6366f1;">
              <td colspan="5" style="text-align: right; padding: 10px; color: #1e293b;">TOTAL TIME USED:</td>
              <td colspan="2" style="padding: 10px; color: #312e81;"><strong>${totalFilteredHours}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div class="sign-box" style="float: left;">Lab Assistant Signature</div>
          <div class="sign-box" style="float: right;">HOD Administrator Signature</div>
          <div style="clear: both;"></div>
        </div>

        <div class="footer">
          This document is generated automatically from the PIVOT database. Page 1 of 1.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Trigger window printing dialogue
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleShowHistory = (pcId) => {
    setHistoryTab('computer');
    setSelectedPC(pcId);
    setHistoryOpen(true);
  };

  const handleShowStudentHistory = (studentName) => {
    setHistoryTab('student');
    setSelectedStudentHistory(studentName);
    setHistoryOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messagingPC) return;
    try {
      await updateDocument('computers', messagingPC, {
        message: {
          id: `msg-${Date.now()}`,
          text: messageText.trim(),
          timestamp: new Date().toISOString()
        }
      });
      setMessagingPC(null);
      setMessageText('');
    } catch (err) {
      console.error(`Failed to send message to ${messagingPC}:`, err);
    }
  };

  const handleSendGroupMessage = async () => {
    if (!groupMessageText.trim() || isSendingGroup) return;
    setIsSendingGroup(true);
    try {
      const targetPCs = computers.filter(pc => {
        if (pc.status !== 'online') return false;
        if (groupTargetMode === 'all') return true;
        if (groupTargetMode === 'academic') return pc.currentMode?.toLowerCase() === 'academic';
        if (groupTargetMode === 'production') return pc.currentMode?.toLowerCase() === 'production';
        if (groupTargetMode === 'research') return pc.currentMode?.toLowerCase() === 'research';
        if (groupTargetMode === 'genai') return pc.currentMode?.toLowerCase().includes('genai') || pc.currentMode?.toLowerCase().includes('nail');
        if (groupTargetMode.startsWith('batch:')) {
          const targetBatch = groupTargetMode.slice(6).toLowerCase().trim();
          const pcBatch = getPCBatch(pc).toLowerCase().trim();
          return pcBatch === targetBatch;
        }
        return false;
      });

      if (targetPCs.length === 0) {
        alert('No online workstations match the selected group mode.');
        setIsSendingGroup(false);
        return;
      }

      await Promise.all(targetPCs.map(pc => 
        updateDocument('computers', pc.id, {
          message: {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            text: groupMessageText.trim(),
            timestamp: new Date().toISOString()
          }
        })
      ));

      alert(`Group message successfully broadcast to ${targetPCs.length} online workstation(s)!`);
      setShowGroupMessageModal(false);
      setGroupMessageText('');
    } catch (err) {
      console.error('Failed to send group message:', err);
      alert('Failed to send group message. Check console.');
    } finally {
      setIsSendingGroup(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Occupancy & Lab Statistics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Occupancy card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Lab Occupancy</span>
            <h4 className="text-2xl font-extrabold text-white mt-1.5">{activeCount} / {totalPCs}</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{idleCount} workstations idle</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-studio-accent-purple/10 flex items-center justify-center border border-studio-accent-purple/20 text-studio-accent-purple animate-pulse">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        {/* Academic Active Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between hover-glow">
          <div>
            <span className="text-[10px] font-bold text-studio-accent-blue/80 uppercase tracking-widest leading-none">Academic</span>
            <h4 className="text-2xl font-extrabold text-white mt-1.5">{academicCount} Active</h4>
            <p className="text-[10px] text-slate-500 mt-1">Syllabus lessons</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-studio-accent-blue/10 flex items-center justify-center border border-studio-accent-blue/20 text-studio-accent-blue">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        {/* Production Active Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between hover-glow">
          <div>
            <span className="text-[10px] font-bold text-studio-accent-purple/80 uppercase tracking-widest leading-none">Production</span>
            <h4 className="text-2xl font-extrabold text-white mt-1.5">{productionCount} Active</h4>
            <p className="text-[10px] text-slate-500 mt-1">Pipeline tasks</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-studio-accent-purple/10 flex items-center justify-center border border-studio-accent-purple/20 text-studio-accent-purple">
            <Film className="h-5 w-5" />
          </div>
        </div>

        {/* Research Active Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between hover-glow">
          <div>
            <span className="text-[10px] font-bold text-studio-accent-green/80 uppercase tracking-widest leading-none">Research</span>
            <h4 className="text-2xl font-extrabold text-white mt-1.5">{researchCount} Active</h4>
            <p className="text-[10px] text-slate-500 mt-1">AI R&D assignments</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-studio-accent-green/10 flex items-center justify-center border border-studio-accent-green/20 text-studio-accent-green">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        {/* GenAI Lab Active Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between hover-glow">
          <div>
            <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest leading-none">GenAI Lab</span>
            <h4 className="text-2xl font-extrabold text-white mt-1.5">{genaiCount} Active</h4>
            <p className="text-[10px] text-slate-500 mt-1">Generative media</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 2. Search & Tab-Filtering Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-studio-900/60 p-4 border border-white/5 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 h-4 w-4 my-auto" />
          <input
            type="text"
            placeholder="Search PC-01 or Student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl studio-input text-slate-100 placeholder:text-slate-650 text-xs"
          />
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Workstations' },
            { id: 'active', label: 'Online' },
            { id: 'offline', label: 'Offline' },
            { id: 'academic', label: 'Academic' },
            { id: 'production', label: 'Production' },
            { id: 'research', label: 'Research' },
            { id: 'custom', label: 'GenAI Lab' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                filterMode === tab.id
                  ? 'bg-studio-accent-purple text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-studio-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="h-4 w-[1px] bg-white/10 mx-1 hidden sm:block"></div>
          <button
            onClick={() => setShowGroupMessageModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black transition flex items-center gap-1.5 shrink-0 shadow-sm"
            title="Send broadcast message to group or all modes"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Group Message
          </button>
          <button
            onClick={() => {
              setHistoryTab('student');
              if (!selectedStudentHistory && studentsList.length > 0) {
                setSelectedStudentHistory(studentsList[0].name);
              }
              setHistoryOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-studio-accent-purple/15 border border-studio-accent-purple/30 text-studio-accent-purple hover:bg-studio-accent-purple hover:text-white transition flex items-center gap-1.5 shrink-0 shadow-sm"
            title="View student history records & total hours used"
          >
            <History className="h-3.5 w-3.5" />
            Students History Records
          </button>
        </div>
      </div>

      {/* 3. Workstations Grid */}
      {filteredComputers.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center border border-white/5">
          <Tv className="h-10 w-10 mx-auto text-slate-600 opacity-40 mb-3" />
          <p className="font-semibold text-slate-455 text-sm">No workstations found</p>
          <p className="text-xs text-slate-600 mt-1">Try adjusting your search terms or filter selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredComputers.map((pc) => {
            const isOnline = pc.status === 'online';
            return (
              <div 
                key={pc.id}
                className={`glass-panel p-5 rounded-2xl border transition duration-300 relative group flex flex-col justify-between h-52 hover-glow ${
                  isOnline 
                    ? pc.isRendering
                      ? 'border-amber-500/30 shadow-glow-amber/10 bg-gradient-to-b from-studio-900 to-amber-500/[0.04]'
                      : 'border-emerald-500/20 shadow-glow-green/5 bg-gradient-to-b from-studio-900 to-emerald-500/[0.02]' 
                    : 'border-white/5'
                }`}
              >
                {/* Header: PC ID & Status Dot */}
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm tracking-wide text-white">{pc.id}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${isOnline ? 'status-dot-active animate-pulse' : 'status-dot-offline'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-400 font-semibold' : 'text-slate-600'}`}>
                      {isOnline ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Body: Session details */}
                <div className="my-4 space-y-2.5 flex-1 flex flex-col justify-center">
                  {isOnline ? (
                    <>
                      {/* Student name */}
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-studio-800 border border-white/5 flex items-center justify-center text-slate-400 shrink-0">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="text-xs font-bold text-slate-200 truncate" title={pc.currentUser}>
                          {pc.currentUser}
                        </span>
                      </div>

                      {/* Mode Indicator badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="px-2 py-0.5 rounded bg-studio-950 border border-white/5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 leading-none">
                          {getModeIcon(pc.currentMode)}
                          <span className="truncate max-w-[90px]">{pc.currentMode}</span>
                        </div>
                        {pc.currentSession && (
                          <div className="px-2 py-0.5 rounded bg-studio-accent-purple/15 border border-studio-accent-purple/20 text-studio-accent-purple font-bold text-[9px] leading-none uppercase tracking-wide">
                            {pc.currentSession}
                          </div>
                        )}
                        {pc.isRendering && (
                          <div className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center gap-1 text-[8px] font-extrabold text-amber-300 leading-none animate-pulse" title="15-min idle auto-logout is paused for long render">
                            <Sparkles className="h-2.5 w-2.5 text-amber-400 animate-spin-slow" />
                            <span>RENDERING</span>
                          </div>
                        )}
                      </div>

                      {/* Active Task description */}
                      <p className="text-[10px] text-slate-400 font-medium italic truncate max-w-full leading-relaxed" title={pc.currentTask}>
                        "{pc.currentTask || 'Working...'}"
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-2 text-slate-600 flex flex-col items-center justify-center gap-1">
                      <HelpCircle className="h-6 w-6 mx-auto opacity-20 mb-0.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Vacant Node</span>
                      {pc.lastLogoutStatus && pc.lastLogoutStatus !== 'Normal Logout' && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                          pc.lastLogoutStatus === 'Shutdown Logout'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            : (pc.lastLogoutStatus === 'Auto Logout' || pc.lastLogoutStatus === 'Logged out via forced shutdown')
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {pc.lastLogoutStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Clock last active / Remote Reset button */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5 shrink-0 font-mono">
                    <Clock className={`h-3 w-3 ${isOnline ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
                    <span className={isOnline ? 'text-emerald-400 font-bold tracking-wider' : 'text-slate-500'}>
                      {isOnline ? formatSessionDuration(pc.startTime || pc.lastActive) : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex gap-1.5 items-center">
                    {isOnline && (
                      <>
                        <button
                          onClick={() => {
                            setMessagingPC(pc.id);
                            setMessageText('');
                          }}
                          className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white transition shrink-0 flex items-center gap-1 leading-none"
                          title="Send Message"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleResetSession(pc.id)}
                          className="p-1.5 rounded bg-studio-accent-red/10 border border-studio-accent-red/20 text-studio-accent-red hover:bg-studio-accent-red hover:text-white transition shrink-0 flex items-center gap-1 leading-none"
                          title="Remote Logout"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. WORKSTATION & STUDENT HISTORY MODAL */}
      {historyOpen && (selectedPC || selectedStudentHistory) && (
        <div className="fixed inset-0 z-50 bg-studio-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow border-studio-accent-purple/20 max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[88vh] relative animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-studio-accent-purple to-transparent"></div>

            {/* Modal Header & Tabs */}
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between bg-studio-900/40 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-studio-accent-purple/10 flex items-center justify-center rounded-xl text-studio-accent-purple">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {historyTab === 'student' ? `Student History: ${selectedStudentHistory || 'Select Student'}` : `Workstation Logs: ${selectedPC || 'Select PC'}`}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Usage Records & Total Time Calculation</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tab Switcher */}
                <div className="flex bg-studio-950 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => {
                      setHistoryTab('computer');
                      if (!selectedPC && computers.length > 0) setSelectedPC(computers[0].id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${historyTab === 'computer' ? 'bg-studio-accent-purple text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Workstation History
                  </button>
                  <button
                    onClick={() => {
                      setHistoryTab('student');
                      if (!selectedStudentHistory && studentsList.length > 0) setSelectedStudentHistory(studentsList[0].name);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${historyTab === 'student' ? 'bg-studio-accent-purple text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Students History Records
                  </button>
                </div>

                <button 
                  onClick={() => setHistoryOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Selector Bar & Highlighted Summary */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    {historyTab === 'student' ? 'Select Student Record' : 'Select Workstation'}
                  </label>
                  {historyTab === 'student' ? (
                    <select
                      value={selectedStudentHistory}
                      onChange={(e) => setSelectedStudentHistory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl studio-input text-slate-100 text-xs font-bold select-dark"
                    >
                      {Array.from(new Set([
                        ...studentsList.map(s => s.name),
                        ...logs.map(l => l.studentId).filter(Boolean)
                      ])).sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedPC}
                      onChange={(e) => setSelectedPC(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl studio-input text-slate-100 text-xs font-bold select-dark"
                    >
                      {computers.map(c => (
                        <option key={c.id} value={c.id}>{c.id} ({c.status === 'online' ? c.currentUser : 'Offline'})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Summary Stat Cards */}
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-studio-900 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total Recorded Sessions</span>
                      <p className="font-extrabold text-white text-lg mt-0.5">{filteredLogs.length} Sessions</p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-studio-accent-purple/10 flex items-center justify-center text-studio-accent-purple">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="p-3.5 bg-studio-accent-purple/10 border border-studio-accent-purple/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-studio-accent-purple uppercase tracking-wide">Total Time Used (No Idle Deduction)</span>
                      <p className="font-extrabold text-white text-lg mt-0.5">{totalFilteredHours} Hours</p>
                      <p className="text-[9px] text-slate-400 font-medium">{totalFilteredHoursInt}h {totalFilteredMinsInt}m exact duration</p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-studio-accent-purple/20 flex items-center justify-center text-studio-accent-purple animate-pulse">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlighted Last Session / Student Details */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {historyTab === 'student' ? 'Student Profile & Cumulative Telemetry' : 'Most Recent Session Details'}
                </span>
                
                {historyTab === 'student' ? (() => {
                  const studentInfo = studentsList.find(s => (s.name || '').trim().toLowerCase() === (selectedStudentHistory || '').trim().toLowerCase());
                  const batchNameTrimmed = (studentInfo?.batch || '').trim().toLowerCase();
                  const batchInfo = batchesList.find(b => (b.batchName || b.name || '').trim().toLowerCase() === batchNameTrimmed);
                  const acadGuideline = academicSettingsList.find(a => (a.id || '').trim().toLowerCase() === batchNameTrimmed || (a.batchName || '').trim().toLowerCase() === batchNameTrimmed);
                  const topicsHours = getTopicsTotalAllocatedHours(acadGuideline?.topics || []);
                  const anyAcadWithTopics = academicSettingsList.find(a => getTopicsTotalAllocatedHours(a.topics || []) > 0 || Number(a.allottedHours) > 0);
                  const fallbackTopicsHours = anyAcadWithTopics ? getTopicsTotalAllocatedHours(anyAcadWithTopics.topics || []) : 0;
                  const fallbackAcadHours = anyAcadWithTopics ? getValidNum(anyAcadWithTopics.allottedHours) : null;

                  const baseAllottedHoursNum = Number(
                    (batchInfo?.useSessionTimes && getSessionTimesTotalHours(batchInfo) > 0)
                      ? getSessionTimesTotalHours(batchInfo)
                      : (
                        getValidNum(studentInfo?.allottedHours) ?? 
                        getValidNum(studentInfo?.allocatedHours) ?? 
                        getValidNum(acadGuideline?.allottedHours) ?? 
                        getValidNum(acadGuideline?.allocatedHours) ?? 
                        getValidNum(acadGuideline?.totalAllocatedHours) ?? 
                        getValidNum(batchInfo?.allottedHours) ?? 
                        getValidNum(batchInfo?.allocatedHours) ?? 
                        (topicsHours > 0 ? topicsHours : null) ?? 
                        fallbackAcadHours ?? 
                        (fallbackTopicsHours > 0 ? fallbackTopicsHours : 0)
                      )
                  );
                  const daysSelected = getSelectedDaysCount(startDate, endDate);
                  const allottedHoursNum = Number((baseAllottedHoursNum * daysSelected).toFixed(2));
                  const allottedSecs = Math.round(allottedHoursNum * 3600);
                  const actualSecs = totalFilteredSecs;
                  const actualHrsMins = totalFilteredHours;
                  const diffSecs = allottedSecs - actualSecs;

                  return (
                    <div className="p-4 bg-studio-900 border border-white/5 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Student Name</span>
                        <p className="font-bold text-white mt-0.5">{selectedStudentHistory || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Assigned Batch</span>
                        <p className="font-medium text-studio-accent-purple mt-0.5">{studentInfo?.batch || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Allotted (HOD Allocated)</span>
                        <p className="font-bold font-mono text-white mt-0.5">{allottedHoursNum} hr 0 min</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Actual (Student Total)</span>
                        <p className="font-extrabold font-mono text-studio-accent-purple mt-0.5">{actualHrsMins}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Time (Lapsed)</span>
                        <p className={`font-extrabold font-mono mt-0.5 ${diffSecs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} title="Allotted - Actual (for selected date range)">
                          {formatSecsToHrsMins(Math.abs(diffSecs))} {diffSecs >= 0 ? 'left' : 'over'}
                        </p>
                      </div>
                    </div>
                  );
                })() : (
                  lastLogin ? (
                    <div className="p-4 bg-studio-accent-purple/5 border border-studio-accent-purple/10 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Student</span>
                        <p className="font-bold text-white mt-0.5">{lastLogin.studentId}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Date</span>
                        <p className="font-medium text-slate-300 mt-0.5">
                          {lastLogin.startTime ? new Date(lastLogin.startTime).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Timings</span>
                        <p className="font-medium text-slate-300 mt-0.5">
                          {lastLogin.startTime ? new Date(lastLogin.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} - {lastLogin.endTime ? new Date(lastLogin.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Total Hours</span>
                        <p className="font-bold text-studio-accent-purple mt-0.5">{getLogTotalHours(lastLogin)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Mode</span>
                        <p className="font-semibold text-slate-200 mt-0.5">{lastLogin.mode}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Status</span>
                        <p className={`font-bold mt-0.5 ${
                          lastLogin.status === 'Shutdown Logout' ? 'text-amber-400' :
                          (lastLogin.status === 'Auto Logout' || lastLogin.status === 'Logged out via forced shutdown') ? 'text-rose-400' :
                          'text-emerald-400'
                        }`}>
                          {lastLogin.status || 'Normal Logout'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-studio-900 border border-white/5 rounded-2xl text-center text-xs text-slate-500">
                      No session logs found for this workstation.
                    </div>
                  )
                )}
              </div>

              {/* Date Filters & PDF Button */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Interval Filter & Reports</span>
                
                <div className="p-4 bg-studio-900 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Start date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-1.5 bg-studio-950 border border-white/5 text-slate-300 rounded-lg text-xs w-full sm:w-auto font-medium"
                      />
                    </div>
                    
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">End date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-1.5 bg-studio-950 border border-white/5 text-slate-300 rounded-lg text-xs w-full sm:w-auto font-medium"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF Report
                  </button>
                </div>
              </div>

              {/* Table list of logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">History Records ({filteredLogs.length})</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Total Time: {totalFilteredHours} (no idle time calculated)</span>
                </div>
                
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-studio-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-studio-950 border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-450">
                        <th className="p-3">{historyTab === 'student' ? 'Workstation ID' : 'Student Name'}</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Login</th>
                        <th className="p-3">Logout</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Total Time</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-6 text-center text-slate-550 italic">
                            No logs found matching selected date interval.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log, index) => {
                          const dateStr = log.startTime ? new Date(log.startTime).toLocaleDateString() : 'N/A';
                          const loginTime = log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                          const logoutTime = log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
                          const hoursUsed = getLogTotalHours(log);
                          
                          return (
                            <tr key={index} className="hover:bg-white/[0.01]">
                              <td className="p-3 text-white font-bold">
                                {historyTab === 'student' ? (log.computerId || 'Unknown') : (log.studentId || 'Unknown')}
                              </td>
                              <td className="p-3 text-slate-400">{dateStr}</td>
                              <td className="p-3 text-slate-400">{loginTime}</td>
                              <td className="p-3 text-slate-400">{logoutTime}</td>
                              <td className="p-3 text-slate-300 font-semibold">{log.mode}</td>
                              <td className="p-3 font-mono font-bold text-studio-accent-purple">{hoursUsed}</td>
                              <td className="p-3">
                                <span className={`font-bold text-[10px] ${
                                  log.status === 'Shutdown Logout' ? 'text-amber-400' :
                                  (log.status?.includes('Auto Logout') || log.status === 'Logged out via forced shutdown') ? 'text-rose-400' :
                                  'text-slate-400'
                                }`}>
                                  {log.status || 'Normal Logout'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredLogs.length > 0 && (
                      <tfoot className="bg-studio-950 border-t border-white/5">
                        <tr>
                          <td colSpan="5" className="p-3 text-right font-bold text-[11px] text-slate-400">
                            TOTAL TIME USED:
                          </td>
                          <td colSpan="2" className="p-3 font-mono font-extrabold text-emerald-400 text-sm">
                            {totalFilteredHours}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/5 bg-studio-900/40 flex justify-end">
              <button
                onClick={() => setHistoryOpen(false)}
                className="px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-xl text-xs font-bold transition border border-white/5"
              >
                Close Logs Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. WORKSTATION SEND MESSAGE MODAL */}
      {messagingPC && (
        <div className="fixed inset-0 z-50 bg-studio-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow border-amber-500/20 max-w-md w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between relative animate-fade-in p-6 space-y-4">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-amber-500/10 flex items-center justify-center rounded-xl text-amber-400">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Send Message</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Target Workstation: {messagingPC}</p>
                </div>
              </div>
              <button 
                onClick={() => setMessagingPC(null)}
                className="p-1.5 text-slate-450 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Content</label>
              <textarea
                placeholder="Type message here (e.g. Save your files, lab closing in 10 minutes)..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full h-24 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs resize-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setMessagingPC(null)}
                className="px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-xl text-xs font-bold transition border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GROUP MESSAGE / BROADCAST MODAL */}
      {showGroupMessageModal && (
        <div className="fixed inset-0 z-50 bg-studio-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow border-amber-500/30 max-w-md w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between relative animate-fade-in p-6 space-y-4">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-amber-500/15 flex items-center justify-center rounded-xl text-amber-400">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Send Group Message</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Broadcast to active workstations</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGroupMessageModal(false)}
                className="p-1.5 text-slate-450 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Recipient Mode</label>
              <select
                value={groupTargetMode}
                onChange={(e) => setGroupTargetMode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg studio-input text-slate-100 text-xs select-dark font-medium"
              >
                <optgroup label="By Lab Mode / All Workstations">
                  <option value="all">All Active Workstations ({computers.filter(c => c.status === 'online').length})</option>
                  <option value="academic">Academic Mode ({computers.filter(c => c.status === 'online' && c.currentMode?.toLowerCase() === 'academic').length})</option>
                  <option value="production">Production Mode ({computers.filter(c => c.status === 'online' && c.currentMode?.toLowerCase() === 'production').length})</option>
                  <option value="research">Research Mode ({computers.filter(c => c.status === 'online' && c.currentMode?.toLowerCase() === 'research').length})</option>
                  <option value="genai">GenAI Lab Mode ({computers.filter(c => c.status === 'online' && (c.currentMode?.toLowerCase().includes('genai') || c.currentMode?.toLowerCase().includes('nail'))).length})</option>
                </optgroup>

                {getAvailableBatches().length > 0 && (
                  <optgroup label="By Student Batch (Batchwise)">
                    {getAvailableBatches().map(batchName => {
                      const count = computers.filter(c => c.status === 'online' && getPCBatch(c).toLowerCase().trim() === batchName.toLowerCase().trim()).length;
                      return (
                        <option key={batchName} value={`batch:${batchName}`}>
                          Batch: {batchName} ({count} active)
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Content</label>
              <textarea
                placeholder="Type group announcement here..."
                value={groupMessageText}
                onChange={(e) => setGroupMessageText(e.target.value)}
                className="w-full h-24 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs resize-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowGroupMessageModal(false)}
                className="px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-xl text-xs font-bold transition border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSendGroupMessage}
                disabled={isSendingGroup || !groupMessageText.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition disabled:opacity-50"
              >
                {isSendingGroup ? 'Sending...' : 'Broadcast Message'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MonitoringGrid;