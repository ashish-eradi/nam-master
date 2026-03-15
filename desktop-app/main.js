const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const path   = require('path');
const http   = require('http');
const net    = require('net');
const fs     = require('fs');

// Handle Squirrel installer events on Windows
if (require('electron-squirrel-startup')) app.quit();

// ─── Paths ────────────────────────────────────────────────────────────────────
const isPackaged    = app.isPackaged;
const resourcesPath = isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
const userData      = app.getPath('userData');

const pythonExe   = path.join(resourcesPath, 'python',   'python.exe');
const pgBin       = path.join(resourcesPath, 'postgres', 'bin');
const backendDir  = path.join(resourcesPath, 'backend');
const frontendDir = path.join(resourcesPath, 'frontend');
const pgDataDir   = path.join(userData, 'pgdata');
const uploadsDir  = path.join(userData, 'uploads');

// ─── Service Config ───────────────────────────────────────────────────────────
const SERVICES = {
  db:              { port: 5433, name: 'Database',      healthUrl: null },
  backend:         { port: 8000, name: 'Backend API',   healthUrl: 'http://localhost:8000/api/v1/health' },
  'school-portal': { port: 8082, name: 'School Portal', healthUrl: 'http://localhost:8082/' },
};

// ─── Global State ─────────────────────────────────────────────────────────────
let mainWindow     = null;
let tray           = null;
let statusInterval = null;
let currentStatus  = {};
let backendProcess = null;
let frontendServer = null;
let secrets        = null;
let isCleaningUp   = false;

// ─── Log Buffers ──────────────────────────────────────────────────────────────
const MAX_LOG_LINES = 500;
const logBuffers = { db: [], backend: [], 'school-portal': [] };

function appendServiceLog(service, text) {
  const buf = logBuffers[service] ?? logBuffers['backend'];
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    buf.push(line);
    if (buf.length > MAX_LOG_LINES) buf.shift();
    send('log:line', `[${service}] ${line}`);
  }
}

// ─── Secrets Management ───────────────────────────────────────────────────────
function loadOrCreateSecrets() {
  const secretsFile = path.join(userData, 'secrets.json');
  if (fs.existsSync(secretsFile)) {
    try { return JSON.parse(fs.readFileSync(secretsFile, 'utf8')); } catch {}
  }
  const s = {
    SECRET_KEY:         crypto.randomBytes(32).toString('hex'),
    REFRESH_SECRET_KEY: crypto.randomBytes(32).toString('hex'),
    LICENSE_SECRET_KEY: crypto.randomBytes(32).toString('hex'),
    PG_PASSWORD:        crypto.randomBytes(16).toString('hex'),
  };
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(secretsFile, JSON.stringify(s, null, 2));
  return s;
}

function buildEnv(s) {
  return {
    ...process.env,
    DATABASE_URL:         `postgresql://admin:${s.PG_PASSWORD}@localhost:5433/niladri_db`,
    ALEMBIC_DATABASE_URL: `postgresql://admin:${s.PG_PASSWORD}@localhost:5433/niladri_db`,
    SECRET_KEY:           s.SECRET_KEY,
    REFRESH_SECRET_KEY:   s.REFRESH_SECRET_KEY,
    LICENSE_SECRET_KEY:   s.LICENSE_SECRET_KEY,
    CORS_ORIGINS:         'http://localhost:8082',
    UPLOAD_DIR:           uploadsDir,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302);
      res.resume();
    });
    req.on('error',   () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function checkTcpPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const client = net.createConnection({ port, host });
    const timer  = setTimeout(() => { client.destroy(); resolve(false); }, 2000);
    client.on('connect', () => { clearTimeout(timer); client.destroy(); resolve(true); });
    client.on('error',   () => { clearTimeout(timer); resolve(false); });
  });
}

