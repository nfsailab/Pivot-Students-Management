const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { spawn } = require('child_process');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = true;
autoUpdater.allowDowngrade = false;

let mainWindow;
let notificationWindow;
let isMinimizedState = false;
let logFilePath = '';
let watchdogProcess = null;

function logToFile(msg) {
  if (!logFilePath) return;
  try {
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err) {}
}

// Read running mode from product name or command line or environment
const appName = app.getName().toLowerCase();
// Ensure we match specifically student client vs HOD Dashboard
const isStudentMode = appName.includes('student') || process.argv.includes('--student') || process.argv.some(a => a.toLowerCase().includes('student')) || process.env.VITE_APP_MODE === 'student';
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let isSessionActive = false;
let allowAppQuit = false;

// Spawns the watchdog.exe process in student production mode
function startWatchdog() {
  if (!isStudentMode || isDev) return;
  
  const watchdogPath = path.join(__dirname, 'watchdog.exe').replace('app.asar', 'app.asar.unpacked');
  const clientPath = app.getPath('exe');

  logToFile(`Spawning watchdog process: ${watchdogPath} for PID: ${process.pid}`);

  if (!fs.existsSync(watchdogPath)) {
    logToFile(`Watchdog executable not found at ${watchdogPath}. Skipping watchdog spawn.`);
    return;
  }

  try {
    watchdogProcess = spawn(watchdogPath, [process.pid.toString(), clientPath], {
      detached: true,
      stdio: 'ignore'
    });

    watchdogProcess.on('error', (err) => {
      logToFile(`Watchdog process error: ${err.message}`);
      watchdogProcess = null;
    });

    watchdogProcess.on('exit', (code) => {
      logToFile(`Watchdog process exited with code ${code}`);
      watchdogProcess = null;

      // If the client is not closing normally, restart the watchdog
      if (!allowAppQuit) {
        logToFile('Watchdog exited unexpectedly. Restarting watchdog in 1s...');
        setTimeout(startWatchdog, 1000);
      }
    });

    watchdogProcess.unref();
  } catch (err) {
    logToFile(`Failed to spawn watchdog process: ${err.message}`);
  }
}

// Safely terminates the watchdog process before app shutdown
function killWatchdog() {
  allowAppQuit = true;
  if (watchdogProcess) {
    logToFile('Killing watchdog process as part of authorized application exit.');
    try {
      watchdogProcess.kill();
    } catch (e) {
      logToFile(`Error killing watchdog: ${e.message}`);
    }
    watchdogProcess = null;
  }
  if (process.platform === 'win32') {
    try {
      const { exec } = require('child_process');
      exec('taskkill /F /IM watchdog.exe /T', () => {});
    } catch (e) {}
  }
}

// Emergency authorized application quit (triggered via secret shortcut)
function emergencyQuitApp() {
  logToFile('Emergency quit initiated via secret shortcut (Ctrl+Alt+Shift+Q).');
  console.log('⚡ Emergency quit initiated via secret shortcut (Ctrl+Alt+Shift+Q).');

  allowAppQuit = true;
  killWatchdog();

  // Close notification window if open
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    try {
      notificationWindow.destroy();
    } catch (e) {}
    notificationWindow = null;
  }

  // If mainWindow exists, request fast session cleanup before exit
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setClosable(true);
      mainWindow.webContents.send('emergency-exit-cleanup');
    } catch (err) {
      logToFile(`Error sending cleanup event: ${err.message}`);
    }
  }

  // Force close within 500ms even if renderer does not respond
  setTimeout(() => {
    try {
      killWatchdog();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setClosable(true);
        mainWindow.destroy();
      }
    } catch (e) {}
    app.quit();
  }, 500);
}

