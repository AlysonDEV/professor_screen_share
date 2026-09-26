import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { getPreloadPath } from '../utils/preloadPath'

const sniperWindows: Map<number, BrowserWindow> = new Map()

export function createSniperWindows(): void {
  const displays = screen.getAllDisplays()
  const primaryId = screen.getPrimaryDisplay().id

  // Clean up any stale windows for disconnected displays
  for (const [id, win] of sniperWindows.entries()) {
    if (!displays.some((d) => d.id === id)) {
      if (!win.isDestroyed()) win.destroy()
      sniperWindows.delete(id)
    }
  }

  displays.forEach((display, index) => {
    let win = sniperWindows.get(display.id)
    const isPrimary = display.id === primaryId
    const displayName = `Monitor ${index + 1}${isPrimary ? ' (Principal)' : ''}`
    const query = `?displayId=${display.id}&index=${index}&name=${encodeURIComponent(displayName)}`

    if (!win || win.isDestroyed()) {
      win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        transparent: true,
        backgroundColor: '#00000000',
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        hasShadow: false,
        resizable: false,
        movable: false,
        enableLargerThanScreen: true,
        webPreferences: {
          preload: getPreloadPath(),
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false
        }
      })

      win.setAlwaysOnTop(true, 'screen-saver')

      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#sniper${query}`)
      } else {
        win.loadFile(join(__dirname, '../renderer/index.html'), { hash: `sniper${query}` })
      }

      win.on('closed', () => {
        sniperWindows.delete(display.id)
      })

      sniperWindows.set(display.id, win)
    } else {
      // Update bounds if resolution changed
      win.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      })
    }
  })
}

let currentSniperTransparency = 70

export function setSniperTransparency(transparency: number): void {
  currentSniperTransparency = transparency
  for (const win of sniperWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send('sniper-transparency-changed', transparency)
    }
  }
}

export function showSniperWindows(targetDisplayId?: number, transparency = 70): void {
  currentSniperTransparency = transparency
  createSniperWindows()

  for (const win of sniperWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send('sniper-transparency-changed', transparency)
      win.show()
    }
  }

  // Focus the window of the target display, or where the cursor currently is
  if (targetDisplayId && sniperWindows.has(targetDisplayId)) {
    sniperWindows.get(targetDisplayId)?.focus()
  } else {
    const cursor = screen.getCursorScreenPoint()
    const currentDisplay = screen.getDisplayNearestPoint(cursor)
    const targetWin = sniperWindows.get(currentDisplay.id)
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.focus()
    }
  }
}

export function hideSniperWindows(): void {
  for (const win of sniperWindows.values()) {
    if (!win.isDestroyed()) {
      win.hide()
    }
  }
}

// Aliases for compatibility
export const createSniperWindow = createSniperWindows
export const showSniperWindow = showSniperWindows
export const hideSniperWindow = hideSniperWindows
export function getSniperWindow(): BrowserWindow | null {
  return sniperWindows.values().next().value || null
}
