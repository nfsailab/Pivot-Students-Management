// Preload script exposing safe IPC channels
const { contextBridge, ipcRenderer } = require('electron');

// Parse additionalArguments to get the running mode passed from the main process
const modeArg = process.argv.find(arg => arg.startsWith('--app-mode='));
const appMode = modeArg ? modeArg.split('=')[1] : 'welcome';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppMode: () => appMode,
  getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time'),
  quitApp: () => ipcRenderer.send('quit-app'),
  startSession: () => ipcRenderer.send('session-start'),
  endSession: () => ipcRenderer.send('session-end'),
  proceedShutdown: () => ipcRenderer.send('proceed-shutdown'),
  proceedRestart: () => ipcRenderer.send('proceed-restart'),
  autoLogoutCompleted: () => ipcRenderer.send('auto-logout-completed'),
  timeOver: () => ipcRenderer.send('time-over'),
  minimizeWidget: () => ipcRenderer.send('widget-minimize'),
  maximizeWidget: () => ipcRenderer.send('widget-maximize'),
  showNotification: (msg) => ipcRenderer.send('show-notification', msg),
  closeNotification: () => ipcRenderer.send('notification-closed'),
  clickNotification: () => ipcRenderer.send('notification-clicked'),
  onNotificationMessage: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('notification-message', listener);
    return () => ipcRenderer.removeListener('notification-message', listener);
  },
  onFocusMessage: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('focus-message', listener);
    return () => ipcRenderer.removeListener('focus-message', listener);
  },
  onShutdownAttempt: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('shutdown-attempt', listener);
    return () => ipcRenderer.removeListener('shutdown-attempt', listener);
  },
  onPerformAutoLogout: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('perform-auto-logout', listener);
    return () => ipcRenderer.removeListener('perform-auto-logout', listener);
  },
  onEmergencyExitCleanup: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('emergency-exit-cleanup', listener);
    return () => ipcRenderer.removeListener('emergency-exit-cleanup', listener);
  },
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  startUpdateDownload: () => ipcRenderer.send('start-update-download'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateStatus: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  onUpdateAvailable: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateNotAvailable: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('update-not-available', listener);
    return () => ipcRenderer.removeListener('update-not-available', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});

console.log('Preload script loaded successfully. Mode:', appMode);
