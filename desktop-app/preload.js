const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Docker control
  startServices:   () => ipcRenderer.invoke('docker:start'),
  stopServices:    () => ipcRenderer.invoke('docker:stop'),
  restartServices: () => ipcRenderer.invoke('docker:restart'),

  // Status
  getStatus: () => ipcRenderer.invoke('docker:status'),

  // Open portal
  openSchoolPortal: () => ipcRenderer.invoke('open:school'),

  // Logs
  getLogs: (service) => ipcRenderer.invoke('get-logs', service),

  // License
  getLicenseStatus: () => ipcRenderer.invoke('license:status'),
  activateLicense:  (args) => ipcRenderer.invoke('license:activate', args),

  // DB Backup
  backupDatabase: () => ipcRenderer.invoke('db:backup'),

  // Auto-start
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enable) => ipcRenderer.invoke('autostart:set', enable),

  // ── Events from main process ──────────────────────────────────────────────

  // First-time setup events
  onSetupStart:    (cb) => ipcRenderer.on('setup:start',    (_e, d) => cb(d)),
  onSetupStep:     (cb) => ipcRenderer.on('setup:step',     (_e, d) => cb(d)),
  onSetupProgress: (cb) => ipcRenderer.on('setup:progress', (_e, d) => cb(d)),
  onSetupDone:     (cb) => ipcRenderer.on('setup:done',     (_e, d) => cb(d)),
  onSetupError:    (cb) => ipcRenderer.on('setup:error',    (_e, d) => cb(d)),

  // Runtime events
  onStatusUpdate: (cb) => ipcRenderer.on('status:update', (_e, d) => cb(d)),
  onLogLine:      (cb) => ipcRenderer.on('log:line',      (_e, d) => cb(d)),
  onDockerError:  (cb) => ipcRenderer.on('docker:error',  (_e, d) => cb(d)),

  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
