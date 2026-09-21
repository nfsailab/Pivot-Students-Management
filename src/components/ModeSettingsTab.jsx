import React, { useState, useEffect } from 'react';
import { subscribeCollection, updateDocument } from '../firebase';
import { 
  GraduationCap, 
  Film, 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Loader2,
  Clock,
  Layers,
  Sparkles,
  X,
  GripVertical,
  Edit2,
  ChevronUp,
  ChevronDown,
  Check
} from 'lucide-react';

// ----------------------------------------------------
// 12-Hour Range Slider Component with AM/PM Pills
// ----------------------------------------------------
function TimeRangeSlider({ value, onChange, label }) {
  const parseTimeStr = (str) => {
    const defaults = {
      sHour: 9, sMin: 0, sAmPm: 'AM',
      eHour: 5, eMin: 0, eAmPm: 'PM'
    };
    if (!str) return defaults;
    try {
      const parts = str.split(' - ');
      if (parts.length !== 2) return defaults;
      
      const parseSingle = (timePart) => {
        const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return null;
        return {
          hour: parseInt(match[1]),
          min: parseInt(match[2]),
          ampm: match[3].toUpperCase()
        };
      };
      
      const start = parseSingle(parts[0]);
      const end = parseSingle(parts[1]);
      
      if (!start || !end) return defaults;
      
      return {
        sHour: start.hour, sMin: start.min, sAmPm: start.ampm,
        eHour: end.hour, eMin: end.min, eAmPm: end.ampm
      };
    } catch {
      return defaults;
    }
  };

  const parsed = parseTimeStr(value);
  
  const [sHour, setSHour] = useState(parsed.sHour);
  const [sMin, setSMin] = useState(parsed.sMin);
  const [sAmPm, setSAmPm] = useState(parsed.sAmPm);
  
  const [eHour, setEHour] = useState(parsed.eHour);
  const [eMin, setEMin] = useState(parsed.eMin);
  const [eAmPm, setEAmPm] = useState(parsed.eAmPm);

  // Sync state when parent value updates
  useEffect(() => {
    const p = parseTimeStr(value);
    setSHour(p.sHour);
    setSMin(p.sMin);
    setSAmPm(p.sAmPm);
    setEHour(p.eHour);
    setEMin(p.eMin);
    setEAmPm(p.eAmPm);
  }, [value]);

  const updateTime = (sh, sm, sap, eh, em, eap) => {
    const startStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')} ${sap}`;
    const endStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')} ${eap}`;
    onChange(`${startStr} - ${endStr}`);
  };

  const handleSHourChange = (e) => {
    const val = parseInt(e.target.value);
    setSHour(val);
    updateTime(val, sMin, sAmPm, eHour, eMin, eAmPm);
  };

  const handleSMinChange = (e) => {
    const val = parseInt(e.target.value);
    setSMin(val);
    updateTime(sHour, val, sAmPm, eHour, eMin, eAmPm);
  };

  const handleSAmPmToggle = (val) => {
    setSAmPm(val);
    updateTime(sHour, sMin, val, eHour, eMin, eAmPm);
  };

  const handleEHourChange = (e) => {
    const val = parseInt(e.target.value);
    setEHour(val);
    updateTime(sHour, sMin, sAmPm, val, eMin, eAmPm);
  };

  const handleEMinChange = (e) => {
    const val = parseInt(e.target.value);
    setEMin(val);
    updateTime(sHour, sMin, sAmPm, eHour, val, eAmPm);
  };

  const handleEAmPmToggle = (val) => {
    setEAmPm(val);
    updateTime(sHour, sMin, sAmPm, eHour, eMin, val);
  };

  return (
    <div className="space-y-3 bg-studio-950/40 p-3.5 border border-white/5 rounded-2xl min-w-0 w-full overflow-hidden">
      <div className="flex justify-between items-center border-b border-white/5 pb-1.5 min-w-0 gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{label}</span>
        <span className="text-[11px] font-mono font-bold text-studio-accent-purple bg-studio-accent-purple/5 px-2 py-0.5 rounded-lg border border-studio-accent-purple/10 shrink-0">
          {String(sHour).padStart(2, '0')}:{String(sMin).padStart(2, '0')} {sAmPm} - {String(eHour).padStart(2, '0')}:{String(eMin).padStart(2, '0')} {eAmPm}
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-3.5 min-w-0 w-full">
        {/* Start Time Column */}
        <div className="space-y-2 min-w-0 w-full">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Start Time</span>
            <span>{String(sHour).padStart(2, '0')}:{String(sMin).padStart(2, '0')} {sAmPm}</span>
          </div>
          
          <div className="space-y-2 min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-[8px] font-bold text-slate-500 w-8 shrink-0">Hour:</span>
              <input
                type="range"
                min="1"
                max="12"
                value={sHour}
                onChange={handleSHourChange}
                className="flex-1 min-w-0 w-full accent-studio-accent-purple h-1.5 bg-studio-900 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-[8px] font-bold text-slate-500 w-8 shrink-0">Min:</span>
              <input
                type="range"
                min="0"
                max="55"
                step="5"
                value={sMin}
                onChange={handleSMinChange}
                className="flex-1 min-w-0 w-full accent-studio-accent-purple h-1.5 bg-studio-900 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex justify-end pt-0.5">
              <div className="inline-flex rounded-lg bg-studio-900 p-0.5 border border-white/5 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => handleSAmPmToggle('AM')}
                  className={`px-2 py-0.5 rounded ${sAmPm === 'AM' ? 'bg-studio-accent-purple text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleSAmPmToggle('PM')}
                  className={`px-2 py-0.5 rounded ${sAmPm === 'PM' ? 'bg-studio-accent-purple text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* End Time Column */}
        <div className="space-y-2 border-t border-white/5 pt-3 min-w-0 w-full">
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            <span>End Time</span>
            <span>{String(eHour).padStart(2, '0')}:{String(eMin).padStart(2, '0')} {eAmPm}</span>
          </div>
          
          <div className="space-y-2 min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-[8px] font-bold text-slate-500 w-8 shrink-0">Hour:</span>
              <input
                type="range"
                min="1"
                max="12"
                value={eHour}
                onChange={handleEHourChange}
                className="flex-1 min-w-0 w-full accent-studio-accent-purple h-1.5 bg-studio-900 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <span className="text-[8px] font-bold text-slate-500 w-8 shrink-0">Min:</span>
              <input
                type="range"
                min="0"
                max="55"
                step="5"
                value={eMin}
                onChange={handleEMinChange}
                className="flex-1 min-w-0 w-full accent-studio-accent-purple h-1.5 bg-studio-900 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex justify-end pt-0.5">
              <div className="inline-flex rounded-lg bg-studio-900 p-0.5 border border-white/5 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => handleEAmPmToggle('AM')}
                  className={`px-2 py-0.5 rounded ${eAmPm === 'AM' ? 'bg-studio-accent-purple text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleEAmPmToggle('PM')}
                  className={`px-2 py-0.5 rounded ${eAmPm === 'PM' ? 'bg-studio-accent-purple text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Default Session Times
// ----------------------------------------------------
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
  if (!timing) return 0;
  const parts = timing.split(/\s*[-–to]+\s*/i);
  if (parts.length !== 2) return 0;
  
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
    const sObj = normAvailable.find(s => s && s.name === name);
    if (sObj && sObj.timing) {
      totalMins += calculateSessionDuration(sObj.timing);
    }
  }
  return totalMins;
};

// ----------------------------------------------------
// Main Mode Settings Panel Component
// ----------------------------------------------------
function ModeSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [academicSettingsList, setAcademicSettingsList] = useState([]);
  const [productionSettingsList, setProductionSettingsList] = useState([]);
  const [research, setResearch] = useState(null);
  const [genaiSettingsList, setGenaiSettingsList] = useState([]);

  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [modalSessions, setModalSessions] = useState([]);

  const activeBatchObj = (batches || []).find(b => b && b.batchName === selectedBatch);
  const commonBatchObj = (batches || []).find(b => b && b.sessionTimes && Array.isArray(b.sessionTimes) && b.sessionTimes.length > 0) || activeBatchObj;

  const isSessionTimesOn = commonBatchObj?.useSessionTimes ?? true;
  const rawSessions = (commonBatchObj?.sessionTimes && Array.isArray(commonBatchObj.sessionTimes) && commonBatchObj.sessionTimes.length > 0)
    ? commonBatchObj.sessionTimes
    : DEFAULT_SESSIONS;
  const availableSessions = normalizeSessions(rawSessions);

  const handleToggleSessionTimes = async () => {
    if (batches.length === 0) return;
    const newStatus = !isSessionTimesOn;
    const updates = { 
      useSessionTimes: newStatus,
      sessionTimes: availableSessions
    };
    try {
      await Promise.all(batches.map(b => updateDocument('batches', b.id, updates)));
    } catch (err) {
      console.error('Failed to toggle session times across all batches:', err);
    }
  };

  const handleOpenSessionsModal = () => {
    setModalSessions(availableSessions);
    setShowSessionsModal(true);
  };

  const handleUpdateModalSession = (index, field, value) => {
    const newSessions = [...modalSessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setModalSessions(newSessions);
  };

  const handleAddModalSession = () => {
    const nextNum = modalSessions.length + 1;
    setModalSessions([
      ...modalSessions,
      { name: `Session ${nextNum}`, timing: '09:30 AM - 10:25 AM' }
    ]);
  };

  const handleDeleteModalSession = (index) => {
    const newSessions = modalSessions.filter((_, idx) => idx !== index);
    setModalSessions(newSessions);
  };

  const handleSaveSessions = async () => {
    if (batches.length === 0) return;
    const updates = {
      useSessionTimes: isSessionTimesOn,
      sessionTimes: modalSessions
    };
    try {
      await Promise.all(batches.map(b => updateDocument('batches', b.id, updates)));
      setShowSessionsModal(false);
    } catch (err) {
      console.error('Failed to save session times across all batches:', err);
      alert('Failed to save sessions: ' + err.message);
    }
  };

  // Academic inputs
  const [newTopic, setNewTopic] = useState('');
  const [newTopicSessions, setNewTopicSessions] = useState(['Session 1']);
  const [newTopicCategory, setNewTopicCategory] = useState('SAX');
  const [academicInstructions, setAcademicInstructions] = useState('');
  const [academicTimeslot, setAcademicTimeslot] = useState('09:30 AM - 10:25 AM');

  // Production Project inputs
  const [projectName, setProjectName] = useState('');
  const [projectSessions, setProjectSessions] = useState(['Session 1']);
  const [projectStage, setProjectStage] = useState('Production');

  // Research inputs
  const [newResearchTopic, setNewResearchTopic] = useState('');
  const [newResearchTopicSessions, setNewResearchTopicSessions] = useState(['Session 1']);
  const [newResearchTopicCategory, setNewResearchTopicCategory] = useState('Observation Report');
  const [researchInstructions, setResearchInstructions] = useState('');

  // GenAI Lab inputs
  const [newGenaiProjectName, setNewGenaiProjectName] = useState('');
  const [newGenaiProjectSessions, setNewGenaiProjectSessions] = useState(['Session 1']);
  const [newGenaiProjectStage, setNewGenaiProjectStage] = useState('GenAI Project');
  const [genaiInstructions, setGenaiInstructions] = useState('');
  const [productionInstructions, setProductionInstructions] = useState('');

  // Local state for manual-save architecture
  const [localAcademicTopics, setLocalAcademicTopics] = useState([]);
  const [localProductionProjects, setLocalProductionProjects] = useState([]);
  const [localResearchTopics, setLocalResearchTopics] = useState([]);
  const [localGenaiProjects, setLocalGenaiProjects] = useState([]);

  // Dragging & Inline Editing State
  const [dragInfo, setDragInfo] = useState({ mode: null, index: null });

  const [editingAcadIndex, setEditingAcadIndex] = useState(null);
  const [editAcadForm, setEditAcadForm] = useState({ name: '', sessionNames: ['Session 1'], taskType: 'SAX' });

  const [editingProdIndex, setEditingProdIndex] = useState(null);
  const [editProdForm, setEditProdForm] = useState({ name: '', sessionNames: ['Session 1'], taskType: 'Production' });

  const [editingResearchIndex, setEditingResearchIndex] = useState(null);
  const [editResearchForm, setEditResearchForm] = useState({ name: '', sessionNames: ['Session 1'], taskType: 'Observation Report' });

  const [editingGenaiIndex, setEditingGenaiIndex] = useState(null);
  const [editGenaiForm, setEditGenaiForm] = useState({ name: '', sessionNames: ['Session 1'], taskType: 'GenAI Project' });

  // Reordering & Dragging Helpers
  const moveListItem = (list, setList, index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const newList = [...list];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);
    setList(newList);
  };

  const handleDragStartItem = (mode, index) => {
    setDragInfo({ mode, index });
  };

  const handleDragOverItem = (e) => {
    e.preventDefault();
  };

  const handleDropItem = (mode, dropIndex, list, setList) => {
    if (dragInfo.mode !== mode || dragInfo.index === null || dragInfo.index === dropIndex) return;
    const newList = [...list];
    const [moved] = newList.splice(dragInfo.index, 1);
    newList.splice(dropIndex, 0, moved);
    setList(newList);
    setDragInfo({ mode: null, index: null });
  };

  // Edit Submit Handlers
  const handleSaveAcadEdit = (index) => {
    if (!editAcadForm.name.trim()) return;
    const selectedNames = editAcadForm.sessionNames.length > 0 ? editAcadForm.sessionNames : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const updatedObj = {
      name: editAcadForm.name.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: editAcadForm.taskType
    };
    const newList = [...localAcademicTopics];
    newList[index] = updatedObj;
    setLocalAcademicTopics(newList);
    setEditingAcadIndex(null);
  };

  const handleSaveProdEdit = (index) => {
    if (!editProdForm.name.trim()) return;
    const selectedNames = editProdForm.sessionNames.length > 0 ? editProdForm.sessionNames : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const updatedObj = {
      name: editProdForm.name.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: editProdForm.taskType
    };
    const newList = [...localProductionProjects];
    newList[index] = updatedObj;
    setLocalProductionProjects(newList);
    setEditingProdIndex(null);
  };

  const handleSaveResearchEdit = (index) => {
    if (!editResearchForm.name.trim()) return;
    const selectedNames = editResearchForm.sessionNames.length > 0 ? editResearchForm.sessionNames : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const updatedObj = {
      name: editResearchForm.name.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: editResearchForm.taskType
    };
    const newList = [...localResearchTopics];
    newList[index] = updatedObj;
    setLocalResearchTopics(newList);
    setEditingResearchIndex(null);
  };

  const handleSaveGenaiEdit = (index) => {
    if (!editGenaiForm.name.trim()) return;
    const selectedNames = editGenaiForm.sessionNames.length > 0 ? editGenaiForm.sessionNames : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const updatedObj = {
      name: editGenaiForm.name.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: editGenaiForm.taskType
    };
    const newList = [...localGenaiProjects];
    newList[index] = updatedObj;
    setLocalGenaiProjects(newList);
    setEditingGenaiIndex(null);
  };

  // Saving state indicators
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);
  const [savingGenai, setSavingGenai] = useState(false);
  const [savingProduction, setSavingProduction] = useState(false);

  const [showAcademicSaved, setShowAcademicSaved] = useState(false);
  const [showResearchSaved, setShowResearchSaved] = useState(false);
  const [showGenaiSaved, setShowGenaiSaved] = useState(false);
  const [showProductionSaved, setShowProductionSaved] = useState(false);

  // Subscriptions
  useEffect(() => {
    let loadedBatches = false;
    let loadedAcademic = false;
    let loadedProduction = false;
    let loadedResearch = false;
    let loadedGenai = false;

    const checkAllLoaded = () => {
      if (loadedBatches && loadedAcademic && loadedProduction && loadedResearch && loadedGenai) {
        setLoading(false);
      }
    };

    const unsubBatches = subscribeCollection('batches', (data) => {
      const sorted = [...(data || [])].sort((a, b) => ((a && a.batchName) || '').localeCompare((b && b.batchName) || ''));
      setBatches(sorted);
      if (sorted.length > 0 && !selectedBatch) {
        setSelectedBatch(sorted[0]?.batchName || '');
      }
      loadedBatches = true;
      checkAllLoaded();
    });

    const unsubAcademic = subscribeCollection('settings_academic', (data) => {
      setAcademicSettingsList(data);
      loadedAcademic = true;
      checkAllLoaded();
    });

    const unsubProduction = subscribeCollection('settings_production', (data) => {
      setProductionSettingsList(data);
      loadedProduction = true;
      checkAllLoaded();
    });

    const unsubResearch = subscribeCollection('settings_research', (data) => {
      if (data && data.length > 0) {
        setResearch(data[0]);
        let inst = data[0].instructions || '';
        if (inst.includes('Research current state-of-the-art') || inst.includes('industry papers') || inst.includes('Conduct thorough observations')) {
          inst = '';
          updateDocument('settings_research', data[0].id, { instructions: '' }).catch(() => {});
        }
        setResearchInstructions(inst);
      } else {
        const defaultResearch = {
          id: 'config',
          assignmentTopics: ['AI Rendering Pipelines in Unreal Engine 5', 'NeRF vs Traditional Photogrammetry', 'Real-time Raytracing Optimization'],
          instructions: ''
        };
        setResearch(defaultResearch);
        setResearchInstructions('');
      }
      loadedResearch = true;
      checkAllLoaded();
    });

    const unsubGenai = subscribeCollection('settings_genai', (data) => {
      setGenaiSettingsList(data);
      loadedGenai = true;
      checkAllLoaded();
    });

    return () => {
      unsubBatches();
      unsubAcademic();
      unsubProduction();
      unsubResearch();
      unsubGenai();
    };
  }, []);

  // Sync when selected batch changes
  useEffect(() => {
    if (!selectedBatch) return;

    const activeAcad = academicSettingsList.find(s => s.id === selectedBatch);
    if (activeAcad) {
      setAcademicInstructions(activeAcad.instructions || '');
      setAcademicTimeslot(activeAcad.timeslot || '09:00 AM - 01:00 PM');
      setLocalAcademicTopics(activeAcad.topics || []);
    } else {
      setAcademicInstructions('');
      setAcademicTimeslot('09:00 AM - 01:00 PM');
      setLocalAcademicTopics([]);
    }

    const activeGenai = genaiSettingsList.find(s => s.id === selectedBatch);
    if (activeGenai) {
      setGenaiInstructions(activeGenai.instructions || '');
      setLocalGenaiProjects(activeGenai.projects || []);
    } else {
      setGenaiInstructions('');
      setLocalGenaiProjects([]);
    }

    const activeProd = productionSettingsList.find(s => s.id === selectedBatch);
    if (activeProd) {
      setProductionInstructions(activeProd.instructions || '');
      setLocalProductionProjects(activeProd.projects || []);
    } else {
      setProductionInstructions('');
      setLocalProductionProjects([]);
    }
  }, [selectedBatch, academicSettingsList, genaiSettingsList, productionSettingsList]);

  useEffect(() => {
    if (research) {
      let inst = research.instructions || '';
      if (inst.includes('Research current state-of-the-art') || inst.includes('industry papers') || inst.includes('Conduct thorough observations')) {
        inst = '';
      }
      setResearchInstructions(inst);
      setLocalResearchTopics(research.assignmentTopics || []);
    }
  }, [research]);

  const currentAcademic = academicSettingsList.find(s => s.id === selectedBatch) || {
    id: selectedBatch,
    topics: [],
    instructions: '',
    timeslot: '09:00 AM - 01:00 PM'
  };

  const currentProduction = productionSettingsList.find(s => s.id === selectedBatch) || {
    id: selectedBatch,
    projects: [],
    instructions: ''
  };

  const currentGenai = genaiSettingsList.find(s => s.id === selectedBatch) || {
    id: selectedBatch,
    projects: [],
    instructions: ''
  };

  // ----------------------------------------------------
  // ACADEMIC HANDLERS
  // ----------------------------------------------------
  const getTopicsTotalAllocatedHours = (topics) => {
    if (!topics || !Array.isArray(topics) || topics.length === 0) return 0;
    let totalSecs = 0;
    for (const t of topics) {
      if (!t || typeof t === 'string') continue;
      if (t.sessionNames && Array.isArray(t.sessionNames) && t.sessionNames.length > 0) {
        const durMins = calculateCombinedSessionsDuration(t.sessionNames, availableSessions);
        if (durMins > 0) {
          totalSecs += durMins * 60;
          continue;
        }
      }
      const timing = String(t.timing || '').trim();
      if (timing) {
        const durMins = calculateSessionDuration(timing);
        if (durMins > 0) {
          totalSecs += durMins * 60;
          continue;
        }
      }
      if (t.allottedHours || t.hours || t.durationHours || t.allocatedHours) {
        const val = Number(t.allottedHours ?? t.hours ?? t.durationHours ?? t.allocatedHours);
        if (!isNaN(val) && val > 0) {
          totalSecs += val * 3600;
        }
      }
    }
    return Number((totalSecs / 3600).toFixed(2));
  };

  const getTopicCombinedTiming = (selectedSessions, sessionList) => {
    const names = Array.isArray(selectedSessions) ? selectedSessions : [selectedSessions];
    const sObjs = names.map(n => (sessionList || []).find(s => s.name === n)).filter(Boolean);
    if (sObjs.length === 0) return '09:30 AM - 10:25 AM';
    const startTime = sObjs[0].timing ? sObjs[0].timing.split(' - ')[0] : '09:30 AM';
    const endTime = sObjs[sObjs.length - 1].timing ? (sObjs[sObjs.length - 1].timing.split(' - ')[1] || sObjs[sObjs.length - 1].timing) : '10:25 AM';
    return `${startTime} - ${endTime}`;
  };

  const handleAddTopic = (e) => {
    e.preventDefault();
    if (!newTopic.trim() || !selectedBatch) return;
    
    const selectedNames = newTopicSessions.length > 0 ? newTopicSessions : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const newTopicObj = {
      name: newTopic.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: newTopicCategory
    };

    setLocalAcademicTopics([...localAcademicTopics, newTopicObj]);
    setNewTopic('');
    setNewTopicSessions([availableSessions[0]?.name || 'Session 1']);
    setNewTopicCategory('SAX');
  };

  const handleDeleteTopic = (topicToDelete) => {
    if (!selectedBatch) return;
    setLocalAcademicTopics(localAcademicTopics.filter(t => (typeof t === 'string' ? t : t.name) !== topicToDelete));
  };

  const handleSaveAcademicSettings = async () => {
    if (!selectedBatch) return;
    setSavingAcademic(true);
    try {
      await updateDocument('settings_academic', selectedBatch, {
        topics: localAcademicTopics,
        instructions: academicInstructions,
        timeslot: academicTimeslot,
        allottedHours: getTopicsTotalAllocatedHours(localAcademicTopics)
      });
      setShowAcademicSaved(true);
      setTimeout(() => setShowAcademicSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAcademic(false);
    }
  };

  // ----------------------------------------------------
  // PRODUCTION HANDLERS
  // ----------------------------------------------------
  const handleAddProject = (e) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedBatch) return;

    const selectedNames = projectSessions.length > 0 ? projectSessions : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const newProjectObj = {
      name: projectName.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: projectStage
    };

    setLocalProductionProjects([...localProductionProjects, newProjectObj]);
    setProjectName('');
    setProjectSessions([availableSessions[0]?.name || 'Session 1']);
    setProjectStage('Production');
  };

  const handleDeleteProject = (projName) => {
    if (!selectedBatch) return;
    setLocalProductionProjects(localProductionProjects.filter(p => p.name !== projName));
  };

  const handleSaveProductionSettings = async () => {
    if (!selectedBatch) return;
    setSavingProduction(true);
    try {
      await updateDocument('settings_production', selectedBatch, {
        projects: localProductionProjects,
        instructions: productionInstructions,
        allottedHours: getTopicsTotalAllocatedHours(localProductionProjects)
      });
      setShowProductionSaved(true);
      setTimeout(() => setShowProductionSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProduction(false);
    }
  };

  // ----------------------------------------------------
  // RESEARCH HANDLERS
  // ----------------------------------------------------
  const handleAddResearchTopic = (e) => {
    e.preventDefault();
    if (!newResearchTopic.trim() || !research) return;

    const selectedNames = newResearchTopicSessions.length > 0 ? newResearchTopicSessions : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const newTopicObj = {
      name: newResearchTopic.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: newResearchTopicCategory
    };

    setLocalResearchTopics([...localResearchTopics, newTopicObj]);
    setNewResearchTopic('');
    setNewResearchTopicSessions([availableSessions[0]?.name || 'Session 1']);
    setNewResearchTopicCategory('Observation Report');
  };

  const handleDeleteResearchTopic = (topicToDelete) => {
    if (!research) return;
    setLocalResearchTopics(localResearchTopics.filter(t => (typeof t === 'string' ? t : t.name) !== topicToDelete));
  };

  const handleSaveResearchSettings = async () => {
    if (!research) return;
    setSavingResearch(true);
    try {
      await updateDocument('settings_research', research.id, {
        assignmentTopics: localResearchTopics,
        instructions: researchInstructions,
        allottedHours: getTopicsTotalAllocatedHours(localResearchTopics)
      });
      setShowResearchSaved(true);
      setTimeout(() => setShowResearchSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingResearch(false);
    }
  };

  // ----------------------------------------------------
  // GENAI HANDLERS
  // ----------------------------------------------------
  const handleAddGenaiProject = (e) => {
    e.preventDefault();
    if (!newGenaiProjectName.trim() || !selectedBatch) return;

    const selectedNames = newGenaiProjectSessions.length > 0 ? newGenaiProjectSessions : [availableSessions[0]?.name || 'Session 1'];
    const timing = getTopicCombinedTiming(selectedNames, availableSessions);
    const newProjectObj = {
      name: newGenaiProjectName.trim(),
      sessionNames: selectedNames,
      sessionName: selectedNames.join(', '),
      timing: timing,
      taskType: newGenaiProjectStage
    };

    setLocalGenaiProjects([...localGenaiProjects, newProjectObj]);
    setNewGenaiProjectName('');
    setNewGenaiProjectSessions([availableSessions[0]?.name || 'Session 1']);
    setNewGenaiProjectStage('GenAI Project');
  };

  const handleDeleteGenaiProject = (projName) => {
    if (!selectedBatch) return;
    setLocalGenaiProjects(localGenaiProjects.filter(p => p.name !== projName));
  };

  const handleSaveGenaiSettings = async () => {
    if (!selectedBatch) return;
    setSavingGenai(true);
    try {
      await updateDocument('settings_genai', selectedBatch, {
        projects: localGenaiProjects,
        instructions: genaiInstructions,
        allottedHours: getTopicsTotalAllocatedHours(localGenaiProjects)
      });
      setShowGenaiSaved(true);
      setTimeout(() => setShowGenaiSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGenai(false);
    }
  };

  const getStageBadgeColor = (stage) => {
    switch(stage) {
      // Production
      case 'Pre Production': return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
      case 'Production': return 'bg-studio-accent-purple/15 border-studio-accent-purple/20 text-studio-accent-purple';
      case 'Post Production': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      
      // Academic
      case 'sax':
      case 'SAX': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
      case 'assignments':
      case 'Assignments': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'events':
      case 'Events': return 'bg-rose-500/10 border-rose-500/20 text-rose-400';

      // Research
      case 'Observation Report': return 'bg-teal-500/10 border-teal-500/20 text-teal-400';
      case 'Analysis Report': return 'bg-pink-500/10 border-pink-500/20 text-pink-400';
      case 'Review': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'Literature Review': return 'bg-teal-500/10 border-teal-500/20 text-teal-400';
      case 'Implementation': return 'bg-pink-500/10 border-pink-500/20 text-pink-400';
      case 'Methodology': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';

      // GenAI Lab
      case 'GenAI Project': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      
      default: return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-24 gap-4 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-studio-accent-purple" />
        <p className="text-xs font-semibold uppercase tracking-widest">Loading Configuration Profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* a. Global Batch Selector Header - left positioned dropdown, removed 'Batch Selector' text */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-start gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-studio-accent-purple/10 flex items-center justify-center rounded-xl text-studio-accent-purple shrink-0">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-450 font-bold">Configure Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-4 py-2 bg-studio-900 border border-white/5 text-white rounded-xl text-xs font-bold select-dark focus:outline-none"
            >
              {batches.map(b => (
                <option key={b.id} value={b.batchName}>{b.batchName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="hidden sm:block text-[10px] text-slate-500 font-medium sm:ml-4 border-l border-white/5 pl-4 py-1">
          Set curriculum guidelines & project rosters per class batch
        </div>
        
        {/* Toggle Session Times (Common across all batches) */}
        <div className="flex items-center gap-3 sm:ml-auto border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-4">
          <span className="text-xs text-slate-450 font-bold" title="Common to all class batches">Global Session Times:</span>
          <button
            type="button"
            onClick={handleToggleSessionTimes}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
              isSessionTimesOn ? 'bg-studio-accent-purple' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isSessionTimesOn ? 'translate-x-5.5' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSessionTimesOn ? 'text-studio-accent-purple' : 'text-slate-500'}`}>
            {isSessionTimesOn ? 'ON' : 'OFF'}
          </span>
          {isSessionTimesOn && (
            <button
              type="button"
              onClick={handleOpenSessionsModal}
              className="px-2.5 py-1 rounded bg-studio-accent-purple/10 border border-studio-accent-purple/20 text-studio-accent-purple hover:bg-studio-accent-purple hover:text-white text-[10px] font-bold transition flex items-center gap-1 shrink-0 shadow-sm ml-1"
            >
              <Clock className="h-3 w-3" />
              Edit Sessions
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
        
        {/* 1. ACADEMIC MODE CARD */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between self-stretch">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-studio-accent-blue/10 flex items-center justify-center text-studio-accent-blue">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Academic Settings</h3>
                  <p className="text-[11px] text-slate-500">Syllabus per batch</p>
                </div>
              </div>
              
              <span className="px-2 py-0.5 rounded bg-studio-accent-blue/10 text-[9px] font-bold text-studio-accent-blue border border-studio-accent-blue/20">
                {selectedBatch}
              </span>
            </div>

            {/* Add Topic Sub-form */}
            <div className="space-y-3 p-4 bg-studio-950/50 border border-white/5 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                Add Academic Topic
              </label>
              
              <form onSubmit={handleAddTopic} className="space-y-3.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Topic Name (e.g. 3D Modeling)"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-705 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Assign Sessions</span>
                    {(() => {
                      const totalMins = calculateCombinedSessionsDuration(newTopicSessions, availableSessions);
                      return totalMins > 0 ? (
                        <span className="text-studio-accent-blue font-mono font-bold text-[10px]">
                          {totalMins} mins ({Number((totalMins / 60).toFixed(2))} hr)
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-1.5 p-2 bg-studio-900 border border-white/5 rounded-xl max-h-28 overflow-y-auto">
                    {availableSessions.map((s, idx) => {
                      const isSelected = (newTopicSessions || []).includes(s.name);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              if (newTopicSessions.length > 1) {
                                setNewTopicSessions(newTopicSessions.filter(n => n !== s.name));
                              }
                            } else {
                              setNewTopicSessions([...newTopicSessions, s.name]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 inline-flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-studio-accent-blue text-white border-studio-accent-blue hover:bg-studio-accent-blue/80 shadow-sm'
                              : 'bg-studio-950 text-slate-400 border-white/5 hover:bg-studio-800 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                  <select
                    value={newTopicCategory}
                    onChange={(e) => setNewTopicCategory(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 text-xs font-semibold select-dark"
                  >
                    <option value="SAX">SAX</option>
                    <option value="Assignments">Assignments</option>
                    <option value="Events">Events</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-studio-accent-blue hover:bg-studio-accent-blue/90 text-white font-bold rounded-lg transition duration-200 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Topic to Batch
                </button>
              </form>
            </div>

            {/* Active Topics Cards List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-studio-900/80 px-3.5 py-2 rounded-xl border border-studio-accent-blue/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Active Topics ({ localAcademicTopics.length })
                </span>
                <span className="text-[10px] font-mono font-bold text-studio-accent-blue">
                  Total Topics Time: {getTopicsTotalAllocatedHours(localAcademicTopics)} hr
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localAcademicTopics.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active topics for this batch.
                  </p>
                ) : (
                  localAcademicTopics.map((topic, idx) => {
                    const name = typeof topic === 'string' ? topic : topic.name;
                    const category = typeof topic === 'string' ? 'SAX' : (topic.taskType || 'SAX');
                    const sessionNamesArr = typeof topic === 'string'
                      ? ['Session 1']
                      : (topic.sessionNames || (topic.sessionName ? topic.sessionName.split(', ') : [(availableSessions.find(s => s.timing === topic.timing)?.name || 'Session 1')]));
                    const sessionDisplayStr = sessionNamesArr.join(', ');
                    const durMins = typeof topic === 'string'
                      ? 55
                      : (calculateCombinedSessionsDuration(sessionNamesArr, availableSessions) || calculateSessionDuration(topic.timing) || 55);

                    const isEditing = editingAcadIndex === idx;

                    if (isEditing) {
                      return (
                        <div key={idx} className="p-3 bg-studio-950 border border-studio-accent-blue/50 rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[10px] font-bold text-studio-accent-blue uppercase tracking-wider">Edit Topic</span>
                            <button
                              type="button"
                              onClick={() => setEditingAcadIndex(null)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editAcadForm.name}
                              onChange={(e) => setEditAcadForm({ ...editAcadForm, name: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-lg studio-input text-slate-100 text-xs font-semibold"
                              placeholder="Topic Name"
                            />
                            <div className="flex gap-2 items-center">
                              <select
                                value={editAcadForm.taskType}
                                onChange={(e) => setEditAcadForm({ ...editAcadForm, taskType: e.target.value })}
                                className="px-2 py-1 rounded-lg studio-input text-slate-100 text-[10px] font-semibold select-dark w-1/3"
                              >
                                <option value="SAX">SAX</option>
                                <option value="Assignments">Assignments</option>
                                <option value="Events">Events</option>
                              </select>
                              <div className="flex-1 flex flex-wrap gap-1 items-center bg-studio-900 p-1.5 rounded-lg border border-white/5 max-h-20 overflow-y-auto">
                                {availableSessions.map((s, sIdx) => {
                                  const isSel = (editAcadForm?.sessionNames || []).includes(s.name);
                                  return (
                                    <button
                                      type="button"
                                      key={sIdx}
                                      onClick={() => {
                                        if (isSel) {
                                          if (editAcadForm.sessionNames.length > 1) {
                                            setEditAcadForm({ ...editAcadForm, sessionNames: editAcadForm.sessionNames.filter(n => n !== s.name) });
                                          }
                                        } else {
                                          setEditAcadForm({ ...editAcadForm, sessionNames: [...editAcadForm.sessionNames, s.name] });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                                        isSel ? 'bg-studio-accent-blue text-white border-studio-accent-blue' : 'bg-studio-950 text-slate-400 border-white/5 hover:text-white'
                                      }`}
                                    >
                                      {s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1.5 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setEditingAcadIndex(null)}
                              className="px-2.5 py-1 rounded bg-studio-900 text-slate-400 hover:text-white text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveAcadEdit(idx)}
                              className="px-3 py-1 rounded bg-studio-accent-blue text-white hover:bg-studio-accent-blue/90 text-[10px] font-bold shadow-sm flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={idx} 
                        draggable
                        onDragStart={() => handleDragStartItem('academic', idx)}
                        onDragOver={handleDragOverItem}
                        onDrop={() => handleDropItem('academic', idx, localAcademicTopics, setLocalAcademicTopics)}
                        className={`p-2.5 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-studio-accent-blue/20 transition ${
                          dragInfo.mode === 'academic' && dragInfo.index === idx ? 'opacity-40 border-dashed border-studio-accent-blue' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-0.5 shrink-0 text-slate-600 group-hover:text-slate-400">
                            <div className="cursor-grab active:cursor-grabbing p-0.5 hover:text-white" title="Drag to reorder">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col -space-y-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveListItem(localAcademicTopics, setLocalAcademicTopics, idx, -1)}
                                className="p-0.5 hover:text-studio-accent-blue disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === localAcademicTopics.length - 1}
                                onClick={() => moveListItem(localAcademicTopics, setLocalAcademicTopics, idx, 1)}
                                className="p-0.5 hover:text-studio-accent-blue disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{name}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(category)}`}>
                                {category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-studio-accent-blue/10 border border-studio-accent-blue/20 text-studio-accent-blue font-bold text-[9px] inline-flex items-center justify-center">
                                {sessionDisplayStr}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-slate-400 inline-flex items-center justify-center">({durMins} mins)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => {
                              setEditingAcadIndex(idx);
                              setEditAcadForm({
                                name: name,
                                sessionNames: sessionNamesArr,
                                taskType: category
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-studio-accent-blue hover:bg-studio-accent-blue/10 rounded transition"
                            type="button"
                            title="Edit Topic"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(name)}
                            className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition"
                            type="button"
                            title="Delete Topic"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>



            {/* Instructions textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Instructions</label>
              <textarea
                placeholder="Provide directions for students..."
                value={academicInstructions}
                onChange={(e) => setAcademicInstructions(e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs resize-none"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              {showAcademicSaved && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Academic saved!</span>
                </>
              )}
            </div>
            <button
              onClick={handleSaveAcademicSettings}
              disabled={savingAcademic}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-accent-blue hover:bg-studio-accent-blue/90 text-white text-xs font-semibold rounded-lg transition shadow-md disabled:opacity-50"
            >
              {savingAcademic ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save & Publish Changes
            </button>
          </div>
        </div>

        {/* 2. PRODUCTION MODE CARD (restructured with slider and cards) */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between self-stretch">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-studio-accent-purple/10 flex items-center justify-center text-studio-accent-purple">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Production Settings</h3>
                  <p className="text-[11px] text-slate-500">Pipeline project definitions</p>
                </div>
              </div>
              
              <span className="px-2 py-0.5 rounded bg-studio-accent-purple/10 text-[9px] font-bold text-studio-accent-purple border border-studio-accent-purple/20">
                {selectedBatch}
              </span>
            </div>

            {/* Add Project Sub-form */}
            <div className="space-y-3 p-4 bg-studio-950/50 border border-white/5 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                Add Project
              </label>
              
              <form onSubmit={handleAddProject} className="space-y-3.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Assign Sessions</span>
                    {(() => {
                      const totalMins = calculateCombinedSessionsDuration(projectSessions, availableSessions);
                      return totalMins > 0 ? (
                        <span className="text-studio-accent-purple font-mono font-bold text-[10px]">
                          {totalMins} mins ({Number((totalMins / 60).toFixed(2))} hr)
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-1.5 p-2 bg-studio-900 border border-white/5 rounded-xl max-h-28 overflow-y-auto">
                    {availableSessions.map((s, idx) => {
                      const isSelected = (projectSessions || []).includes(s.name);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              if (projectSessions.length > 1) {
                                setProjectSessions(projectSessions.filter(n => n !== s.name));
                              }
                            } else {
                              setProjectSessions([...projectSessions, s.name]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 inline-flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-studio-accent-purple text-white border-studio-accent-purple hover:bg-studio-accent-purple/80 shadow-sm'
                              : 'bg-studio-950 text-slate-400 border-white/5 hover:bg-studio-800 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Pipeline Stage</label>
                  <select
                    value={projectStage}
                    onChange={(e) => setProjectStage(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 text-xs font-semibold select-dark"
                  >
                    <option value="Pre Production">Pre Production</option>
                    <option value="Production">Production</option>
                    <option value="Post Production">Post Production</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white font-bold rounded-lg transition duration-200 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Project to Batch
                </button>
              </form>
            </div>

            {/* Active Projects Cards List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-studio-900/80 px-3.5 py-2 rounded-xl border border-studio-accent-purple/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Active Projects ({ localProductionProjects.length })
                </span>
                <span className="text-[10px] font-mono font-bold text-studio-accent-purple">
                  Total Topics Time: {getTopicsTotalAllocatedHours(localProductionProjects)} hr
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localProductionProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active projects for this batch.
                  </p>
                ) : (
                  localProductionProjects.map((project, idx) => {
                    const sessionNamesArr = project.sessionNames || (project.sessionName ? project.sessionName.split(', ') : [(availableSessions.find(s => s.timing === project.timing)?.name || 'Session 1')]);
                    const sessionDisplayStr = sessionNamesArr.join(', ');
                    const durMins = calculateCombinedSessionsDuration(sessionNamesArr, availableSessions) || calculateSessionDuration(project.timing) || 55;

                    const isEditing = editingProdIndex === idx;

                    if (isEditing) {
                      return (
                        <div key={idx} className="p-3 bg-studio-950 border border-studio-accent-purple/50 rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[10px] font-bold text-studio-accent-purple uppercase tracking-wider">Edit Project</span>
                            <button
                              type="button"
                              onClick={() => setEditingProdIndex(null)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editProdForm.name}
                              onChange={(e) => setEditProdForm({ ...editProdForm, name: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-lg studio-input text-slate-100 text-xs font-semibold"
                              placeholder="Project Name"
                            />
                            <div className="flex gap-2 items-center">
                              <select
                                value={editProdForm.taskType}
                                onChange={(e) => setEditProdForm({ ...editProdForm, taskType: e.target.value })}
                                className="px-2 py-1 rounded-lg studio-input text-slate-100 text-[10px] font-semibold select-dark w-1/3"
                              >
                                <option value="Pre Production">Pre Production</option>
                                <option value="Production">Production</option>
                                <option value="Post Production">Post Production</option>
                              </select>
                              <div className="flex-1 flex flex-wrap gap-1 items-center bg-studio-900 p-1.5 rounded-lg border border-white/5 max-h-20 overflow-y-auto">
                                {availableSessions.map((s, sIdx) => {
                                  const isSel = (editProdForm?.sessionNames || []).includes(s.name);
                                  return (
                                    <button
                                      type="button"
                                      key={sIdx}
                                      onClick={() => {
                                        if (isSel) {
                                          if (editProdForm.sessionNames.length > 1) {
                                            setEditProdForm({ ...editProdForm, sessionNames: editProdForm.sessionNames.filter(n => n !== s.name) });
                                          }
                                        } else {
                                          setEditProdForm({ ...editProdForm, sessionNames: [...editProdForm.sessionNames, s.name] });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                                        isSel ? 'bg-studio-accent-purple text-white border-studio-accent-purple' : 'bg-studio-950 text-slate-400 border-white/5 hover:text-white'
                                      }`}
                                    >
                                      {s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1.5 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setEditingProdIndex(null)}
                              className="px-2.5 py-1 rounded bg-studio-900 text-slate-400 hover:text-white text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveProdEdit(idx)}
                              className="px-3 py-1 rounded bg-studio-accent-purple text-white hover:bg-studio-accent-purple/90 text-[10px] font-bold shadow-sm flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={idx} 
                        draggable
                        onDragStart={() => handleDragStartItem('production', idx)}
                        onDragOver={handleDragOverItem}
                        onDrop={() => handleDropItem('production', idx, localProductionProjects, setLocalProductionProjects)}
                        className={`p-2.5 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-studio-accent-purple/20 transition ${
                          dragInfo.mode === 'production' && dragInfo.index === idx ? 'opacity-40 border-dashed border-studio-accent-purple' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-0.5 shrink-0 text-slate-600 group-hover:text-slate-400">
                            <div className="cursor-grab active:cursor-grabbing p-0.5 hover:text-white" title="Drag to reorder">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col -space-y-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveListItem(localProductionProjects, setLocalProductionProjects, idx, -1)}
                                className="p-0.5 hover:text-studio-accent-purple disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === localProductionProjects.length - 1}
                                onClick={() => moveListItem(localProductionProjects, setLocalProductionProjects, idx, 1)}
                                className="p-0.5 hover:text-studio-accent-purple disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{project.name}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(project.taskType)}`}>
                                {project.taskType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-studio-accent-purple/10 border border-studio-accent-purple/20 text-studio-accent-purple font-bold text-[9px] inline-flex items-center justify-center">
                                {sessionDisplayStr}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-slate-400 inline-flex items-center justify-center">({durMins} mins)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => {
                              setEditingProdIndex(idx);
                              setEditProdForm({
                                name: project.name,
                                sessionNames: sessionNamesArr,
                                taskType: project.taskType || 'Production'
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-studio-accent-purple hover:bg-studio-accent-purple/10 rounded transition"
                            type="button"
                            title="Edit Project"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.name)}
                            className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition"
                            type="button"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Instructions textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Instructions</label>
              <textarea
                placeholder="Provide directions for production artists..."
                value={productionInstructions}
                onChange={(e) => setProductionInstructions(e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs resize-none"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              {showProductionSaved && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Production saved!</span>
                </>
              )}
            </div>
            <button
              onClick={handleSaveProductionSettings}
              disabled={savingProduction}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white text-xs font-semibold rounded-lg transition shadow-md disabled:opacity-50"
            >
              {savingProduction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save & Publish Changes
            </button>
          </div>
        </div>

        {/* 3. RESEARCH MODE CARD */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between self-stretch">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-studio-accent-green/10 flex items-center justify-center text-studio-accent-green">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Research Settings</h3>
                  <p className="text-[11px] text-slate-500">Observations & Analysis</p>
                </div>
              </div>
              
              <span className="px-2 py-0.5 rounded bg-studio-accent-green/10 text-[9px] font-bold text-studio-accent-green border border-studio-accent-green/20">
                {selectedBatch}
              </span>
            </div>

            {/* Add Research Topic Sub-form */}
            <div className="space-y-3 p-4 bg-studio-950/50 border border-white/5 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                Add Research Topic
              </label>
              
              <form onSubmit={handleAddResearchTopic} className="space-y-3.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Topic Name (e.g. Unreal Engine 5)"
                    value={newResearchTopic}
                    onChange={(e) => setNewResearchTopic(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Assign Sessions</span>
                    {(() => {
                      const totalMins = calculateCombinedSessionsDuration(newResearchTopicSessions, availableSessions);
                      return totalMins > 0 ? (
                        <span className="text-studio-accent-green font-mono font-bold text-[10px]">
                          {totalMins} mins ({Number((totalMins / 60).toFixed(2))} hr)
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-1.5 p-2 bg-studio-900 border border-white/5 rounded-xl max-h-28 overflow-y-auto">
                    {availableSessions.map((s, idx) => {
                      const isSelected = (newResearchTopicSessions || []).includes(s.name);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              if (newResearchTopicSessions.length > 1) {
                                setNewResearchTopicSessions(newResearchTopicSessions.filter(n => n !== s.name));
                              }
                            } else {
                              setNewResearchTopicSessions([...newResearchTopicSessions, s.name]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 inline-flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-studio-accent-green text-white border-studio-accent-green hover:bg-studio-accent-green/80 shadow-sm'
                              : 'bg-studio-950 text-slate-400 border-white/5 hover:bg-studio-800 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Category</label>
                  <select
                    value={newResearchTopicCategory}
                    onChange={(e) => setNewResearchTopicCategory(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 text-xs font-semibold select-dark"
                  >
                    <option value="Observation Report">Observation Report</option>
                    <option value="Analysis Report">Analysis Report</option>
                    <option value="Review">Review</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-studio-accent-green hover:bg-studio-accent-green/90 text-white font-bold rounded-lg transition duration-200 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Topic
                </button>
              </form>
            </div>

            {/* Active Research Topics Cards List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-studio-900/80 px-3.5 py-2 rounded-xl border border-studio-accent-green/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Active Research Topics ({ localResearchTopics.length })
                </span>
                <span className="text-[10px] font-mono font-bold text-studio-accent-green">
                  Total Topics Time: {getTopicsTotalAllocatedHours(localResearchTopics)} hr
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localResearchTopics.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active research topics.
                  </p>
                ) : (
                  localResearchTopics.map((topic, idx) => {
                    const name = typeof topic === 'string' ? topic : topic.name;
                    const category = typeof topic === 'string' ? 'Observation Report' : (topic.taskType || 'Observation Report');
                    const sessionNamesArr = typeof topic === 'string'
                      ? ['Session 1']
                      : (topic.sessionNames || (topic.sessionName ? topic.sessionName.split(', ') : [(availableSessions.find(s => s.timing === topic.timing)?.name || 'Session 1')]));
                    const sessionDisplayStr = sessionNamesArr.join(', ');
                    const durMins = typeof topic === 'string'
                      ? 55
                      : (calculateCombinedSessionsDuration(sessionNamesArr, availableSessions) || calculateSessionDuration(topic.timing) || 55);

                    const isEditing = editingResearchIndex === idx;

                    if (isEditing) {
                      return (
                        <div key={idx} className="p-3 bg-studio-950 border border-emerald-500/50 rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Edit Research Topic</span>
                            <button
                              type="button"
                              onClick={() => setEditingResearchIndex(null)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editResearchForm.name}
                              onChange={(e) => setEditResearchForm({ ...editResearchForm, name: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-lg studio-input text-slate-100 text-xs font-semibold"
                              placeholder="Topic Name"
                            />
                            <div className="flex gap-2 items-center">
                              <select
                                value={editResearchForm.taskType}
                                onChange={(e) => setEditResearchForm({ ...editResearchForm, taskType: e.target.value })}
                                className="px-2 py-1 rounded-lg studio-input text-slate-100 text-[10px] font-semibold select-dark w-1/3"
                              >
                                <option value="Observation Report">Observation Report</option>
                                <option value="Analysis Report">Analysis Report</option>
                                <option value="Review">Review</option>
                              </select>
                              <div className="flex-1 flex flex-wrap gap-1 items-center bg-studio-900 p-1.5 rounded-lg border border-white/5 max-h-20 overflow-y-auto">
                                {availableSessions.map((s, sIdx) => {
                                  const isSel = (editResearchForm?.sessionNames || []).includes(s.name);
                                  return (
                                    <button
                                      type="button"
                                      key={sIdx}
                                      onClick={() => {
                                        if (isSel) {
                                          if (editResearchForm.sessionNames.length > 1) {
                                            setEditResearchForm({ ...editResearchForm, sessionNames: editResearchForm.sessionNames.filter(n => n !== s.name) });
                                          }
                                        } else {
                                          setEditResearchForm({ ...editResearchForm, sessionNames: [...editResearchForm.sessionNames, s.name] });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                                        isSel ? 'bg-emerald-500 text-black font-extrabold border-emerald-500' : 'bg-studio-950 text-slate-400 border-white/5 hover:text-white'
                                      }`}
                                    >
                                      {s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1.5 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setEditingResearchIndex(null)}
                              className="px-2.5 py-1 rounded bg-studio-900 text-slate-400 hover:text-white text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveResearchEdit(idx)}
                              className="px-3 py-1 rounded bg-emerald-500 text-black hover:bg-emerald-400 text-[10px] font-extrabold shadow-sm flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={idx} 
                        draggable
                        onDragStart={() => handleDragStartItem('research', idx)}
                        onDragOver={handleDragOverItem}
                        onDrop={() => handleDropItem('research', idx, localResearchTopics, setLocalResearchTopics)}
                        className={`p-2.5 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-emerald-500/20 transition ${
                          dragInfo.mode === 'research' && dragInfo.index === idx ? 'opacity-40 border-dashed border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-0.5 shrink-0 text-slate-600 group-hover:text-slate-400">
                            <div className="cursor-grab active:cursor-grabbing p-0.5 hover:text-white" title="Drag to reorder">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col -space-y-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveListItem(localResearchTopics, setLocalResearchTopics, idx, -1)}
                                className="p-0.5 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === localResearchTopics.length - 1}
                                onClick={() => moveListItem(localResearchTopics, setLocalResearchTopics, idx, 1)}
                                className="p-0.5 hover:text-emerald-400 disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{name}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(category)}`}>
                                {category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] inline-flex items-center justify-center">
                                {sessionDisplayStr}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-slate-400 inline-flex items-center justify-center">({durMins} mins)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => {
                              setEditingResearchIndex(idx);
                              setEditResearchForm({
                                name: name,
                                sessionNames: sessionNamesArr,
                                taskType: category
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition"
                            type="button"
                            title="Edit Topic"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResearchTopic(name)}
                            className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition"
                            type="button"
                            title="Delete Topic"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Research instructions */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Research Guidelines</label>
              <textarea
                placeholder="Provide guidelines for documentation..."
                value={researchInstructions}
                onChange={(e) => setResearchInstructions(e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs resize-none"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              {showResearchSaved && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Research saved!</span>
                </>
              )}
            </div>
            <button
              onClick={handleSaveResearchSettings}
              disabled={savingResearch}
              className="flex items-center gap-1.5 px-3 py-2 bg-studio-accent-green hover:bg-studio-accent-green/90 text-white text-xs font-semibold rounded-lg transition shadow-md disabled:opacity-50"
            >
              {savingResearch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save & Publish Changes
            </button>
          </div>
        </div>

        {/* 4. NAIL, GENAI LAB MODE CARD */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between self-stretch">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">NAIL, GenAI Lab</h3>
                  <p className="text-[11px] text-slate-500">GenAI pipeline parameters</p>
                </div>
              </div>
              
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[9px] font-bold text-amber-400 border border-amber-500/20">
                {selectedBatch}
              </span>
            </div>

            {/* Add GenAI Project Sub-form */}
            <div className="space-y-3 p-4 bg-studio-950/50 border border-white/5 rounded-2xl">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                Add GenAI Project
              </label>
              
              <form onSubmit={handleAddGenaiProject} className="space-y-3.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Project/Model Name"
                    value={newGenaiProjectName}
                    onChange={(e) => setNewGenaiProjectName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Assign Sessions</span>
                    {(() => {
                      const totalMins = calculateCombinedSessionsDuration(newGenaiProjectSessions, availableSessions);
                      return totalMins > 0 ? (
                        <span className="text-amber-400 font-mono font-bold text-[10px]">
                          {totalMins} mins ({Number((totalMins / 60).toFixed(2))} hr)
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-1.5 p-2 bg-studio-900 border border-white/5 rounded-xl max-h-28 overflow-y-auto">
                    {availableSessions.map((s, idx) => {
                      const isSelected = (newGenaiProjectSessions || []).includes(s.name);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              if (newGenaiProjectSessions.length > 1) {
                                setNewGenaiProjectSessions(newGenaiProjectSessions.filter(n => n !== s.name));
                              }
                            } else {
                              setNewGenaiProjectSessions([...newGenaiProjectSessions, s.name]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 inline-flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-500 shadow-sm'
                              : 'bg-studio-950 text-slate-400 border-white/5 hover:bg-studio-800 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Pipeline Stage</label>
                  <select
                    value={newGenaiProjectStage}
                    onChange={(e) => setNewGenaiProjectStage(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg studio-input text-slate-100 text-xs font-semibold select-dark"
                  >
                    <option value="GenAI Project">GenAI Project</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition duration-200 text-[10px] flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add GenAI Project
                </button>
              </form>
            </div>

            {/* Active GenAI Projects Cards List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-studio-900/80 px-3.5 py-2 rounded-xl border border-amber-500/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Active GenAI Projects ({ localGenaiProjects.length })
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400">
                  Total Topics Time: {getTopicsTotalAllocatedHours(localGenaiProjects)} hr
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localGenaiProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-605 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active GenAI projects for this batch.
                  </p>
                ) : (
                  localGenaiProjects.map((project, idx) => {
                    const sessionNamesArr = project.sessionNames || (project.sessionName ? project.sessionName.split(', ') : [(availableSessions.find(s => s.timing === project.timing)?.name || 'Session 1')]);
                    const sessionDisplayStr = sessionNamesArr.join(', ');
                    const durMins = calculateCombinedSessionsDuration(sessionNamesArr, availableSessions) || calculateSessionDuration(project.timing) || 55;

                    const isEditing = editingGenaiIndex === idx;

                    if (isEditing) {
                      return (
                        <div key={idx} className="p-3 bg-studio-950 border border-amber-500/50 rounded-xl space-y-3">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Edit GenAI Project</span>
                            <button
                              type="button"
                              onClick={() => setEditingGenaiIndex(null)}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editGenaiForm.name}
                              onChange={(e) => setEditGenaiForm({ ...editGenaiForm, name: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-lg studio-input text-slate-100 text-xs font-semibold"
                              placeholder="Project Name"
                            />
                            <div className="flex gap-2 items-center">
                              <select
                                value={editGenaiForm.taskType}
                                onChange={(e) => setEditGenaiForm({ ...editGenaiForm, taskType: e.target.value })}
                                className="px-2 py-1 rounded-lg studio-input text-slate-100 text-[10px] font-semibold select-dark w-1/3"
                              >
                                <option value="GenAI Project">GenAI Project</option>
                              </select>
                              <div className="flex-1 flex flex-wrap gap-1 items-center bg-studio-900 p-1.5 rounded-lg border border-white/5 max-h-20 overflow-y-auto">
                                {availableSessions.map((s, sIdx) => {
                                  const isSel = (editGenaiForm?.sessionNames || []).includes(s.name);
                                  return (
                                    <button
                                      type="button"
                                      key={sIdx}
                                      onClick={() => {
                                        if (isSel) {
                                          if (editGenaiForm.sessionNames.length > 1) {
                                            setEditGenaiForm({ ...editGenaiForm, sessionNames: editGenaiForm.sessionNames.filter(n => n !== s.name) });
                                          }
                                        } else {
                                          setEditGenaiForm({ ...editGenaiForm, sessionNames: [...editGenaiForm.sessionNames, s.name] });
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                                        isSel ? 'bg-amber-600 text-white border-amber-600' : 'bg-studio-950 text-slate-400 border-white/5 hover:text-white'
                                      }`}
                                    >
                                      {s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1.5 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setEditingGenaiIndex(null)}
                              className="px-2.5 py-1 rounded bg-studio-900 text-slate-400 hover:text-white text-[10px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveGenaiEdit(idx)}
                              className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-500 text-[10px] font-bold shadow-sm flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={idx} 
                        draggable
                        onDragStart={() => handleDragStartItem('genai', idx)}
                        onDragOver={handleDragOverItem}
                        onDrop={() => handleDropItem('genai', idx, localGenaiProjects, setLocalGenaiProjects)}
                        className={`p-2.5 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-amber-500/20 transition ${
                          dragInfo.mode === 'genai' && dragInfo.index === idx ? 'opacity-40 border-dashed border-amber-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-0.5 shrink-0 text-slate-600 group-hover:text-slate-400">
                            <div className="cursor-grab active:cursor-grabbing p-0.5 hover:text-white" title="Drag to reorder">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex flex-col -space-y-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveListItem(localGenaiProjects, setLocalGenaiProjects, idx, -1)}
                                className="p-0.5 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === localGenaiProjects.length - 1}
                                onClick={() => moveListItem(localGenaiProjects, setLocalGenaiProjects, idx, 1)}
                                className="p-0.5 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-slate-600 transition"
                                title="Move Down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{project.name}</span>
                              <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(project.taskType)}`}>
                                {project.taskType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[9px] inline-flex items-center justify-center">
                                {sessionDisplayStr}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-slate-400 inline-flex items-center justify-center">({durMins} mins)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => {
                              setEditingGenaiIndex(idx);
                              setEditGenaiForm({
                                name: project.name,
                                sessionNames: sessionNamesArr,
                                taskType: project.taskType || 'GenAI Project'
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition"
                            type="button"
                            title="Edit Project"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGenaiProject(project.name)}
                            className="p-1 text-slate-400 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition"
                            type="button"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Instructions textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Instructions</label>
              <textarea
                placeholder="Provide directions for GenAI lab..."
                value={genaiInstructions}
                onChange={(e) => setGenaiInstructions(e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-lg studio-input text-slate-100 placeholder:text-slate-705 text-xs resize-none"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              {showGenaiSaved && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>GenAI saved!</span>
                </>
              )}
            </div>
            <button
              onClick={handleSaveGenaiSettings}
              disabled={savingGenai}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition shadow-md disabled:opacity-50"
            >
              {savingGenai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save & Publish Changes
            </button>
          </div>
        </div>
      </div>

      {/* Edit Sessions Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 bg-studio-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow border-studio-accent-purple/20 max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between max-h-[85vh] relative animate-fade-in">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-studio-accent-purple to-transparent"></div>
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-studio-900/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-studio-accent-purple/10 flex items-center justify-center rounded-xl text-studio-accent-purple">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Session Times</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Configure common global session times for all class batches</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                {modalSessions.map((session, index) => {
                  const duration = calculateSessionDuration(session.timing);
                  return (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-studio-900/60 border border-white/5 rounded-2xl">
                      <div className="w-full sm:w-1/3">
                        <input
                          type="text"
                          value={session.name}
                          onChange={(e) => handleUpdateModalSession(index, 'name', e.target.value)}
                          placeholder="Session Name"
                          className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs font-semibold"
                        />
                      </div>
                      <div className="w-full sm:w-5/12">
                        <input
                          type="text"
                          value={session.timing}
                          onChange={(e) => handleUpdateModalSession(index, 'timing', e.target.value)}
                          placeholder="e.g. 09:30 AM - 10:25 AM"
                          className="w-full px-3 py-1.5 rounded-lg studio-input text-slate-100 placeholder:text-slate-700 text-xs font-mono font-medium"
                        />
                      </div>
                      <div className="w-full sm:w-2/12 text-slate-400 font-mono text-[10px] text-center font-bold">
                        {duration > 0 ? (
                          <span className="text-studio-accent-purple">{duration} mins</span>
                        ) : (
                          <span className="text-rose-500 font-semibold">Invalid format</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteModalSession(index)}
                        className="p-1.5 text-slate-500 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition shrink-0"
                        title="Delete Session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAddModalSession}
                className="w-full py-2 border border-dashed border-white/10 hover:border-studio-accent-purple/50 text-slate-400 hover:text-white rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                Add New Session
              </button>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-studio-900/40 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400 font-mono">
                Total Cumulative Time:{' '}
                <span className="text-emerald-400">
                  {(() => {
                    const totalMins = modalSessions.reduce((acc, s) => acc + calculateSessionDuration(s.timing), 0);
                    const hrs = Math.floor(totalMins / 60);
                    const mins = totalMins % 60;
                    return `${totalMins} minutes (${hrs} hour${hrs !== 1 ? 's' : ''}${mins > 0 ? `, ${mins} minute${mins !== 1 ? 's' : ''}` : ''})`;
                  })()}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSessionsModal(false)}
                  className="px-4 py-2 bg-studio-800 hover:bg-studio-700 text-white rounded-xl text-xs font-bold transition border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSessions}
                  className="px-5 py-2 bg-studio-accent-purple hover:bg-studio-accent-purple/90 text-white rounded-xl text-xs font-bold transition shadow-md shadow-glow-purple/20"
                >
                  Save Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModeSettingsTab;
