/**
 * TrafficTracker - Real-time Firestore Telemetry & Quota Monitoring Module
 * 
 * Tracks Firestore read/write/delete ops, active snapshot listeners, and estimated bandwidth.
 * Persists daily usage to localStorage under date-stamped keys.
 * Maintains rolling 60-second throughput history for Task Manager graphs.
 */

// Default Firebase Spark (Free Tier) Limits
export const DEFAULT_QUOTAS = {
  dailyReads: 50000,
  dailyWrites: 20000,
  dailyDeletes: 20000,
  maxListeners: 100,
  dailyBytes: 1024 * 1024 * 1024 // 1 GiB
};

const getTodayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

class TrafficTracker {
  constructor() {
    this.listeners = new Set();
    this.activeStreams = new Map(); // id -> collectionName
    this.recentOpsInCurrentSecond = { reads: 0, writes: 0, deletes: 0, bytes: 0 };
    
    // Rolling 60-second throughput history for Task Manager sparkline graph
    this.historyLength = 60;
    this.history = [];
    
    // Initialize 60 empty slots
    const now = Date.now();
    for (let i = this.historyLength - 1; i >= 0; i--) {
      this.history.push({
        timestamp: now - i * 1000,
        reads: 0,
        writes: 0,
        deletes: 0,
        opsRate: 0,
        readsRate: 0,
        writesRate: 0,
        activeListeners: 0
      });
    }

    // Load initial daily counters
    this.todayDate = getTodayKey();
    this.loadDailyCounters();

    // Start 1-second interval ticker for rolling history & ops/sec rate
    if (typeof window !== 'undefined') {
      setInterval(() => this.tickSecond(), 1000);
    }
  }

  loadDailyCounters() {
    const today = getTodayKey();
    if (this.todayDate !== today) {
      this.todayDate = today;
    }

    this.dailyReads = parseInt(localStorage.getItem(`vfx_quota_reads_${today}`) || '0', 10);
    this.dailyWrites = parseInt(localStorage.getItem(`vfx_quota_writes_${today}`) || '0', 10);
    this.dailyDeletes = parseInt(localStorage.getItem(`vfx_quota_deletes_${today}`) || '0', 10);
    this.dailyBytes = parseInt(localStorage.getItem(`vfx_quota_bytes_${today}`) || '0', 10);
  }

  saveDailyCounters() {
    const today = getTodayKey();
    localStorage.setItem(`vfx_quota_reads_${today}`, String(this.dailyReads));
    localStorage.setItem(`vfx_quota_writes_${today}`, String(this.dailyWrites));
    localStorage.setItem(`vfx_quota_deletes_${today}`, String(this.dailyDeletes));
    localStorage.setItem(`vfx_quota_bytes_${today}`, String(this.dailyBytes));
  }

  tickSecond() {
    // Check if day rolled over
    const today = getTodayKey();
    if (today !== this.todayDate) {
      this.todayDate = today;
      this.loadDailyCounters();
    }

    const currentReads = this.recentOpsInCurrentSecond.reads;
    const currentWrites = this.recentOpsInCurrentSecond.writes;
    const currentDeletes = this.recentOpsInCurrentSecond.deletes;
    const currentBytes = this.recentOpsInCurrentSecond.bytes;

    // Reset current second bucket
    this.recentOpsInCurrentSecond = { reads: 0, writes: 0, deletes: 0, bytes: 0 };

    const totalOps = currentReads + currentWrites + currentDeletes;
    const activeCount = this.activeStreams.size;

    // Push new data point to history
    this.history.shift();
    this.history.push({
      timestamp: Date.now(),
      reads: currentReads,
      writes: currentWrites,
      deletes: currentDeletes,
      bytes: currentBytes,
      opsRate: totalOps,
      readsRate: currentReads,
      writesRate: currentWrites,
      activeListeners: activeCount
    });

    this.notifySubscribers();
  }

  recordRead(count = 1, estimatedBytes = 250) {
    if (count <= 0) return;
    this.loadDailyCounters();
    this.dailyReads += count;
    const bytesTotal = count * estimatedBytes;
    this.dailyBytes += bytesTotal;
    this.recentOpsInCurrentSecond.reads += count;
    this.recentOpsInCurrentSecond.bytes += bytesTotal;
    this.saveDailyCounters();
    this.notifySubscribers();
  }

