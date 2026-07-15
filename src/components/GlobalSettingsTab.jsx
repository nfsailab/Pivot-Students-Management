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
  Sparkles
} from 'lucide-react';

function GlobalSettingsTab() {
  // Collection States
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [modes, setModes] = useState([]);
  const [academicSettingsList, setAcademicSettingsList] = useState([]);
  const [logsList, setLogsList] = useState([]);

  // Form inputs
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchAllotted, setNewBatchAllotted] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBatch, setNewStudentBatch] = useState('');
  const [newStudentAllotted, setNewStudentAllotted] = useState('');
  const [newModeName, setNewModeName] = useState('');

  // Inline editing states
  const [editBatchId, setEditBatchId] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchAllotted, setEditBatchAllotted] = useState('');

  const [editStudentId, setEditStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentBatch, setEditStudentBatch] = useState('');
  const [editStudentAllotted, setEditStudentAllotted] = useState('');

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

    const unsubModes = subscribeCollection('modes', (data) => {
      setModes(data);
    });

    const unsubAcad = subscribeCollection('settings_academic', (data) => {
      setAcademicSettingsList(data || []);
    });

    const unsubLogs = subscribeCollection('activity_logs', (data) => {
      setLogsList(data || []);
    });

    return () => {
      unsubBatches();
      unsubStudents();
      unsubModes();
      unsubAcad();
      unsubLogs();
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

    try {
      await addDocument('batches', { 
        batchName: newBatchName.trim(),
        allottedHours: newBatchAllotted ? Number(newBatchAllotted) : null
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* 1. MANAGE BATCHES (4 cols) */}
      <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
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
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
      <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
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
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
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
                        {(student.totalHours || student.totalSeconds > 0) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-studio-950 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                            {formatStudentTime(student)} used
                          </span>
                        )}
                        {(() => {
                          const batchNameTrimmed = (student.batch || '').trim().toLowerCase();
                          const batchObj = batchesList.find(b => (b.batchName || b.name || '').trim().toLowerCase() === batchNameTrimmed);
                          const acadGuideline = academicSettingsList.find(a => (a.id || '').trim().toLowerCase() === batchNameTrimmed || (a.batchName || '').trim().toLowerCase() === batchNameTrimmed);
                          const topicsHours = getTopicsTotalAllocatedHours(acadGuideline?.topics || []);
                          const anyAcadWithTopics = academicSettingsList.find(a => getTopicsTotalAllocatedHours(a.topics || []) > 0 || Number(a.allottedHours) > 0);
                          const fallbackTopicsHours = anyAcadWithTopics ? getTopicsTotalAllocatedHours(anyAcadWithTopics.topics || []) : 0;
                          const fallbackAcadHours = anyAcadWithTopics ? getValidNum(anyAcadWithTopics.allottedHours) : null;

                          const allottedNum = Number(
                            getValidNum(student.allottedHours) ?? 
                            getValidNum(student.allocatedHours) ?? 
                            getValidNum(acadGuideline?.allottedHours) ?? 
                            getValidNum(acadGuideline?.allocatedHours) ?? 
                            getValidNum(acadGuideline?.totalAllocatedHours) ?? 
                            getValidNum(batchObj?.allottedHours) ?? 
                            getValidNum(batchObj?.allocatedHours) ?? 
                            (topicsHours > 0 ? topicsHours : null) ?? 
                            fallbackAcadHours ?? 
                            (fallbackTopicsHours > 0 ? fallbackTopicsHours : 0)
                          );
                          const studentLogs = logsList.filter(l => (l.studentId || l.studentName || '').toLowerCase() === (student.name || '').toLowerCase());
                          const logsTotalSecs = studentLogs.reduce((acc, l) => {
                            const d = Number(l.durationSecs) || (l.endTime && l.startTime ? Math.round((new Date(l.endTime) - new Date(l.startTime)) / 1000) : 0);
                            return acc + (isNaN(d) || d < 0 ? 0 : d);
                          }, 0);
                          const actualSecs = Math.max(
                            Number(student.totalSeconds || 0),
                            Math.round(Number(student.totalHours || 0) * 3600),
                            logsTotalSecs
                          );
                          const diffSecs = (allottedNum * 3600) - actualSecs;
                          return (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                              diffSecs >= 0 
                                ? 'bg-studio-950 border-studio-accent-blue/30 text-studio-accent-blue' 
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                              {allottedNum}h Allotted ({diffSecs >= 0 ? `${Math.floor(diffSecs / 3600)}h ${Math.floor((diffSecs % 3600) / 60)}m left` : `${Math.floor(Math.abs(diffSecs) / 3600)}h ${Math.floor((Math.abs(diffSecs) % 3600) / 60)}m over`})
                            </span>
                          );
                        })()}
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

    </div>
  );
}

export default GlobalSettingsTab;
