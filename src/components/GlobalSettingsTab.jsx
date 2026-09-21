import React, { useState, useEffect } from 'react';
import { 
  subscribeCollection, 
  addDocument, 
  updateDocument, 
  deleteDocument 
} from '../firebase';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Users, 
  Layers, 
  Sliders, 
  GraduationCap, 
  Film, 
  BookOpen, 
  AlertTriangle,
  Sparkles,
  Tv,
  Cpu,
  Monitor
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

function GlobalSettingsTab() {
  // Collection States
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [modes, setModes] = useState([]);
  const [academicSettingsList, setAcademicSettingsList] = useState([]);

  // Form inputs
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchAllotted, setNewBatchAllotted] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBatch, setNewStudentBatch] = useState('');
  const [newStudentAllotted, setNewStudentAllotted] = useState('');
  const [newModeName, setNewModeName] = useState('');

  // Workstation Form inputs
  const [newWsName, setNewWsName] = useState('');
  const [newWsGpu, setNewWsGpu] = useState('');
  const [newWsVram, setNewWsVram] = useState('');
  const [newWsRam, setNewWsRam] = useState('');
  const [newWsProcessor, setNewWsProcessor] = useState('');

  // Inline editing states
  const [editBatchId, setEditBatchId] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchAllotted, setEditBatchAllotted] = useState('');

  const [editStudentId, setEditStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentBatch, setEditStudentBatch] = useState('');
  const [editStudentAllotted, setEditStudentAllotted] = useState('');

  // Workstation Inline editing states
  const [editWsId, setEditWsId] = useState(null);
  const [editWsName, setEditWsName] = useState('');
  const [editWsGpu, setEditWsGpu] = useState('');
  const [editWsVram, setEditWsVram] = useState('');
  const [editWsRam, setEditWsRam] = useState('');
  const [editWsProcessor, setEditWsProcessor] = useState('');

  // Search & Filter States
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentBatchFilter, setStudentBatchFilter] = useState('all');

  // Subscriptions
  useEffect(() => {
    const unsubBatches = subscribeCollection('batches', (data) => {
      // Sort batches alphabetically
      const sorted = [...data].sort((a, b) => a.batchName.localeCompare(b.batchName));
      setBatches(sorted);
      if (sorted.length > 0 && !newStudentBatch) {
        setNewStudentBatch(sorted[0].batchName);
      }
    });

    const unsubStudents = subscribeCollection('students', (data) => {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setStudents(sorted);
    });

    const unsubWorkstations = subscribeCollection('computers', (data) => {
      const sorted = [...(data || [])].map(c => ({
        ...c,
        name: c.name || c.id
      })).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
      setWorkstations(sorted);
    });

    const unsubModes = subscribeCollection('modes', (data) => {
      setModes(data);
    });

    const unsubAcad = subscribeCollection('settings_academic', (data) => {
      setAcademicSettingsList(data || []);
    });

    return () => {
      unsubBatches();
      unsubStudents();
      unsubWorkstations();
      unsubModes();
      unsubAcad();
    };
  }, []);

  const formatStudentTime = (student) => {
    if (student.totalSeconds && !isNaN(student.totalSeconds) && Number(student.totalSeconds) > 0) {
      const totalSecs = Number(student.totalSeconds);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      if (hrs === 0 && mins === 0 && totalSecs > 0) return '< 1 min';
      return `${hrs} hr ${mins} min`;
    }
    if (student.totalHours && !isNaN(student.totalHours) && Number(student.totalHours) > 0) {
      const totalMins = Math.round(Number(student.totalHours) * 60);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hrs} hr ${mins} min`;
    }
    return '0 hr 0 min';
  };

  // ----------------------------------------------------
  // Batch Operations
  // ----------------------------------------------------
  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    // Check for duplicates
    if (batches.some(b => b.batchName.toLowerCase() === newBatchName.trim().toLowerCase())) {
      alert('Batch name already exists.');
      return;
    }

    const masterBatch = batches.find(b => b.sessionTimes && b.sessionTimes.length > 0);
    const commonSessions = masterBatch?.sessionTimes || [
      { name: 'Session 1', timing: '09:30 AM - 10:25 AM' },
      { name: 'Session 2', timing: '10:25 AM - 11:20 AM' },
      { name: 'Session 3', timing: '11:35 AM - 12:30 PM' },
      { name: 'Session 4', timing: '01:15 PM - 02:10 PM' },
      { name: 'Session 5', timing: '02:10 PM - 03:05 PM' },
      { name: 'Session 6', timing: '03:05 PM - 04:15 PM' },
      { name: 'Session 7', timing: '04:15 PM - 06:15 PM' }
    ];
    const commonUseSessions = masterBatch?.useSessionTimes ?? true;

    try {
      await addDocument('batches', { 
        batchName: newBatchName.trim(),
        allottedHours: newBatchAllotted ? Number(newBatchAllotted) : null,
        sessionTimes: commonSessions,
        useSessionTimes: commonUseSessions
      });
      setNewBatchName('');
      setNewBatchAllotted('');
    } catch (err) {
      console.error('Failed to add batch:', err);
      alert('Failed to add batch: ' + err.message);
    }
  };

  const handleStartEditBatch = (batch) => {
    setEditBatchId(batch.id);
    setEditBatchName(batch.batchName);
    setEditBatchAllotted(batch.allottedHours || '');
  };

  const handleSaveBatch = async (id) => {
    if (!editBatchName.trim()) return;
    try {
      await updateDocument('batches', id, { 
        batchName: editBatchName.trim(),
        allottedHours: editBatchAllotted ? Number(editBatchAllotted) : null
      });
      setEditBatchId(null);
    } catch (err) {
      console.error('Failed to update batch:', err);
      alert('Failed to update batch: ' + err.message);
    }
  };

  const handleDeleteBatch = async (id, name) => {
    // Check if students are using this batch
    const hasStudents = students.some(s => s.batch === name);
    if (hasStudents) {
      alert(`Cannot delete batch "${name}". It has registered students. Delete or update those students first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete batch "${name}"?`)) {
      try {
        await deleteDocument('batches', id);
      } catch (err) {
        console.error('Failed to delete batch:', err);
        alert('Failed to delete batch: ' + err.message);
      }
    }
  };

  // ----------------------------------------------------
  // Student Operations
  // ----------------------------------------------------
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentBatch) return;

    try {
      await addDocument('students', {
        name: newStudentName.trim(),
        batch: newStudentBatch,
        allottedHours: newStudentAllotted ? Number(newStudentAllotted) : null
      });
      setNewStudentName('');
      setNewStudentAllotted('');
    } catch (err) {
      console.error('Failed to add student:', err);
      alert('Failed to add student: ' + err.message);
    }
  };

  const handleStartEditStudent = (student) => {
    setEditStudentId(student.id);
    setEditStudentName(student.name);
    setEditStudentBatch(student.batch);
    setEditStudentAllotted(student.allottedHours || '');
  };

  const handleSaveStudent = async (id) => {
    if (!editStudentName.trim() || !editStudentBatch) return;
    try {
      await updateDocument('students', id, {
        name: editStudentName.trim(),
        batch: editStudentBatch,
        allottedHours: editStudentAllotted ? Number(editStudentAllotted) : null
      });
      setEditStudentId(null);
    } catch (err) {
      console.error('Failed to update student:', err);
      alert('Failed to update student: ' + err.message);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (confirm(`Are you sure you want to delete student "${name}"?`)) {
      try {
        await deleteDocument('students', id);
      } catch (err) {
        console.error('Failed to delete student:', err);
        alert('Failed to delete student: ' + err.message);
      }
    }
  };

  // ----------------------------------------------------
  // Workstation Operations
  // ----------------------------------------------------
  const handleAddWorkstation = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    const wsName = newWsName.trim();

    if (workstations.some(w => (w.name || w.id || '').toLowerCase() === wsName.toLowerCase())) {
      alert('Workstation name already exists.');
      return;
    }

    try {
      await updateDocument('computers', wsName, {
        id: wsName,
        name: wsName,
        gpu: newWsGpu.trim() || '',
        vram: newWsVram.trim() || '',
        ram: newWsRam.trim() || '',
        processor: newWsProcessor.trim() || '',
        status: 'offline'
      });
      setNewWsName('');
      setNewWsGpu('');
      setNewWsVram('');
      setNewWsRam('');
      setNewWsProcessor('');
    } catch (err) {
      console.error('Failed to add workstation:', err);
      alert('Failed to add workstation: ' + err.message);
    }
  };

  const handleStartEditWorkstation = (ws) => {
    setEditWsId(ws.id);
    setEditWsName(ws.name || ws.id || '');
    setEditWsGpu(ws.gpu || '');
    setEditWsVram(ws.vram || '');
    setEditWsRam(ws.ram || '');
    setEditWsProcessor(ws.processor || '');
  };

  const handleSaveWorkstation = async (id) => {
    if (!editWsName.trim()) return;
    try {
      await updateDocument('computers', id, {
        name: editWsName.trim(),
        gpu: editWsGpu.trim() || '',
        vram: editWsVram.trim() || '',
        ram: editWsRam.trim() || '',
        processor: editWsProcessor.trim() || ''
      });
      setEditWsId(null);
    } catch (err) {
      console.error('Failed to update workstation:', err);
      alert('Failed to update workstation: ' + err.message);
    }
  };

  const handleDeleteWorkstation = async (id, name) => {
    if (confirm(`Are you sure you want to delete workstation "${name}"?`)) {
      try {
        await deleteDocument('computers', id);
      } catch (err) {
        console.error('Failed to delete workstation:', err);
        alert('Failed to delete workstation: ' + err.message);
      }
    }
  };

  // ----------------------------------------------------
  // Mode Operations
  // ----------------------------------------------------
  const handleAddMode = async (e) => {
    e.preventDefault();
    if (!newModeName.trim()) return;

    // Check for duplicates
    if (modes.some(m => m.modeName.toLowerCase() === newModeName.trim().toLowerCase())) {
      alert('Mode name already exists.');
      return;
    }

    try {
      await addDocument('modes', {
        modeName: newModeName.trim(),
        isCustom: true
      });
      setNewModeName('');
    } catch (err) {
      console.error('Failed to add custom mode:', err);
    }
  };

  const handleDeleteMode = async (id, name) => {
    if (confirm(`Are you sure you want to delete custom mode "${name}"?`)) {
      try {
        await deleteDocument('modes', id);
      } catch (err) {
        console.error('Failed to delete mode:', err);
      }
    }
  };

  // Helper to get modes icons
  const getModeIcon = (modeName) => {
    switch(modeName.toLowerCase()) {
      case 'academic': return <GraduationCap className="h-4 w-4 text-studio-accent-blue" />;
      case 'production': return <Film className="h-4 w-4 text-studio-accent-purple" />;
      case 'genai lab': return <Sparkles className="h-4 w-4 text-amber-400" />;
      default: return <Sliders className="h-4 w-4 text-slate-400" />;
    }
  };

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

  const filteredStudentsList = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
    const matchesBatch = studentBatchFilter === 'all' || student.batch === studentBatchFilter;
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      
      {/* 1. MANAGE BATCHES (4 cols) */}
      <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col h-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-studio-accent-purple/10 flex items-center justify-center text-studio-accent-purple">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Academic Batches</h3>
            <p className="text-[11px] text-slate-500">Group students by batch class</p>
          </div>
        </div>

        {/* Add Batch Form */}
        <form onSubmit={handleAddBatch} className="flex gap-2">
          <input
            type="text"
            placeholder="Batch name..."
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
          />
          <input
            type="number"
            placeholder="Allotted hrs"
            value={newBatchAllotted}
            onChange={(e) => setNewBatchAllotted(e.target.value)}
            className="w-24 px-2 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
            title="Default allotted hours for this batch"
          />
          <button
            type="submit"
            className="p-2.5 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white rounded-lg transition duration-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {/* Batches List */}
        <div className="space-y-2 flex-1 max-h-80 overflow-y-auto pr-1">
          {batches.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">No batches added yet.</p>
          ) : (
            batches.map((batch) => (
              <div 
                key={batch.id} 
                className="flex items-center justify-between p-3 bg-studio-900 border border-white/5 rounded-xl text-xs hover:border-white/10 transition group"
              >
                {editBatchId === batch.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={editBatchName}
                      onChange={(e) => setEditBatchName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-studio-950 border border-studio-accent-purple/50 text-white text-xs outline-none"
                    />
                    <input
                      type="number"
                      value={editBatchAllotted}
                      onChange={(e) => setEditBatchAllotted(e.target.value)}
                      placeholder="Hrs"
                      className="w-16 px-1.5 py-1 rounded bg-studio-950 border border-studio-accent-purple/50 text-white text-xs outline-none"
                    />
                    <button 
                      onClick={() => handleSaveBatch(batch.id)} 
                      className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setEditBatchId(null)} 
                      className="p-1 text-slate-400 hover:bg-white/5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{batch.batchName}</span>
                      {batch.allottedHours ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-950 text-studio-accent-purple border border-studio-accent-purple/20 font-mono">
                          {batch.allottedHours}h Allotted
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button
                        onClick={() => handleStartEditBatch(batch)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                        className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. MANAGE STUDENTS (4 cols) */}
      <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col h-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-studio-accent-blue/10 flex items-center justify-center text-studio-accent-blue">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Active Students</h3>
            <p className="text-[11px] text-slate-500">Manage student directories</p>
          </div>
        </div>

        {/* Add Student Form */}
        <form onSubmit={handleAddStudent} className="grid grid-cols-12 gap-2">
          <div className="col-span-5">
            <input
              type="text"
              placeholder="Student name..."
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
            />
          </div>
          <div className="col-span-3">
            <select
              value={newStudentBatch}
              onChange={(e) => setNewStudentBatch(e.target.value)}
              className="w-full px-2 py-2 rounded-lg studio-input text-slate-100 text-xs select-dark"
            >
              {batches.length === 0 ? (
                <option value="">No Batches</option>
              ) : (
                batches.map(b => (
                  <option key={b.id} value={b.batchName}>{b.batchName}</option>
                ))
              )}
            </select>
          </div>
          <div className="col-span-2">
            <input
              type="number"
              placeholder="Hrs (opt)"
              value={newStudentAllotted}
              onChange={(e) => setNewStudentAllotted(e.target.value)}
              className="w-full px-2 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
              title="Custom allotted hours (leaves empty to use Batch default)"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              disabled={batches.length === 0}
              className="w-full py-2 bg-studio-accent-blue hover:bg-studio-accent-blue/90 text-white rounded-lg transition duration-205 flex justify-center items-center disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Student Search and Batch Filter */}
        <div className="grid grid-cols-12 gap-2 p-3 bg-studio-950/40 border border-white/5 rounded-xl">
          <input
            type="text"
            placeholder="Search student name..."
            value={studentSearchQuery}
            onChange={(e) => setStudentSearchQuery(e.target.value)}
            className="col-span-7 px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
          />
          <select
            value={studentBatchFilter}
            onChange={(e) => setStudentBatchFilter(e.target.value)}
            className="col-span-5 px-2 py-1.5 rounded-lg studio-input text-slate-100 text-xs select-dark"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.batchName}>{b.batchName}</option>
            ))}
          </select>
        </div>

        {/* Students List */}
        <div className="space-y-2 flex-1 max-h-80 overflow-y-auto pr-1">
          {filteredStudentsList.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">No matching students found.</p>
          ) : (
            filteredStudentsList.map((student) => (
              <div 
                key={student.id} 
                className="flex items-center justify-between p-3.5 bg-studio-900 border border-white/5 rounded-xl text-xs hover:border-white/10 transition group"
              >
                {editStudentId === student.id ? (
                  <div className="flex gap-1.5 flex-1 items-center">
                    <input
                      type="text"
                      value={editStudentName}
                      onChange={(e) => setEditStudentName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-studio-950 border border-studio-accent-purple/50 text-white text-xs outline-none"
                    />
                    <select
                      value={editStudentBatch}
                      onChange={(e) => setEditStudentBatch(e.target.value)}
                      className="px-1.5 py-1 rounded bg-studio-950 border border-studio-accent-purple/50 text-white text-xs outline-none"
                    >
                      {batches.map(b => (
                        <option key={b.id} value={b.batchName}>{b.batchName}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={editStudentAllotted}
                      onChange={(e) => setEditStudentAllotted(e.target.value)}
                      placeholder="Hrs"
                      className="w-16 px-1.5 py-1 rounded bg-studio-950 border border-studio-accent-purple/50 text-white text-xs outline-none"
                      title="Custom allotted hours"
                    />
                    <button 
                      onClick={() => handleSaveStudent(student.id)} 
                      className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setEditStudentId(null)} 
                      className="p-1 text-slate-400 hover:bg-white/5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold text-white">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">{student.batch}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button
                        onClick={() => handleStartEditStudent(student)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. MANAGE WORKSTATIONS (4 cols) */}
      <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col h-full">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Tv className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Workstations</h3>
            <p className="text-[11px] text-slate-500">Hardware specs & workstation nodes</p>
          </div>
        </div>

        {/* Add Workstation Form */}
        <form onSubmit={handleAddWorkstation} className="space-y-2 bg-studio-950/40 p-3 rounded-xl border border-white/5">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <input
                type="text"
                placeholder="Workstation (VFX-01)"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs font-mono font-semibold"
                required
              />
            </div>
            <div className="col-span-6">
              <input
                type="text"
                placeholder="Graphics Card (RTX 4090)"
                value={newWsGpu}
                onChange={(e) => setNewWsGpu(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <input
                type="text"
                placeholder="VRAM (24GB)"
                value={newWsVram}
                onChange={(e) => setNewWsVram(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                placeholder="RAM (64GB)"
                value={newWsRam}
                onChange={(e) => setNewWsRam(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
              />
            </div>
            <div className="col-span-4">
              <input
                type="text"
                placeholder="Processor"
                value={newWsProcessor}
                onChange={(e) => setNewWsProcessor(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition duration-200 flex justify-center items-center gap-1.5 text-xs"
          >
            <Plus className="h-4 w-4" />
            Add Workstation
          </button>
        </form>

        {/* Workstations List */}
        <div className="space-y-2 flex-1 max-h-80 overflow-y-auto pr-1">
          {workstations.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">No workstations added yet.</p>
          ) : (
            workstations.map((ws) => (
              <div 
                key={ws.id} 
                className="p-3 bg-studio-900 border border-white/5 rounded-xl text-xs hover:border-white/10 transition group space-y-1.5"
              >
                {editWsId === ws.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editWsName}
                        onChange={(e) => setEditWsName(e.target.value)}
                        placeholder="Name"
                        className="w-24 px-2 py-1 rounded bg-studio-950 border border-emerald-500/50 text-white text-xs font-mono font-bold outline-none"
                      />
                      <input
                        type="text"
                        value={editWsGpu}
                        onChange={(e) => setEditWsGpu(e.target.value)}
                        placeholder="Graphics Card"
                        className="flex-1 px-2 py-1 rounded bg-studio-950 border border-emerald-500/50 text-white text-xs outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editWsVram}
                        onChange={(e) => setEditWsVram(e.target.value)}
                        placeholder="VRAM"
                        className="w-16 px-1.5 py-1 rounded bg-studio-950 border border-emerald-500/50 text-white text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={editWsRam}
                        onChange={(e) => setEditWsRam(e.target.value)}
                        placeholder="RAM"
                        className="w-16 px-1.5 py-1 rounded bg-studio-950 border border-emerald-500/50 text-white text-xs outline-none"
                      />
                      <input
                        type="text"
                        value={editWsProcessor}
                        onChange={(e) => setEditWsProcessor(e.target.value)}
                        placeholder="Processor"
                        className="flex-1 px-1.5 py-1 rounded bg-studio-950 border border-emerald-500/50 text-white text-xs outline-none"
                      />
                      <button 
                        onClick={() => handleSaveWorkstation(ws.id)} 
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => setEditWsId(null)} 
                        className="p-1 text-slate-400 hover:bg-white/5 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-xs">{ws.name}</span>
                        {ws.gpu && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-950 text-emerald-400 border border-emerald-500/20 font-mono">
                            {ws.gpu}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                        <button
                          onClick={() => handleStartEditWorkstation(ws)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWorkstation(ws.id, ws.name)}
                          className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {(ws.vram || ws.ram || ws.processor) && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-mono">
                        {ws.vram && <span>VRAM: {ws.vram}</span>}
                        {ws.ram && <span>RAM: {ws.ram}</span>}
                        {ws.processor && <span>CPU: {ws.processor}</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

export default GlobalSettingsTab;