  recordWrite(count = 1, estimatedBytes = 500) {
    if (count <= 0) return;
    this.loadDailyCounters();
    this.dailyWrites += count;
    const bytesTotal = count * estimatedBytes;
    this.dailyBytes += bytesTotal;
    this.recentOpsInCurrentSecond.writes += count;
    this.recentOpsInCurrentSecond.bytes += bytesTotal;
    this.saveDailyCounters();
    this.notifySubscribers();
  }

  recordDelete(count = 1) {
    if (count <= 0) return;
    this.loadDailyCounters();
    this.dailyDeletes += count;
    this.recentOpsInCurrentSecond.deletes += count;
    this.saveDailyCounters();
    this.notifySubscribers();
  }

  registerListener(streamId, collectionName = 'unknown') {
    this.activeStreams.set(streamId, collectionName);
    this.notifySubscribers();
  }

  unregisterListener(streamId) {
    this.activeStreams.delete(streamId);
    this.notifySubscribers();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    // Send immediate initial data
    callback(this.getTrafficStats());

    return () => {
      this.listeners.delete(callback);
    };
  }

  notifySubscribers() {
    const stats = this.getTrafficStats();
    this.listeners.forEach(cb => {
      try {
        cb(stats);
      } catch (err) {
        console.error('Error in traffic tracker listener callback:', err);
      }
    });
  }

  resetDailyStats() {
    const today = getTodayKey();
    this.dailyReads = 0;
    this.dailyWrites = 0;
    this.dailyDeletes = 0;
    this.dailyBytes = 0;
    this.saveDailyCounters();
    this.notifySubscribers();
  }

  simulateOps(reads = 0, writes = 0) {
    if (reads > 0) this.recordRead(reads);
    if (writes > 0) this.recordWrite(writes);
  }

  getTrafficStats() {
    const readPct = (this.dailyReads / DEFAULT_QUOTAS.dailyReads) * 100;
    const writePct = (this.dailyWrites / DEFAULT_QUOTAS.dailyWrites) * 100;
    const deletePct = (this.dailyDeletes / DEFAULT_QUOTAS.dailyDeletes) * 100;
    const bytesPct = (this.dailyBytes / DEFAULT_QUOTAS.dailyBytes) * 100;

    const maxPct = Math.max(readPct, writePct, deletePct);

    let status = 'normal'; // 'normal', 'caution', 'warning', 'exceeded'
    let statusText = 'NORMAL';

    if (maxPct >= 100) {
      status = 'exceeded';
      statusText = 'QUOTA EXCEEDED';
    } else if (maxPct >= 90) {
      status = 'warning';
      statusText = 'CRITICAL (>90%)';
    } else if (maxPct >= 70) {
      status = 'caution';
      statusText = 'HIGH TRAFFIC (>70%)';
    }

    // Active streams collection breakdown
    const collectionBreakdown = {};
    this.activeStreams.forEach((coll) => {
      collectionBreakdown[coll] = (collectionBreakdown[coll] || 0) + 1;
    });

    const latestPoint = this.history[this.history.length - 1] || {};

    return {
      date: this.todayDate,
      dailyReads: this.dailyReads,
      dailyWrites: this.dailyWrites,
      dailyDeletes: this.dailyDeletes,
      dailyBytes: this.dailyBytes,
      
      quotas: DEFAULT_QUOTAS,
      
      readPct: Number(readPct.toFixed(1)),
      writePct: Number(writePct.toFixed(1)),
      deletePct: Number(deletePct.toFixed(1)),
      bytesPct: Number(bytesPct.toFixed(1)),
      maxPct: Number(maxPct.toFixed(1)),

      status,
      statusText,

      activeListenersCount: this.activeStreams.size,
      collectionBreakdown,

      currentOpsRate: latestPoint.opsRate || 0,
      currentReadsRate: latestPoint.readsRate || 0,
      currentWritesRate: latestPoint.writesRate || 0,

      history: [...this.history]
    };
  }
}

// Singleton instance
export const trafficTracker = new TrafficTracker();
export default trafficTracker;
