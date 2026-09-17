import React, { useState, useEffect, useRef } from 'react';
import { trafficTracker } from '../utils/trafficTracker';
import { Activity, Maximize2, AlertTriangle, ShieldCheck, Zap, Radio } from 'lucide-react';

function CapacityMeter({ onOpenTaskManager }) {
  const [stats, setStats] = useState(() => trafficTracker.getTrafficStats());
  const canvasRef = useRef(null);

  useEffect(() => {
    const unsub = trafficTracker.subscribe((updatedStats) => {
      setStats(updatedStats);
    });
    return () => unsub();
  }, []);

  // Render Task Manager Sparkline Graph on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Task Manager Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const rows = 4;
    for (let i = 1; i < rows; i++) {
      const y = (height / rows) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const cols = 8;
    for (let i = 1; i < cols; i++) {
      const x = (width / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const history = stats.history || [];
    if (history.length === 0) return;

    // Find max value in history (min scale 10 ops/sec for nice visuals)
    const maxVal = Math.max(10, ...history.map(h => h.opsRate || 0));

    const points = history.map((pt, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const normalized = (pt.opsRate || 0) / maxVal;
      // Leave 4px padding top/bottom
      const y = height - 4 - normalized * (height - 8);
      return { x, y, opsRate: pt.opsRate };
    });

    // Determine graph color scheme based on current status
    let strokeColor = '#8b5cf6'; // Violet default
    let fillColorTop = 'rgba(139, 92, 246, 0.35)';
    let fillColorBottom = 'rgba(139, 92, 246, 0.0)';

    if (stats.status === 'exceeded' || stats.status === 'warning') {
      strokeColor = '#f43f5e'; // Rose red
      fillColorTop = 'rgba(244, 63, 94, 0.4)';
      fillColorBottom = 'rgba(244, 63, 94, 0.0)';
    } else if (stats.status === 'caution') {
      strokeColor = '#f59e0b'; // Amber yellow
      fillColorTop = 'rgba(245, 158, 11, 0.4)';
      fillColorBottom = 'rgba(245, 158, 11, 0.0)';
    }

    // Draw Filled Area Under Graph
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fillColorTop);
    gradient.addColorStop(1, fillColorBottom);

    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach((pt, i) => {
      if (i === 0) ctx.lineTo(pt.x, pt.y);
      else {
        // Smooth curve
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

    // Draw Line
    ctx.beginPath();
    ctx.lineWidth = 1.8;
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

    // Draw Pulse Dot on the latest rightmost data point
    if (lastPt) {
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = strokeColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 6, 0, 2 * Math.PI);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

  }, [stats]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  };

  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  // Color mapping based on percentage
  const getProgressBarColor = (pct) => {
    if (pct >= 90) return 'bg-rose-500 shadow-glow-rose';
    if (pct >= 70) return 'bg-amber-500 shadow-glow-amber';
    return 'bg-gradient-to-r from-studio-accent-purple to-cyan-400';
  };

  const getStatusBadge = () => {
    switch(stats.status) {
      case 'exceeded':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500 animate-pulse',
          icon: AlertTriangle,
          label: 'QUOTA EXCEEDED'
        };
      case 'warning':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-400 animate-pulse',
          icon: AlertTriangle,
          label: 'CRITICAL (>90%)'
        };
      case 'caution':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
          icon: AlertTriangle,
          label: 'HIGH TRAFFIC'
        };
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
          icon: ShieldCheck,
          label: 'NORMAL'
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <div className="mx-4 my-3 bg-studio-950/80 rounded-2xl border border-white/5 p-3.5 space-y-3 relative group transition duration-300 hover:border-studio-accent-purple/30 shadow-inner">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-studio-accent-purple animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
            Performance
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusBadge.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
            {statusBadge.label}
          </span>

          {/* Expand to Task Manager Button */}
          <button
            onClick={onOpenTaskManager}
            title="Open Task Manager Performance Monitor"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Task Manager Sparkline Graph */}
      <div 
        onClick={onOpenTaskManager}
        className="relative bg-studio-900/90 rounded-xl p-2 border border-white/5 cursor-pointer overflow-hidden group/graph hover:border-studio-accent-purple/40 transition"
      >
        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-mono">
          <span className="flex items-center gap-1 text-slate-400 font-semibold">
            <Zap className="h-3 w-3 text-studio-accent-purple" />
            Live Ops: <strong className="text-white ml-0.5">{stats.currentOpsRate} ops/s</strong>
          </span>
          <span className="text-[9px] text-slate-500 font-sans uppercase tracking-tight">60s rolling</span>
        </div>

        <canvas 
          ref={canvasRef} 
          width={220} 
          height={48} 
          className="w-full h-12 block rounded"
        />

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-studio-950/40 opacity-0 group-hover/graph:opacity-100 flex items-center justify-center transition backdrop-blur-[1px]">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 bg-studio-900/90 px-2.5 py-1 rounded-lg border border-studio-accent-purple/30 shadow-glow-purple">
            <Maximize2 className="h-3 w-3 text-studio-accent-purple" /> Task Manager
          </span>
        </div>
      </div>

      {/* Quota Progress Bars */}
      <div className="space-y-2">
        {/* Reads Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Reads (50k limit)</span>
            <span className="font-mono text-white font-bold">
              {formatNumber(stats.dailyReads)} / 50k <span className="text-slate-400 font-normal">({stats.readPct}%)</span>
            </span>
          </div>
          <div className="w-full bg-studio-900 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-500 ${getProgressBarColor(stats.readPct)}`}
              style={{ width: `${Math.min(100, stats.readPct)}%` }}
            />
          </div>
        </div>

        {/* Writes Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Writes (20k limit)</span>
            <span className="font-mono text-white font-bold">
              {formatNumber(stats.dailyWrites)} / 20k <span className="text-slate-400 font-normal">({stats.writePct}%)</span>
            </span>
          </div>
          <div className="w-full bg-studio-900 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div 
              className={`h-full transition-all duration-500 ${getProgressBarColor(stats.writePct)}`}
              style={{ width: `${Math.min(100, stats.writePct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sub-Footer Summary Stats */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-white/5 font-mono">
        <span className="flex items-center gap-1">
          <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
          <strong className="text-slate-300">{stats.activeListenersCount}</strong> Streams
        </span>
        <span>
          Est. Data: <strong className="text-slate-300">{formatBytes(stats.dailyBytes)}</strong>
        </span>
      </div>

      {/* High Usage Warning Banner if Caution/Warning */}
      {(stats.status === 'caution' || stats.status === 'warning' || stats.status === 'exceeded') && (
        <div 
          onClick={onOpenTaskManager}
          className={`p-2 rounded-xl text-[10px] flex items-center gap-2 cursor-pointer transition border ${
            stats.status === 'exceeded' || stats.status === 'warning'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 animate-bounce" />
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{stats.statusText}</p>
            <p className="text-[9px] opacity-80 truncate">Click to view Task Manager recommendations</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CapacityMeter;
