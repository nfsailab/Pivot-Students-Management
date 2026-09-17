import React, { useState, useEffect, useRef } from 'react';
import { trafficTracker } from '../utils/trafficTracker';
import { 
  X, 
  Activity, 
  Database, 
  Radio, 
  HardDrive, 
  RotateCcw, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  Info,
  Server,
  Layers
} from 'lucide-react';

function TaskManagerModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(() => trafficTracker.getTrafficStats());
  const [activeTab, setActiveTab] = useState('reads'); // 'reads', 'writes', 'streams', 'bandwidth'
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = trafficTracker.subscribe((updatedStats) => {
      setStats(updatedStats);
    });
    return () => unsub();
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // High Resolution Task Manager Canvas Plot
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Task Manager Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (8 rows)
    const rows = 6;
    for (let i = 1; i < rows; i++) {
      const y = (height / rows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines (12 columns)
    const cols = 12;
    for (let i = 1; i < cols; i++) {
      const x = (width / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const history = stats.history || [];
    if (history.length === 0) return;

    // Determine target metric based on selected tab
    let getMetricVal = (h) => h.readsRate || 0;
    let strokeColor = '#8b5cf6'; // Violet default
    let fillColorTop = 'rgba(139, 92, 246, 0.4)';
    let fillColorBottom = 'rgba(139, 92, 246, 0.02)';

    if (activeTab === 'writes') {
      getMetricVal = (h) => h.writesRate || 0;
      strokeColor = '#3b82f6'; // Blue
      fillColorTop = 'rgba(59, 130, 246, 0.4)';
      fillColorBottom = 'rgba(59, 130, 246, 0.02)';
    } else if (activeTab === 'streams') {
      getMetricVal = (h) => h.activeListeners || 0;
      strokeColor = '#10b981'; // Emerald green
      fillColorTop = 'rgba(16, 185, 129, 0.4)';
      fillColorBottom = 'rgba(16, 185, 129, 0.02)';
    } else if (activeTab === 'bandwidth') {
      getMetricVal = (h) => Math.round((h.bytes || 0) / 1024); // KB/s
      strokeColor = '#eab308'; // Amber yellow
      fillColorTop = 'rgba(234, 179, 8, 0.4)';
      fillColorBottom = 'rgba(234, 179, 8, 0.02)';
    }

    const maxVal = Math.max(10, ...history.map(getMetricVal));

    const points = history.map((pt, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const val = getMetricVal(pt);
      const normalized = val / maxVal;
      const y = height - 10 - normalized * (height - 20);
      return { x, y, val };
    });

    // Draw Filled Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fillColorTop);
    gradient.addColorStop(1, fillColorBottom);

    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach((pt, i) => {
      if (i === 0) ctx.lineTo(pt.x, pt.y);
      else {
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + pt.y) / 2);
      }
    });
    const lastPt = points[points.length - 1];
    ctx.lineTo(lastPt.x, lastPt.y);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Smooth Line
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = strokeColor;
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else {
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + pt.y) / 2);
      }
    });
    ctx.stroke();

    // Pulse dot on current live value
    if (lastPt) {
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = strokeColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 9, 0, 2 * Math.PI);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

  }, [isOpen, stats, activeTab]);

  if (!isOpen) return null;

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  };

  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' Bytes';
  };

  // Peak rate calculation
  const history = stats.history || [];
  const peakReads = Math.max(0, ...history.map(h => h.readsRate || 0));
  const peakWrites = Math.max(0, ...history.map(h => h.writesRate || 0));
  const avgOpsRate = (history.reduce((acc, h) => acc + (h.opsRate || 0), 0) / (history.length || 1)).toFixed(1);

  const handleSimulateOps = () => {
    trafficTracker.simulateOps(50, 10);
  };

  const handleResetCounters = () => {
    if (confirm('Reset daily quota usage counters for today?')) {
      trafficTracker.resetDailyStats();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 pointer-events-auto font-sans">
      <div className="w-full max-w-4xl bg-studio-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-studio-950/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-studio-accent-purple/15 border border-studio-accent-purple/30 flex items-center justify-center text-studio-accent-purple shadow-glow-purple">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide uppercase">
                  Task Manager — Performance Monitor
                </h3>
                <span className="text-[10px] bg-studio-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-white/5">
                  Firebase Spark Quota
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Real-time throughput telemetry & daily usage capacity vs free quotas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-studio-800 transition border border-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Tabs (Task Manager Left Column) */}
          <div className="w-64 bg-studio-950/60 border-r border-white/5 p-4 space-y-2 shrink-0 overflow-y-auto">
            
            {/* Tab: Reads */}
            <button
              onClick={() => setActiveTab('reads')}
              className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                activeTab === 'reads' 
                  ? 'bg-studio-accent-purple/20 border-studio-accent-purple/40 text-white shadow-glow-purple' 
                  : 'bg-studio-900/50 border-white/5 text-slate-400 hover:bg-studio-800/60 hover:text-white'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-studio-accent-purple" />
                  <span className="text-xs font-bold">Document Reads</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 font-semibold">
                  {formatNumber(stats.dailyReads)} / 50k
                </p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                stats.readPct >= 90 ? 'bg-rose-500/20 text-rose-400' : stats.readPct >= 70 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
              }`}>
                {stats.readPct}%
              </span>
            </button>

            {/* Tab: Writes */}
            <button
              onClick={() => setActiveTab('writes')}
              className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                activeTab === 'writes' 
                  ? 'bg-blue-500/20 border-blue-500/40 text-white shadow-glow-blue' 
                  : 'bg-studio-900/50 border-white/5 text-slate-400 hover:bg-studio-800/60 hover:text-white'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold">Document Writes</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 font-semibold">
                  {formatNumber(stats.dailyWrites)} / 20k
                </p>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                stats.writePct >= 90 ? 'bg-rose-500/20 text-rose-400' : stats.writePct >= 70 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
              }`}>
                {stats.writePct}%
              </span>
            </button>

            {/* Tab: Snapshot Streams */}
            <button
              onClick={() => setActiveTab('streams')}
              className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                activeTab === 'streams' 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-white' 
                  : 'bg-studio-900/50 border-white/5 text-slate-400 hover:bg-studio-800/60 hover:text-white'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold">Snapshot Streams</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 font-semibold">
                  {stats.activeListenersCount} Active Stream(s)
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                Max 100
              </span>
            </button>

            {/* Tab: Data & Bandwidth */}
            <button
              onClick={() => setActiveTab('bandwidth')}
              className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                activeTab === 'bandwidth' 
                  ? 'bg-amber-500/20 border-amber-500/40 text-white' 
                  : 'bg-studio-900/50 border-white/5 text-slate-400 hover:bg-studio-800/60 hover:text-white'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold">Network Bandwidth</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 font-semibold">
                  {formatBytes(stats.dailyBytes)}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {stats.bytesPct}%
              </span>
            </button>

            {/* Quick Actions Panel */}
            <div className="pt-4 space-y-2 border-t border-white/5">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block px-1">
                Telemetry Actions
              </span>
              <button
                onClick={handleSimulateOps}
                className="w-full py-2 px-3 bg-studio-800 hover:bg-studio-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/5 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5 text-studio-accent-purple" />
                Simulate Ops Spike
              </button>

              <button
                onClick={handleResetCounters}
                className="w-full py-2 px-3 bg-studio-950 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 text-xs font-semibold rounded-xl border border-white/5 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Today's Counters
              </button>
            </div>

          </div>

          {/* Right Main Chart & Stats Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-studio-950/40">
            
            {/* Top Metric Header */}
            <div className="flex items-center justify-between bg-studio-900/60 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                  {activeTab === 'reads' && 'Firestore Daily Read Operations'}
                  {activeTab === 'writes' && 'Firestore Daily Write Operations'}
                  {activeTab === 'streams' && 'Active Snapshot Subscriptions'}
                  {activeTab === 'bandwidth' && 'Estimated Payload Data Transferred'}
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {activeTab === 'reads' && `${formatNumber(stats.dailyReads)} reads`}
                    {activeTab === 'writes' && `${formatNumber(stats.dailyWrites)} writes`}
                    {activeTab === 'streams' && `${stats.activeListenersCount} streams`}
                    {activeTab === 'bandwidth' && formatBytes(stats.dailyBytes)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeTab === 'reads' && `Quota: 50,000 / day (${stats.readPct}%)`}
                    {activeTab === 'writes' && `Quota: 20,000 / day (${stats.writePct}%)`}
                    {activeTab === 'streams' && `Max concurrent: 100`}
                    {activeTab === 'bandwidth' && `Limit: 1 GiB / day (${stats.bytesPct}%)`}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                stats.status === 'exceeded' || stats.status === 'warning'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : stats.status === 'caution'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}>
                {stats.status === 'normal' ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {stats.statusText}
              </div>
            </div>

            {/* Task Manager High-Res Line Graph */}
            <div className="bg-studio-900 rounded-2xl p-4 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1">
                <span>Throughput Graph (Last 60 Seconds)</span>
                <span className="text-studio-accent-purple font-bold">
                  Current: {stats.currentOpsRate} ops/sec • Avg: {avgOpsRate} ops/sec
                </span>
              </div>

              <canvas 
                ref={canvasRef} 
                width={650} 
                height={200} 
                className="w-full h-52 block rounded-xl bg-studio-950 border border-white/5"
              />
            </div>

            {/* Grid Metrics breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Peak Throughput</span>
                <span className="text-xl font-mono font-extrabold text-white mt-1 block">
                  {Math.max(peakReads, peakWrites)} ops/sec
                </span>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Streams</span>
                <span className="text-xl font-mono font-extrabold text-white mt-1 block">
                  {stats.activeListenersCount} connections
                </span>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Today's Total Ops</span>
                <span className="text-xl font-mono font-extrabold text-white mt-1 block">
                  {formatNumber(stats.dailyReads + stats.dailyWrites)} ops
                </span>
              </div>
            </div>

            {/* Collection Streams Breakdown */}
            {activeTab === 'streams' && (
              <div className="bg-studio-900 p-4 rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" /> Active Listener Breakdown per Collection
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(stats.collectionBreakdown).length === 0 ? (
                    <p className="text-xs text-slate-500 col-span-2 py-2">No active snapshot listeners currently connected.</p>
                  ) : (
                    Object.entries(stats.collectionBreakdown).map(([coll, count]) => (
                      <div key={coll} className="flex justify-between items-center p-2.5 bg-studio-950 rounded-xl border border-white/5 text-xs">
                        <span className="font-mono text-slate-300">{coll}</span>
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {count} stream(s)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Quota Recommendations & Tips */}
            <div className="bg-studio-900/60 p-4 rounded-2xl border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Info className="h-4 w-4 text-studio-accent-purple" /> Quota Optimization & Best Practices
              </h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>Firebase Spark Free Tier resets quotas automatically at midnight UTC daily.</li>
                <li>Each active student workstation sending regular heartbeats consumes minor write & read operations.</li>
                <li>Closing unused browser tabs or exiting the dashboard when not in use stops real-time snapshot listeners.</li>
              </ul>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-studio-950 border-t border-white/5 flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>Date: {stats.date}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-studio-800 hover:bg-studio-700 text-white font-bold rounded-xl transition text-xs border border-white/5"
          >
            Close Task Manager
          </button>
        </div>

      </div>
    </div>
  );
}

export default TaskManagerModal;
