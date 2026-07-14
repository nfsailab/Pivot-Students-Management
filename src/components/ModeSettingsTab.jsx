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
  Sparkles
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
// Main Mode Settings Panel Component
// ----------------------------------------------------
function ModeSettingsTab() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');

  const [academicSettingsList, setAcademicSettingsList] = useState([]);
  const [productionSettingsList, setProductionSettingsList] = useState([]);
  const [research, setResearch] = useState(null);
  const [genaiSettingsList, setGenaiSettingsList] = useState([]);

  const [loading, setLoading] = useState(true);

  // Academic inputs
  const [newTopic, setNewTopic] = useState('');
  const [newTopicTiming, setNewTopicTiming] = useState('09:00 AM - 01:00 PM');
  const [newTopicCategory, setNewTopicCategory] = useState('SAX');
  const [academicInstructions, setAcademicInstructions] = useState('');
  const [academicTimeslot, setAcademicTimeslot] = useState('09:00 AM - 01:00 PM');

  // Production Project inputs
  const [projectName, setProjectName] = useState('');
  const [projectTiming, setProjectTiming] = useState('02:00 PM - 06:00 PM');
  const [projectStage, setProjectStage] = useState('Production');

  // Research inputs
  const [newResearchTopic, setNewResearchTopic] = useState('');
  const [newResearchTopicTiming, setNewResearchTopicTiming] = useState('09:00 AM - 01:00 PM');
  const [newResearchTopicCategory, setNewResearchTopicCategory] = useState('Observation Report');
  const [researchInstructions, setResearchInstructions] = useState('');

  // GenAI Lab inputs
  const [newGenaiProjectName, setNewGenaiProjectName] = useState('');
  const [newGenaiProjectTiming, setNewGenaiProjectTiming] = useState('09:00 AM - 01:00 PM');
  const [newGenaiProjectStage, setNewGenaiProjectStage] = useState('GenAI Project');
  const [genaiInstructions, setGenaiInstructions] = useState('');
  const [productionInstructions, setProductionInstructions] = useState('');

  // Local state for manual-save architecture
  const [localAcademicTopics, setLocalAcademicTopics] = useState([]);
  const [localProductionProjects, setLocalProductionProjects] = useState([]);
  const [localResearchTopics, setLocalResearchTopics] = useState([]);
  const [localGenaiProjects, setLocalGenaiProjects] = useState([]);

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
      const sorted = [...data].sort((a, b) => a.batchName.localeCompare(b.batchName));
      setBatches(sorted);
      if (sorted.length > 0 && !selectedBatch) {
        setSelectedBatch(sorted[0].batchName);
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
  const handleAddTopic = (e) => {
    e.preventDefault();
    if (!newTopic.trim() || !newTopicTiming.trim() || !selectedBatch) return;
    
    const newTopicObj = {
      name: newTopic.trim(),
      timing: newTopicTiming.trim(),
      taskType: newTopicCategory
    };

    setLocalAcademicTopics([...localAcademicTopics, newTopicObj]);
    setNewTopic('');
    setNewTopicTiming('09:00 AM - 01:00 PM');
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
        timeslot: academicTimeslot
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
    if (!projectName.trim() || !projectTiming.trim() || !selectedBatch) return;

    const newProjectObj = {
      name: projectName.trim(),
      timing: projectTiming.trim(),
      taskType: projectStage
    };

    setLocalProductionProjects([...localProductionProjects, newProjectObj]);
    setProjectName('');
    setProjectTiming('02:00 PM - 06:00 PM');
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
        instructions: productionInstructions
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
    if (!newResearchTopic.trim() || !newResearchTopicTiming.trim() || !research) return;

    const newTopicObj = {
      name: newResearchTopic.trim(),
      timing: newResearchTopicTiming.trim(),
      taskType: newResearchTopicCategory
    };

    setLocalResearchTopics([...localResearchTopics, newTopicObj]);
    setNewResearchTopic('');
    setNewResearchTopicTiming('09:00 AM - 01:00 PM');
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
        instructions: researchInstructions
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
    if (!newGenaiProjectName.trim() || !newGenaiProjectTiming.trim() || !selectedBatch) return;

    const newProjectObj = {
      name: newGenaiProjectName.trim(),
      timing: newGenaiProjectTiming.trim(),
      taskType: newGenaiProjectStage
    };

    setLocalGenaiProjects([...localGenaiProjects, newProjectObj]);
    setNewGenaiProjectName('');
    setNewGenaiProjectTiming('09:00 AM - 01:00 PM');
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
        instructions: genaiInstructions
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
      <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-start gap-4">
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

                <TimeRangeSlider
                  label="Topic Timings"
                  value={newTopicTiming}
                  onChange={setNewTopicTiming}
                />

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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Active Topics ({ localAcademicTopics.length })
              </label>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localAcademicTopics.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active topics for this batch.
                  </p>
                ) : (
                  localAcademicTopics.map((topic, idx) => {
                    const name = typeof topic === 'string' ? topic : topic.name;
                    const timing = typeof topic === 'string' ? academicTimeslot : (topic.timing || academicTimeslot);
                    const category = typeof topic === 'string' ? 'Lecture' : (topic.taskType || 'Lecture');
                    return (
                      <div 
                        key={idx} 
                        className="p-3 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-studio-accent-blue/20 transition hover-glow"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{name}</span>
                            <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(category)}`}>
                              {category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                            <Clock className="h-3 w-3 text-studio-accent-blue" />
                            <span>{timing}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTopic(name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition shrink-0"
                          type="button"
                          title="Delete Topic"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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

            {/* c. Add Project Sub-form (clean labels and placeholders) */}
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

                {/* b. Timing slider for production project */}
                <TimeRangeSlider
                  label="Shift Timings"
                  value={projectTiming}
                  onChange={setProjectTiming}
                />

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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Active Projects ({ localProductionProjects.length })
              </label>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localProductionProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active projects for this batch.
                  </p>
                ) : (
                  localProductionProjects.map((project, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-studio-accent-purple/20 transition hover-glow"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{project.name}</span>
                          <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(project.taskType)}`}>
                            {project.taskType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <Clock className="h-3 w-3 text-studio-accent-purple" />
                          <span>{project.timing}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteProject(project.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition shrink-0"
                        type="button"
                        title="Delete Project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
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

                <TimeRangeSlider
                  label="Topic Timings"
                  value={newResearchTopicTiming}
                  onChange={setNewResearchTopicTiming}
                />

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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Active Research Topics ({ localResearchTopics.length })
              </label>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localResearchTopics.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active research topics.
                  </p>
                ) : (
                  localResearchTopics.map((topic, idx) => {
                    const name = typeof topic === 'string' ? topic : topic.name;
                    const timing = typeof topic === 'string' ? '09:00 AM - 01:00 PM' : (topic.timing || '09:00 AM - 01:00 PM');
                    const category = typeof topic === 'string' ? 'Observation Report' : (topic.taskType || 'Observation Report');
                    return (
                      <div 
                        key={idx} 
                        className="p-3 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-emerald-500/20 transition hover-glow"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{name}</span>
                            <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(category)}`}>
                              {category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                            <Clock className="h-3 w-3 text-studio-accent-green" />
                            <span>{timing}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteResearchTopic(name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition shrink-0"
                          type="button"
                          title="Delete Topic"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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

                <TimeRangeSlider
                  label="Shift Timings"
                  value={newGenaiProjectTiming}
                  onChange={setNewGenaiProjectTiming}
                />

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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Active GenAI Projects ({ localGenaiProjects.length })
              </label>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {localGenaiProjects.length === 0 ? (
                  <p className="text-[10px] text-slate-605 text-center py-4 bg-studio-900 border border-white/5 rounded-xl">
                    No active GenAI projects for this batch.
                  </p>
                ) : (
                  localGenaiProjects.map((project, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-studio-900 border border-white/5 rounded-xl flex items-center justify-between group hover:border-amber-500/20 transition hover-glow"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{project.name}</span>
                          <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wide leading-none shrink-0 ${getStageBadgeColor(project.taskType)}`}>
                            {project.taskType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>{project.timing}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGenaiProject(project.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-studio-accent-red hover:bg-studio-accent-red/10 rounded transition shrink-0"
                        type="button"
                        title="Delete Project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
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
    </div>
  );
}

export default ModeSettingsTab;