function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─── PostgreSQL Management ────────────────────────────────────────────────────
function initDatabase() {
  const pwFile = path.join(userData, 'pgpassword.tmp');
  fs.writeFileSync(pwFile, secrets.PG_PASSWORD);
  return new Promise((resolve, reject) => {
    const proc = spawn(
      path.join(pgBin, 'initdb.exe'),
      ['-D', pgDataDir, '-U', 'admin', '--pwfile', pwFile,
       '--auth', 'password', '--encoding', 'UTF8'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    proc.stdout.on('data', d => appendServiceLog('db', d.toString()));
    proc.stderr.on('data', d => appendServiceLog('db', d.toString()));
    proc.on('close', (code) => {
      try { fs.unlinkSync(pwFile); } catch {}
      if (code === 0) resolve();
      else reject(new Error(`initdb exited with code ${code}`));
    });
    proc.on('error', (e) => { try { fs.unlinkSync(pwFile); } catch {}; reject(e); });
  });
}

function startPostgres() {
  return new Promise((resolve, reject) => {
    const pgLog = path.join(userData, 'pg.log');
    const proc  = spawn(
      path.join(pgBin, 'pg_ctl.exe'),
      ['start', '-D', pgDataDir, '-l', pgLog, '-o', '-p 5433'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    proc.stdout.on('data', d => appendServiceLog('db', d.toString()));
    proc.stderr.on('data', d => appendServiceLog('db', d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_ctl start exited with code ${code}`));
    });
    proc.on('error', (e) => reject(e));
  });
}

function stopPostgres() {
  return new Promise((resolve) => {
    if (!fs.existsSync(pgDataDir)) { resolve(); return; }
    const proc = spawn(
      path.join(pgBin, 'pg_ctl.exe'),
      ['stop', '-D', pgDataDir, '-m', 'fast'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    proc.stdout.on('data', d => appendServiceLog('db', d.toString()));
    proc.stderr.on('data', d => appendServiceLog('db', d.toString()));
    proc.on('close', () => resolve());
    proc.on('error', () => resolve());
    setTimeout(resolve, 10000); // force-resolve after 10s
  });
}

function waitForPostgres(retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function attempt() {
      checkTcpPort(5433).then(ok => {
        if (ok) { resolve(); return; }
        if (++attempts >= retries) { reject(new Error('PostgreSQL did not start within 30 seconds')); return; }
        setTimeout(attempt, delay);
      });
    }
    attempt();
  });
}

function createDatabase() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      path.join(pgBin, 'createdb.exe'),
      ['-h', '127.0.0.1', '-p', '5433', '-U', 'admin', 'niladri_db'],
      { env: { ...process.env, PGPASSWORD: secrets.PG_PASSWORD }, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    proc.stdout.on('data', d => appendServiceLog('db', d.toString()));
    proc.stderr.on('data', d => appendServiceLog('db', d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`createdb failed with code ${code}`));
    });
    proc.on('error', (e) => reject(e));
  });
}

// ─── Backend Management ───────────────────────────────────────────────────────
function runMigrations() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      pythonExe, ['-m', 'alembic', 'upgrade', 'head'],
      { cwd: backendDir, env: buildEnv(secrets), stdio: ['ignore', 'pipe', 'pipe'] }
    );
    proc.stdout.on('data', d => appendServiceLog('backend', d.toString()));
    proc.stderr.on('data', d => appendServiceLog('backend', d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Migrations failed with exit code ${code}`));
    });
    proc.on('error', (e) => reject(e));
  });
}

function runSeed() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      pythonExe, ['-m', 'app.db.seed'],
      { cwd: backendDir, env: buildEnv(secrets), stdio: ['ignore', 'pipe', 'pipe'] }
    );
    proc.stdout.on('data', d => appendServiceLog('backend', d.toString()));
    proc.stderr.on('data', d => appendServiceLog('backend', d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Seed failed with exit code ${code}`));
    });
    proc.on('error', (e) => reject(e));
  });
}

function startBackend() {
  if (backendProcess) return;
  backendProcess = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    { cwd: backendDir, env: buildEnv(secrets), stdio: ['ignore', 'pipe', 'pipe'] }
  );
  backendProcess.stdout.on('data', d => appendServiceLog('backend', d.toString()));
  backendProcess.stderr.on('data', d => appendServiceLog('backend', d.toString()));
  backendProcess.on('exit', (code) => {
    appendServiceLog('backend', `Backend process exited with code ${code}`);
    backendProcess = null;
  });
  backendProcess.on('error', (e) => {
    appendServiceLog('backend', `Backend spawn error: ${e.message}`);
    backendProcess = null;
  });
}

function waitForBackend(retries = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function attempt() {
      httpGet('http://localhost:8000/api/v1/health').then(ok => {
        if (ok) { resolve(); return; }
        if (++attempts >= retries) { reject(new Error('Backend did not start within 30 seconds')); return; }
        setTimeout(attempt, delay);
      });
    }
    attempt();
  });
}

// ─── Frontend Server ──────────────────────────────────────────────────────────
function startFrontendServer() {
  if (frontendServer) return Promise.resolve();
  const express    = require('express');
  const expressApp = express();
  expressApp.use(express.static(frontendDir));
  expressApp.get('*', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
  return new Promise((resolve) => {
    frontendServer = expressApp.listen(8082, '127.0.0.1', () => {
      appendServiceLog('school-portal', 'Frontend server listening on http://127.0.0.1:8082');
      resolve();
    });
    frontendServer.on('error', (e) => {
      appendServiceLog('school-portal', `Frontend server error: ${e.message}`);
      frontendServer = null;
      resolve();
    });
  });
}

// ─── First-time Setup ─────────────────────────────────────────────────────────
async function ensureSetup() {
  fs.mkdirSync(pgDataDir,  { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  const isFirstRun = !fs.existsSync(path.join(pgDataDir, 'PG_VERSION'));
  const total      = isFirstRun ? 4 : 1;

  send('setup:start', { total });

  if (isFirstRun) {
    send('setup:step', { step: 1, total, label: 'Initialising database cluster…' });
    await initDatabase();
  }

  send('setup:step', { step: isFirstRun ? 2 : 1, total, label: 'Starting PostgreSQL…' });
  await startPostgres();
  await waitForPostgres();

  if (isFirstRun) {
    send('setup:step', { step: 3, total, label: 'Creating database…' });
    await createDatabase();
    send('setup:step', { step: 4, total, label: 'Running database migrations…' });
  }

  await runMigrations();

  if (isFirstRun) {
    send('setup:progress', 'Seeding initial data…');
    await runSeed();
  }

  send('setup:done', {});
}

// ─── Service Start / Stop ─────────────────────────────────────────────────────
async function startAllServices() {
  const dbUp = await checkTcpPort(5433);
  if (!dbUp) {
    send('log:line', '▶ Starting PostgreSQL…');
    await startPostgres();
    await waitForPostgres();
    send('log:line', '✔ PostgreSQL started.');
  }

  await runMigrations();

  if (!backendProcess) {
    send('log:line', '▶ Starting backend…');
    startBackend();
    await waitForBackend();
    send('log:line', '✔ Backend started.');
  }

  if (!frontendServer) {
    send('log:line', '▶ Starting frontend server…');
    await startFrontendServer();
    send('log:line', '✔ Frontend server started.');
  }
}

async function stopAllServices() {
  if (backendProcess) {
    send('log:line', '■ Stopping backend…');
    backendProcess.kill();
    backendProcess = null;
  }
  if (frontendServer) {
    send('log:line', '■ Stopping frontend server…');
    await new Promise(resolve => frontendServer.close(resolve));
    frontendServer = null;
  }
  send('log:line', '■ Stopping PostgreSQL…');
  await stopPostgres();
  send('log:line', '✔ All services stopped.');
}

// ─── Status Polling ───────────────────────────────────────────────────────────
async function pollStatus() {
  const dbUp       = await checkTcpPort(5433);
  const backendUp  = await httpGet('http://localhost:8000/api/v1/health');
  const frontendUp = await httpGet('http://localhost:8082/');

  const status = {
    'db':            dbUp       ? 'healthy' : 'stopped',
    'backend':       backendUp  ? 'healthy' : (backendProcess  ? 'starting' : 'stopped'),
    'school-portal': frontendUp ? 'healthy' : (frontendServer  ? 'starting' : 'stopped'),
  };

  currentStatus = status;
  send('status:update', { services: status, dockerUp: true });
  updateTrayTooltip();
}

function updateTrayTooltip() {
  if (!tray) return;
  const running = Object.values(currentStatus).filter(s => s === 'healthy').length;
  tray.setToolTip(`NAM School Launcher – ${running}/${Object.keys(SERVICES).length} services healthy`);
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 750,
    minHeight: 550,
    title: 'NAM School Launcher',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTrayIcon() {
  const size = 16;
  const buf  = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx  = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r) { buf[idx]=20; buf[idx+1]=184; buf[idx+2]=166; buf[idx+3]=255; }
      else           { buf[idx]=0;  buf[idx+1]=0;   buf[idx+2]=0;   buf[idx+3]=0;   }
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('NAM School Launcher');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Dashboard',     click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Open School Portal', click: () => shell.openExternal('http://localhost:8082') },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => mainWindow?.show());
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('docker:start', async () => {
  try {
    send('log:line', '▶ Starting all services...');
    await startAllServices();
    await pollStatus();
    return { ok: true };
  } catch (e) {
    send('log:line', `✖ Error: ${e.message}`);
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('docker:stop', async () => {
  try {
    send('log:line', '■ Stopping all services...');
    await stopAllServices();
    await pollStatus();
    return { ok: true };
  } catch (e) {
    send('log:line', `✖ Error: ${e.message}`);
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('docker:restart', async () => {
  try {
    send('log:line', '↻ Restarting all services...');
    await stopAllServices();
    await startAllServices();
    send('log:line', '✔ Services restarted.');
    await pollStatus();
    return { ok: true };
  } catch (e) {
    send('log:line', `✖ Error: ${e.message}`);
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('docker:status', async () => {
  await pollStatus();
  return { services: currentStatus, dockerUp: true };
});

ipcMain.handle('get-logs', (_event, service) => {
  if (!service) {
    const all = [];
    for (const [svc, lines] of Object.entries(logBuffers)) {
      for (const line of lines) all.push(`[${svc}] ${line}`);
    }
    return all.join('\n') || '(no logs yet)';
  }
  return (logBuffers[service] || []).join('\n') || '(no logs yet)';
});

ipcMain.handle('open:school', () => shell.openExternal('http://localhost:8082'));

// ─── License Status ───────────────────────────────────────────────────────────
ipcMain.handle('license:status', () => {
  return new Promise((resolve) => {
    const req = http.get(
      'http://localhost:8000/api/v1/licenses/offline-status',
      { timeout: 5000 },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ ok: true, data: JSON.parse(data) }); }
          catch { resolve({ ok: false, data: null }); }
        });
      }
    );
    req.on('error',   () => resolve({ ok: false, data: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, data: null }); });
  });
});

// ─── License Activation ───────────────────────────────────────────────────────
ipcMain.handle('license:activate', async (_event, { email, password, licenseKey }) => {
  // Step 1: login
  const loginResult = await new Promise((resolve) => {
    const body = JSON.stringify({ email, password });
    const req  = http.request({
      hostname: 'localhost', port: 8000,
      path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode === 200, data: JSON.parse(data) }); }
        catch { resolve({ ok: false, data: { detail: 'Parse error' } }); }
      });
    });
    req.on('error', e => resolve({ ok: false, data: { detail: e.message } }));
    req.write(body); req.end();
  });

  if (!loginResult.ok) {
    return { ok: false, message: loginResult.data?.detail || 'Login failed. Check credentials.' };
  }

  const token = loginResult.data.access_token;

  // Step 2: activate
  return new Promise((resolve) => {
    const body = JSON.stringify({ license_key: licenseKey });
    const req  = http.request({
      hostname: 'localhost', port: 8000,
      path: '/api/v1/licenses/activate', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${token}`,
      },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) resolve({ ok: true, data: parsed });
          else resolve({ ok: false, message: parsed?.detail || 'Activation failed' });
        } catch { resolve({ ok: false, message: 'Parse error' }); }
      });
    });
    req.on('error', e => resolve({ ok: false, message: e.message }));
    req.write(body); req.end();
  });
});

