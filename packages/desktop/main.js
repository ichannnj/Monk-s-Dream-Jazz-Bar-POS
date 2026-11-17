/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-check
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: "Monk's Dream Jazz Bar POS",
    autoHideMenuBar: true,
    backgroundColor: '#1c1917',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // 1. Automatically grant Web Serial permissions for attached USB thermal printers
  mainWindow.webContents.session.on(
    'select-serial-port',
    (event, portList, webContents, callback) => {
      event.preventDefault();
      if (portList && portList.length > 0) {
        console.info(
          `[Electron Main] Auto-authorizing USB Serial Port: ${portList[0].portName || portList[0].portId}`
        );
        callback(portList[0].portId);
      } else {
        callback('');
      }
    }
  );

  // 2. Automatically select USB thermal printer for WebUSB requests
  mainWindow.webContents.session.on('select-usb-device', (event, details, callback) => {
    event.preventDefault();
    const deviceList = details.deviceList;
    if (deviceList && deviceList.length > 0) {
      const printer =
        deviceList.find((d) => {
          const name = (d.productName || '').toLowerCase();
          return (
            name.includes('print') ||
            name.includes('pos') ||
            name.includes('receipt') ||
            name.includes('thermal') ||
            name.includes('epson') ||
            name.includes('xprinter')
          );
        }) || deviceList[0];
      console.info(
        `[Electron Main] Auto-authorizing USB Device: ${printer.productName || printer.deviceId}`
      );
      callback(printer.deviceId);
    } else {
      callback('');
    }
  });

  // 2. Grant permissions without user prompt
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'serial' || permission === 'usb') return true;
    return true;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial' || details.deviceType === 'usb') return true;
    return true;
  });

  // Load from local web export or dev server
  const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:8081';
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
