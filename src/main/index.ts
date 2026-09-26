import { app, BrowserWindow, ipcMain, desktopCapturer, screen } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@shared/ipc-events'
import type {
  CropRegion,
  Annotation,
  ActiveToolSettings,
  DesktopSourceInfo,
  DisplayInfo,
  ViewerSettings
} from '@shared/types'

import { createControlWindow, getControlWindow } from './windows/controlWindow'
import {
  createSniperWindows,
  showSniperWindows,
  hideSniperWindows,
  setSniperTransparency
} from './windows/sniperWindow'
import {
  createViewerWindow,
  getViewerWindow,
  moveToDisplay,
  toggleViewerFullscreen
} from './windows/viewerWindow'
import { getWebStreamServer } from './services/webStreamServer'

// Modern Windows Graphics Capture (WGC) for high performance and clean capture without GDI thread/cursor errors
app.commandLine.appendSwitch('enable-features', 'WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('log-level', '3')

import { shell } from 'electron'
import { logger } from './utils/logger'

// Store active annotations state in main to sync if viewer or control reloads
let activeAnnotations: Annotation[] = []
let activeCropRegion: CropRegion | null = null
let currentSourceId: string | null = null
let activeToolSettings: ActiveToolSettings = {
  tool: 'arrow',
  color: '#ef4444',
  width: 5
}

// Catch unhandled errors globally
process.on('uncaughtException', (err) => {
  logger.error('Exceção não tratada no Main Process:', err)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Promessa rejeitada não tratada no Main Process:', reason)
})

function setupIPC(): void {
  // 1. Get Sources (screens and windows)
  ipcMain.handle(IPC_CHANNELS.GET_SOURCES, async (): Promise<DesktopSourceInfo[]> => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      })

      logger.info(`Capturadas ${sources.length} fontes de vídeo (${sources.filter((s) => s.id.startsWith('screen:')).length} telas, ${sources.filter((s) => !s.id.startsWith('screen:')).length} janelas)`)

      return sources.map((src) => ({
        id: src.id,
        name: src.name,
        thumbnail: src.thumbnail.toDataURL(),
        displayId: src.display_id,
        isScreen: src.id.startsWith('screen:')
      }))
    } catch (error) {
      logger.error('Erro ao capturar fontes de vídeo:', error)
      return []
    }
  })

  // 2. Get Displays (physical monitors)
  ipcMain.handle(IPC_CHANNELS.GET_DISPLAYS, async (): Promise<DisplayInfo[]> => {
    try {
      const displays = screen.getAllDisplays()
      const primaryId = screen.getPrimaryDisplay().id

      logger.info(`Detectados ${displays.length} monitor(es) físicos`)

      return displays.map((d, index) => ({
        id: d.id,
        name: `Monitor ${index + 1}${d.id === primaryId ? ' (Principal)' : ''} - ${d.bounds.width}x${d.bounds.height}`,
        bounds: d.bounds,
        isPrimary: d.id === primaryId,
        scaleFactor: d.scaleFactor
      }))
    } catch (err) {
      logger.error('Erro ao listar monitores físicos:', err)
      return []
    }
  })

  // 3. Select Source
  ipcMain.on(IPC_CHANNELS.SELECT_SOURCE, (_event, sourceId: string) => {
    currentSourceId = sourceId
    logger.info(`Fonte de vídeo selecionada: ${sourceId}`)
    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.SET_SOURCE, sourceId)
    }
  })

  // 4. Sniper Trigger & Result
  ipcMain.on(IPC_CHANNELS.START_SNIPER, (_event, transparency?: number) => {
    const t = typeof transparency === 'number' && !isNaN(transparency) ? transparency : 70
    logger.info(`Modo Sniper iniciado pelo usuário em todos os monitores (Transparência: ${t}%)`)
    showSniperWindows(undefined, t)
  })

  ipcMain.on('set-sniper-transparency', (_event, transparency: number) => {
    if (typeof transparency === 'number' && !isNaN(transparency)) {
      setSniperTransparency(transparency)
    }
  })

  ipcMain.on(IPC_CHANNELS.REGION_SELECTED, (_event, region: CropRegion) => {
    hideSniperWindows()
    activeCropRegion = region
    logger.info(`Região de recorte aplicada: ${region.width}x${region.height} em (${region.x}, ${region.y}) displayId=${region.displayId}`)

    // Se o recorte foi feito em um monitor físico específico, garantir sincronização da fonte
    if (region.displayId !== undefined) {
      const displays = screen.getAllDisplays()
      const displayIndex = displays.findIndex((d) => d.id === region.displayId)
      if (displayIndex !== -1) {
        const expectedSourceId = `screen:${displayIndex}:0`
        if (currentSourceId !== expectedSourceId) {
          currentSourceId = expectedSourceId
          logger.info(`Alternando automaticamente fonte de captura para ${expectedSourceId} (Monitor ${displayIndex + 1})`)
          const viewer = getViewerWindow()
          if (viewer && !viewer.isDestroyed()) {
            viewer.webContents.send(IPC_CHANNELS.SET_SOURCE, expectedSourceId)
          }
          const control = getControlWindow()
          if (control && !control.isDestroyed()) {
            control.webContents.send('source-auto-selected', expectedSourceId)
          }
        }
      }
    }

    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.APPLY_CROP, region)
    }

    const control = getControlWindow()
    if (control && !control.isDestroyed()) {
      control.webContents.send(IPC_CHANNELS.CROP_UPDATED, region)
    }
  })

  ipcMain.on(IPC_CHANNELS.CANCEL_SNIPER, () => {
    logger.info('Modo Sniper cancelado')
    hideSniperWindows()
  })

  ipcMain.on(IPC_CHANNELS.RESET_CROP, () => {
    activeCropRegion = null
    logger.info('Recorte resetado para tela inteira')
    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.APPLY_CROP, null)
    }
    const control = getControlWindow()
    if (control && !control.isDestroyed()) {
      control.webContents.send(IPC_CHANNELS.CROP_UPDATED, null)
    }
  })

  // 5. Annotations
  ipcMain.on(IPC_CHANNELS.SEND_ANNOTATION, (_event, annotation: Annotation) => {
    activeAnnotations.push(annotation)
    logger.debug(`Nova anotação adicionada: ${annotation.tool} (total: ${activeAnnotations.length})`)
    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.NEW_ANNOTATION, annotation)
    }
  })

  ipcMain.on(IPC_CHANNELS.CLEAR_ANNOTATIONS, () => {
    activeAnnotations = []
    logger.info('Anotações limpas')
    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.CLEAR_ANNOTATIONS)
    }
  })

  ipcMain.on(IPC_CHANNELS.UNDO_ANNOTATION, () => {
    if (activeAnnotations.length > 0) {
      activeAnnotations.pop()
      logger.info(`Anotação desfeita (restantes: ${activeAnnotations.length})`)
      const viewer = getViewerWindow()
      if (viewer && !viewer.isDestroyed()) {
        viewer.webContents.send(IPC_CHANNELS.SYNC_ANNOTATIONS, activeAnnotations)
      }
    }
  })

  ipcMain.on(IPC_CHANNELS.SET_ACTIVE_TOOL, (event, settings: ActiveToolSettings) => {
    activeToolSettings = settings
    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed() && viewer.webContents !== event.sender) {
      viewer.webContents.send(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, settings)
    }
    const control = getControlWindow()
    if (control && !control.isDestroyed() && control.webContents !== event.sender) {
      control.webContents.send(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, settings)
    }
  })

  // 6. Viewer Controls
  ipcMain.on(IPC_CHANNELS.MOVE_VIEWER_TO_DISPLAY, (_event, displayId: number, fullscreen = false) => {
    logger.info(`Movendo janela do Visualizador para monitor ${displayId} (fullscreen=${fullscreen})`)
    moveToDisplay(displayId, fullscreen)
  })

  ipcMain.on(IPC_CHANNELS.TOGGLE_VIEWER_FULLSCREEN, () => {
    logger.info('Alternando tela cheia da janela do Visualizador')
    toggleViewerFullscreen()
  })

  ipcMain.on(IPC_CHANNELS.SET_VIEWER_SETTINGS, (_event, settings: Partial<ViewerSettings>) => {
    const viewer = getViewerWindow()
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.UPDATE_VIEWER_SETTINGS, settings)
    }
  })

  // 7. Logger IPC
  ipcMain.on(IPC_CHANNELS.LOG_MESSAGE, (_event, level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', msg: string, meta?: unknown) => {
    logger.log(level, `[Renderer] ${msg}`, meta)
  })

  ipcMain.handle(IPC_CHANNELS.GET_LOGS, (_event, limit: number) => {
    return logger.getLogs(limit)
  })

  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, () => {
    logger.clearLogs()
    return true
  })

  ipcMain.on(IPC_CHANNELS.OPEN_LOG_FILE, () => {
    shell.openPath(logger.getLogPath())
  })

  // 8. Web Streaming & Viewer Approval
  const webServer = getWebStreamServer()

  webServer.setOnViewersChanged((viewers) => {
    const control = getControlWindow()
    if (control && !control.isDestroyed()) {
      control.webContents.send(IPC_CHANNELS.WEB_VIEWERS_UPDATED, viewers)
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_WEB_STREAM_STATUS, () => {
    return webServer.getStatus()
  })

  ipcMain.on(IPC_CHANNELS.APPROVE_WEB_VIEWER, (_event, id: string) => {
    webServer.approveViewer(id)
  })

  ipcMain.on(IPC_CHANNELS.REJECT_WEB_VIEWER, (_event, id: string) => {
    webServer.rejectViewer(id)
  })

  ipcMain.on(IPC_CHANNELS.KICK_WEB_VIEWER, (_event, id: string) => {
    webServer.kickViewer(id)
  })

  ipcMain.on(IPC_CHANNELS.BROADCAST_WEB_FRAME, (_event, frameData: ArrayBuffer) => {
    if (frameData && webServer.hasApprovedViewers()) {
      webServer.broadcastFrame(Buffer.from(frameData))
    }
  })

  // 9. Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win?.isMaximized() ?? false
  })
}

// Ensure single instance lock in production or dev
const isDev = is.dev || Boolean(process.env['ELECTRON_RENDERER_URL'])
const gotTheLock = isDev ? true : app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  if (!isDev) {
    app.on('second-instance', () => {
      const control = getControlWindow()
      if (control) {
        if (control.isMinimized()) control.restore()
        control.focus()
      }
    })
  }

  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.professorscreenshare.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    setupIPC()

    // Start local web streaming server for /screen_shared
    const webServer = getWebStreamServer()
    webServer.start(3000).catch((err) => {
      logger.error('Falha ao iniciar servidor web stream:', err)
    })

    createControlWindow()
    createSniperWindows()
    createViewerWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) {
        createControlWindow()
        createSniperWindows()
        createViewerWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