function createWindow() {
  console.log(`App Name: ${app.getName()} (${appName})`);
  console.log(`Launching in ${isStudentMode ? 'STUDENT' : 'ADMIN'} mode. Dev environment: ${isDev}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: !isStudentMode, // Frameless in student mode to support transparency
    transparent: isStudentMode, // Transparent window in student mode
    resizable: !isStudentMode, // Lock student widget so it is not resizable
    movable: !isStudentMode, // Make window unmovable in student mode
    closable: !isStudentMode, // Disable exit/close button in student mode
    minimizable: !isStudentMode, // Disable minimize button/action in student mode
    fullscreen: false,
    kiosk: false,
    alwaysOnTop: isStudentMode, // Lock always on top above active softwares in student mode
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevent Chromium from throttling/suspending timers or painting when in background
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [isStudentMode ? '--app-mode=student' : '--app-mode=admin']
    },
    backgroundColor: isStudentMode ? '#00000000' : '#0b0c10',
    show: false,
  });

  // Load URL depending on dev or production environment
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open devtools in admin mode only for convenience
    if (!isStudentMode) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logToFile(`[Renderer Console (${level})] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logToFile(`[Renderer Failed Load] ${errorCode}: ${errorDescription}`);
  });
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logToFile(`[Renderer Process Gone] reason: ${details.reason}, exitCode: ${details.exitCode}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isStudentMode) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Prevent student from closing the app in student kiosk mode
  mainWindow.on('close', (e) => {
    if (isStudentMode && !allowAppQuit) {
      e.preventDefault();
      return;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start the watchdog process (if running as student client in production)
  startWatchdog();
}

// Disable Alt+Tab and window switching keys in student kiosk mode (Windows specific hooks)
app.whenReady().then(() => {
  logFilePath = path.join(app.getPath('userData'), 'electron_debug.log');
  logToFile('=== App Startup ===');
  
  // Configure auto-launch on Windows startup for the Student Client
  if (isStudentMode && app.isPackaged) {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe')
      });
      console.log('🚀 Registered Student Client to launch on Windows startup.');
    } catch (err) {
      console.error('Failed to configure login item settings:', err);
    }
  }

  createWindow();

  // Register secret emergency shortcut to exit student client (Ctrl + Alt + Shift + Q)
  try {
    const emergencyShortcut = 'CommandOrControl+Alt+Shift+Q';
    const registered = globalShortcut.register(emergencyShortcut, () => {
      emergencyQuitApp();
    });

    if (registered) {
      logToFile(`Registered secret emergency shortcut: ${emergencyShortcut}`);
      console.log(`🔒 Registered secret emergency shortcut: ${emergencyShortcut}`);
    } else {
      logToFile(`Failed to register secret emergency shortcut: ${emergencyShortcut}`);
      console.warn(`Failed to register secret emergency shortcut: ${emergencyShortcut}`);
    }
  } catch (err) {
    logToFile(`Error registering global shortcut: ${err.message}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Expose system idle time for 15 min auto-logout feature
ipcMain.handle('get-system-idle-time', () => {
  const { powerMonitor } = require('electron');
  return powerMonitor.getSystemIdleTime();
});

// Background Idle Auto-Logout Watchdog in Main Process (immune to Chromium background throttling)
setInterval(() => {
  if (!isSessionActive || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    const { powerMonitor } = require('electron');
    const idleSeconds = powerMonitor.getSystemIdleTime();
    // 15 Minutes = 900 seconds
    if (idleSeconds >= 900) {
      logToFile(`[Idle Watchdog] Workstation idle for ${idleSeconds}s (>= 900s). Triggering perform-auto-logout.`);
      console.log(`[Idle Watchdog] Workstation idle for ${idleSeconds}s (>= 900s). Triggering perform-auto-logout.`);
      mainWindow.webContents.send('perform-auto-logout');
    }
  } catch (err) {
    logToFile(`[Idle Watchdog] Error checking idle time: ${err.message}`);
  }
}, 5000);

// App version and external browser launcher handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
ipcMain.on('open-external', (event, url) => {
  try {
    require('electron').shell.openExternal(url);
  } catch (err) {
    console.error('Failed to open external link:', err);
  }
});

// IPC handler to exit application from React UI
ipcMain.on('quit-app', () => {
  killWatchdog();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setClosable(true);
  }
  app.quit();
});

ipcMain.on('proceed-shutdown', () => {
  logToFile('IPC proceed-shutdown received from UI.');
  killWatchdog();
  isSessionActive = false;
  const { exec } = require('child_process');
  exec('shutdown /s /t 0', (err) => {
    if (err) logToFile(`Error executing shutdown: ${err.message}`);
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setClosable(true);
  }
  app.quit();
});

ipcMain.on('proceed-restart', () => {
  logToFile('IPC proceed-restart received from UI.');
  killWatchdog();
  isSessionActive = false;
  const { exec } = require('child_process');
  exec('shutdown /r /t 0', (err) => {
    if (err) logToFile(`Error executing restart: ${err.message}`);
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setClosable(true);
  }
  app.quit();
});

ipcMain.on('auto-logout-completed', () => {
  logToFile('IPC auto-logout-completed received from UI.');
  killWatchdog();
  isSessionActive = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setClosable(true);
  }
  app.quit();
});

function restoreDefaultWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  isMinimizedState = false;
  const winBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(winBounds);
  const { x: displayX, y: displayY, width, height } = display.workArea;
  
  const targetWidth = Math.min(1280, width);
  const targetHeight = Math.min(800, height);
  const targetX = displayX + Math.max(0, Math.floor((width - targetWidth) / 2));
  const targetY = displayY + Math.max(0, Math.floor((height - targetHeight) / 2));
  
  mainWindow.setBounds({
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight
  });
}

