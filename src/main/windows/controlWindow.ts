import { BrowserWindow, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { getPreloadPath } from '../utils/preloadPath'
import { getAppIcon } from '../utils/iconPath'

let controlWindow: BrowserWindow | null = null

export function createControlWindow(): BrowserWindow {
  const icon = getAppIcon()

  controlWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 400,
    minHeight: 650,
    title: 'Professor Screen Share - Menu',
    titleBarStyle: 'hidden',
    backgroundColor: '#020617',
    icon,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  controlWindow.on('ready-to-show', () => {
    controlWindow?.show()
  })

  controlWindow.on('maximize', () => {
    controlWindow?.webContents.send('window-maximized-state', true)
  })

  controlWindow.on('unmaximize', () => {
    controlWindow?.webContents.send('window-maximized-state', false)
  })

  // Load appropriate URL/file with hash route #control
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    controlWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#control`)
  } else {
    controlWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'control' })
  }

  controlWindow.on('closed', () => {
    controlWindow = null
    app.quit()
  })

  return controlWindow
}

export function getControlWindow(): BrowserWindow | null {
  return controlWindow
}