// ─── DB Backup ────────────────────────────────────────────────────────────────
ipcMain.handle('db:backup', async () => {
  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const defaultPath = path.join(app.getPath('documents'), `nam-backup-${timestamp}.sql`);

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Database Backup',
    defaultPath,
    filters: [{ name: 'SQL Backup', extensions: ['sql'] }],
  });

  if (canceled || !filePath) return { ok: false, message: 'Cancelled' };

  return new Promise((resolve) => {
    const pgDump = path.join(pgBin, 'pg_dump.exe');
    const env    = { ...process.env, PGPASSWORD: secrets.PG_PASSWORD };
    exec(
      `"${pgDump}" -h 127.0.0.1 -p 5433 -U admin niladri_db`,
      { env, timeout: 60000, maxBuffer: 100 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err || !stdout) {
          resolve({ ok: false, message: stderr || err?.message || 'Backup failed' });
          return;
        }
        try {
          fs.writeFileSync(filePath, stdout);
          resolve({ ok: true, path: filePath });
        } catch (e) {
          resolve({ ok: false, message: e.message });
        }
      }
    );
  });
});

// ─── Auto-start ───────────────────────────────────────────────────────────────
ipcMain.handle('autostart:get', () => {
  const settings = app.getLoginItemSettings();
  return { enabled: settings.openAtLogin };
});

ipcMain.handle('autostart:set', (_event, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable, openAsHidden: true });
  return { ok: true, enabled: enable };
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  secrets = loadOrCreateSecrets();
  createWindow();
  createTray();

  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      await ensureSetup();
    } catch (e) {
      send('setup:error', `Setup failed: ${e.message}`);
      return;
    }

    try {
      startBackend();
      await startFrontendServer();
    } catch (e) {
      send('log:line', `✖ Startup error: ${e.message}`);
    }

    await pollStatus();
    statusInterval = setInterval(pollStatus, 4000);
  });
});

app.on('window-all-closed', () => {
  // Stay in tray — do not quit
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});

app.on('before-quit', async (e) => {
  if (isCleaningUp) return;
  isCleaningUp = true;
  e.preventDefault();

  if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }

  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (frontendServer) {
    await new Promise(resolve => frontendServer.close(resolve));
    frontendServer = null;
  }

  await stopPostgres();

  app.isQuitting = true;
  app.quit();
});
