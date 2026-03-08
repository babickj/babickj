const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow
let backendProcess

function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function getPythonPath() {
  // Check for venv Python first (dev mode)
  if (isDev) {
    const venvPython = path.join(__dirname, '..', 'venv', 'bin', 'python3')
    if (fs.existsSync(venvPython)) {
      return venvPython
    }
  }
  const candidates = [
    'python3',
    'python',
    '/usr/local/bin/python3',
    '/usr/bin/python3',
    path.join(process.resourcesPath, 'python', 'bin', 'python3'),
  ]
  return candidates[0]
}

function startBackend() {
  const backendPath = getBackendPath()
  const python = getPythonPath()
  const scriptPath = path.join(backendPath, 'main.py')

  if (!fs.existsSync(scriptPath)) {
    console.error('Backend script not found:', scriptPath)
    return
  }

  backendProcess = spawn(python, [scriptPath], {
    cwd: backendPath,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })

  backendProcess.stdout.on('data', (data) => {
    console.log('[Backend]', data.toString())
  })

  backendProcess.stderr.on('data', (data) => {
    console.error('[Backend Error]', data.toString())
  })

  backendProcess.on('close', (code) => {
    console.log('[Backend] Process exited with code', code)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    frame: false,
    backgroundColor: '#090b18',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
    },
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openFile', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'Model Files', extensions: ['gguf', 'bin', 'pt', 'ggml'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(filePath)
})

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())

app.whenReady().then(() => {
  startBackend()
  // Give backend a moment to start
  setTimeout(createWindow, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
})
