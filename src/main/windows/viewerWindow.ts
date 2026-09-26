import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { getPreloadPath } from '../utils/preloadPath'
import { getAppIcon } from '../utils/iconPath'

let viewerWindow: BrowserWindow | null = null

export function createViewerWindow(): BrowserWindow {
  const displays = screen.getAllDisplays()
  const secondaryDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id)

  const defaultBounds = secondaryDisplay
    ? {
        x: secondaryDisplay.bounds.x + 50,
        y: secondaryDisplay.bounds.y + 50,
        width: 1280,
        height: 720
      }
    : {
        width: 960,
        height: 540
      }

  const icon = getAppIcon()

  viewerWindow = new BrowserWindow({
    ...defaultBounds,
    title: 'Professor Screen Share - Visualizador',
    backgroundColor: '#000000',
    icon,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  viewerWindow.on('ready-to-show', () => {
    viewerWindow?.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    viewerWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#viewer`)
  } else {
    viewerWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'viewer' })
  }

  viewerWindow.on('closed', () => {
    viewerWindow = null
  })

  return viewerWindow
}

export function moveToDisplay(displayId: number, fullscreen = false): void {
  if (!viewerWindow || viewerWindow.isDestroyed()) {
    createViewerWindow()
  }

  const displays = screen.getAllDisplays()
  const targetDisplay = displays.find(d => d.id === displayId)

  if (targetDisplay && viewerWindow) {
    if (viewerWindow.isFullScreen()) {
      viewerWindow.setFullScreen(false)
    }

    const { x, y, width, height } = targetDisplay.bounds
    viewerWindow.setPosition(x + 50, y + 50)
    viewerWindow.setSize(Math.min(1280, width - 100), Math.min(720, height - 100))

    if (fullscreen) {
      setTimeout(() => {
        viewerWindow?.setFullScreen(true)
      }, 100)
    }

    viewerWindow.show()
    viewerWindow.focus()
  }
}

export function toggleViewerFullscreen(): void {
  if (viewerWindow && !viewerWindow.isDestroyed()) {
    viewerWindow.setFullScreen(!viewerWindow.isFullScreen())
  }
}

export function getViewerWindow(): BrowserWindow | null {
  return viewerWindow
}