ipcMain.on('session-start', () => {
  logToFile('IPC session-start event received.');
  isSessionActive = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    isMinimizedState = false;
    const winBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(winBounds);
    const { x: displayX, y: displayY, width, height } = display.workArea;
    
    const widgetWidth = 400;
    const widgetHeight = 580;
    
    mainWindow.setBounds({
      x: displayX + width - widgetWidth - 20,
      y: displayY + height - widgetHeight - 20,
      width: widgetWidth,
      height: widgetHeight
    });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

ipcMain.on('session-end', () => {
  logToFile('IPC session-end event received.');
  isSessionActive = false;
  isMinimizedState = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      try {
        notificationWindow.close();
      } catch (e) {}
    }
    restoreDefaultWindowBounds();
    mainWindow.setAlwaysOnTop(isStudentMode, 'screen-saver');
  }
});

ipcMain.on('time-over', () => {
  isMinimizedState = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    restoreDefaultWindowBounds();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

ipcMain.on('widget-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    isMinimizedState = true;
    const winBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(winBounds);
    const { x: displayX, y: displayY, width, height } = display.workArea;
    
    const widgetWidth = 220;
    const widgetHeight = 52;
    
    mainWindow.setBounds({
      x: displayX + width - widgetWidth - 20,
      y: displayY + height - widgetHeight - 16,
      width: widgetWidth,
      height: widgetHeight
    });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

ipcMain.on('widget-maximize', () => {
  if (isStudentMode && mainWindow) {
    isMinimizedState = false;
    const winBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(winBounds);
    const { x: displayX, y: displayY, width, height } = display.workArea;
    
    const widgetWidth = 400;
    const widgetHeight = 580;
    
    mainWindow.setBounds({
      x: displayX + width - widgetWidth - 20,
      y: displayY + height - widgetHeight - 20,
      width: widgetWidth,
      height: widgetHeight
    });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

// Helper to calculate notification popup boundaries next to the student client widget
function getNotificationBounds() {
  if (!mainWindow) return { x: 0, y: 0, width: 360, height: 130 };
  const winBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(winBounds);
  const { x: displayX, y: displayY, width, height } = display.workArea;
  
  const popupWidth = 360;
  const popupHeight = 130;
  const gap = 10;
  const margin = 20;

  const currentWidgetWidth = isMinimizedState ? 200 : 400;
  const widgetX = displayX + width - currentWidgetWidth - margin;

  // Position to the left of the widget
  const x = widgetX - popupWidth - gap;
  const y = displayY + height - popupHeight - margin;

  return { x, y, width: popupWidth, height: popupHeight };
}

function createNotificationWindow(message) {
  if (notificationWindow) {
    notificationWindow.destroy();
  }

  const bounds = getNotificationBounds();

  notificationWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: ['--app-mode=notification']
    },
    backgroundColor: '#00000000',
    show: false
  });

  if (isDev) {
    notificationWindow.loadURL('http://localhost:5173');
  } else {
    notificationWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  notificationWindow.once('ready-to-show', () => {
    notificationWindow.show();
    setTimeout(() => {
      if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.webContents.send('notification-message', message);
      }
    }, 250);
  });

  notificationWindow.on('closed', () => {
    notificationWindow = null;
  });
}

ipcMain.on('show-notification', (event, message) => {
  if (isStudentMode) {
    createNotificationWindow(message);
  }
});

ipcMain.on('notification-closed', () => {
  if (notificationWindow) {
    notificationWindow.close();
  }
});

ipcMain.on('notification-clicked', () => {
  if (notificationWindow) {
    notificationWindow.close();
  }
  
  if (isStudentMode && mainWindow) {
    if (isMinimizedState) {
      isMinimizedState = false;
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      
      const widgetWidth = 400;
      const widgetHeight = 580;
      
      mainWindow.setBounds({
        x: width - widgetWidth - 20,
        y: height - widgetHeight - 20,
        width: widgetWidth,
        height: widgetHeight
      });
      mainWindow.webContents.send('widget-maximized-state');
    }
    mainWindow.focus();
    mainWindow.webContents.send('focus-message');
  }
});

// ==========================================
// OTA AUTO-UPDATER IPC HANDLERS & EVENTS
// ==========================================
function sendToWindows(channel, data) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

let isCheckingUpdate = false;
let suppressErrorEvent = false;

autoUpdater.on('checking-for-update', () => {
  logToFile('AutoUpdater: checking-for-update');
  sendToWindows('update-status', { status: 'checking', text: 'Checking for updates...' });
});

autoUpdater.on('update-available', (info) => {
  logToFile(`AutoUpdater: update-available v${info.version}`);
  sendToWindows('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  logToFile(`AutoUpdater: update-not-available (current v${info.version})`);
  sendToWindows('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  logToFile(`AutoUpdater error: ${err ? err.message : err}`);
  if (suppressErrorEvent) {
    logToFile('Suppressing autoUpdater error event during multi-provider fallback check.');
    return;
  }
  let msg = err ? (err.message || err.toString()) : 'Error checking for updates';
  if (msg.includes('No published versions on GitHub')) {
    logToFile('AutoUpdater: No published versions found on GitHub.');
    sendToWindows('update-error', {
      message: `No published releases found on GitHub.\n\nTo trigger an update:\n1. Increase "version" in package.json (e.g. 1.0.1).\n2. Create and push a new release/tag (e.g. v1.0.1) on GitHub so GitHub Actions publishes the new version.`
    });
    return;
  }
  if (msg.includes('404') || msg.includes('releases.atom') || msg.includes('latest.yml') || msg.includes('student.yml') || msg.includes('hod.yml')) {
    logToFile('AutoUpdater 404 error: Repository may be Private or Release is still in Draft state.');
    sendToWindows('update-error', { 
      message: 'Could not fetch release from GitHub (404 Not Found). Please verify that:\n1. Your GitHub repository visibility is set to Public.\n2. The GitHub Release is Published (not Draft).\n3. A version higher than 1.0.0-beta is published.' 
    });
    return;
  }
  if (msg.includes('Headers:')) {
    msg = msg.split('Headers:')[0].trim();
  }
  sendToWindows('update-error', { message: msg });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendToWindows('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  logToFile(`AutoUpdater: update-downloaded v${info.version}`);
  sendToWindows('update-downloaded', info);
});

async function performMultiProviderUpdateCheck() {
  if (isDev && !autoUpdater.forceDevUpdateConfig) {
    sendToWindows('update-error', { message: 'Cannot check for updates in unpackaged development mode. Packaged build required.' });
    return;
  }

  if (isCheckingUpdate) {
    logToFile('Update check already in progress...');
    return;
  }

  isCheckingUpdate = true;
  suppressErrorEvent = false;
  sendToWindows('update-status', { status: 'checking', text: 'Checking for updates...' });

  try {
    logToFile('Attempting update check via GitHub Releases...');
    autoUpdater.allowPrerelease = true;
    autoUpdater.channel = isStudentMode ? 'student' : 'hod';
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'nfsailab',
      repo: 'Pivot-Students-Management'
    });

    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      isCheckingUpdate = false;
      return;
    }
  } catch (err) {
    logToFile(`GitHub provider update check error: ${err ? err.message : err}`);
    const errStr = (err ? (err.message || err.toString()) : '').toLowerCase();

    if (errStr.includes('no published versions on github')) {
      sendToWindows('update-error', {
        message: `No published releases found on GitHub.\n\nTo trigger an update:\n1. Increase "version" in package.json (e.g. 1.0.1).\n2. Create and push a new release/tag (e.g. v1.0.1) on GitHub so GitHub Actions publishes the new version.`
      });
      isCheckingUpdate = false;
      return;
    }

    // If check encountered a 404 (no release or yml file found on server yet)
    if (errStr.includes('404') || errStr.includes('releases.atom') || errStr.includes('yml')) {
      logToFile('Update check returned 404: Repository is Private or Release is Draft.');
      sendToWindows('update-error', { 
        message: 'Could not fetch release from GitHub (404 Not Found).\n\nPlease check:\n1. GitHub Repository visibility is set to PUBLIC.\n2. Release is PUBLISHED (not Draft).\n3. Version in package.json was increased for the new release.' 
      });
      isCheckingUpdate = false;
      return;
    }

    let cleanMessage = err ? (err.message || err.toString()) : 'Error checking for updates.';
    if (cleanMessage.includes('Headers:')) {
      cleanMessage = cleanMessage.split('Headers:')[0].trim();
    }
    if (cleanMessage.includes('net::ERR_INTERNET_DISCONNECTED') || cleanMessage.includes('ENOTFOUND') || cleanMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      cleanMessage = 'Network connection error while checking for updates. Please verify your internet connection.';
    }

    sendToWindows('update-error', { message: cleanMessage });
  }

  isCheckingUpdate = false;
}

ipcMain.on('check-for-updates', () => {
  logToFile('IPC check-for-updates triggered');
  performMultiProviderUpdateCheck().catch(err => {
    logToFile(`performMultiProviderUpdateCheck catch: ${err.message}`);
    isCheckingUpdate = false;
    suppressErrorEvent = false;
    sendToWindows('update-error', { message: err.message || 'Error during update check.' });
  });
});

ipcMain.on('start-update-download', () => {
  logToFile('IPC start-update-download triggered');
  autoUpdater.downloadUpdate().catch(err => {
    logToFile(`downloadUpdate catch: ${err.message}`);
    sendToWindows('update-error', { message: err.message });
  });
});

ipcMain.on('install-update', () => {
  logToFile('IPC install-update triggered');
  killWatchdog();
  autoUpdater.quitAndInstall();
});
