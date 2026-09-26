import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-events'
import type {
  CropRegion,
  Annotation,
  ActiveToolSettings,
  DesktopSourceInfo,
  DisplayInfo,
  ViewerSettings,
  WebViewerInfo,
  WebStreamStatus
} from '@shared/types'

const api = {
  // Sources & Displays
  getSources: (): Promise<DesktopSourceInfo[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_SOURCES),
  getDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_DISPLAYS),
  selectSource: (sourceId: string): void => ipcRenderer.send(IPC_CHANNELS.SELECT_SOURCE, sourceId),

  // Sniper / Crop
  startSniper: (transparency?: number): void => ipcRenderer.send(IPC_CHANNELS.START_SNIPER, transparency),
  regionSelected: (region: CropRegion): void => ipcRenderer.send(IPC_CHANNELS.REGION_SELECTED, region),
  cancelSniper: (): void => ipcRenderer.send(IPC_CHANNELS.CANCEL_SNIPER),
  resetCrop: (): void => ipcRenderer.send(IPC_CHANNELS.RESET_CROP),

  // Annotations
  sendAnnotation: (annotation: Annotation): void => ipcRenderer.send(IPC_CHANNELS.SEND_ANNOTATION, annotation),
  clearAnnotations: (): void => ipcRenderer.send(IPC_CHANNELS.CLEAR_ANNOTATIONS),
  undoAnnotation: (): void => ipcRenderer.send(IPC_CHANNELS.UNDO_ANNOTATION),
  setActiveTool: (settings: ActiveToolSettings): void => ipcRenderer.send(IPC_CHANNELS.SET_ACTIVE_TOOL, settings),

  // Viewer Control
  moveViewerToDisplay: (displayId: number, fullscreen = false): void =>
    ipcRenderer.send(IPC_CHANNELS.MOVE_VIEWER_TO_DISPLAY, displayId, fullscreen),
  toggleViewerFullscreen: (): void => ipcRenderer.send(IPC_CHANNELS.TOGGLE_VIEWER_FULLSCREEN),
  setViewerSettings: (settings: Partial<ViewerSettings>): void =>
    ipcRenderer.send(IPC_CHANNELS.SET_VIEWER_SETTINGS, settings),

  // Logs
  log: (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, meta?: unknown): void =>
    ipcRenderer.send(IPC_CHANNELS.LOG_MESSAGE, level, message, meta),
  getLogs: (limit = 200): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS, limit),
  clearLogs: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS),
  openLogFile: (): void => ipcRenderer.send(IPC_CHANNELS.OPEN_LOG_FILE),

  // Web Streaming & Viewer Approval
  getWebStreamStatus: (): Promise<WebStreamStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_WEB_STREAM_STATUS),
  approveWebViewer: (id: string): void => ipcRenderer.send(IPC_CHANNELS.APPROVE_WEB_VIEWER, id),
  rejectWebViewer: (id: string): void => ipcRenderer.send(IPC_CHANNELS.REJECT_WEB_VIEWER, id),
  kickWebViewer: (id: string): void => ipcRenderer.send(IPC_CHANNELS.KICK_WEB_VIEWER, id),
  broadcastWebFrame: (frame: ArrayBuffer): void =>
    ipcRenderer.send(IPC_CHANNELS.BROADCAST_WEB_FRAME, frame),

  // Window Controls
  minimizeWindow: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  isWindowMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  onWindowMaximizedState: (callback: (isMaximized: boolean) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => callback(isMaximized)
    ipcRenderer.on(IPC_CHANNELS.WINDOW_MAXIMIZED_STATE, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_MAXIMIZED_STATE, subscription)
    }
  },

  // External Links
  openExternal: (url: string): void => ipcRenderer.send(IPC_CHANNELS.OPEN_EXTERNAL, url),

  // Listeners
  onSetSource: (callback: (sourceId: string) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, sourceId: string): void => callback(sourceId)
    ipcRenderer.on(IPC_CHANNELS.SET_SOURCE, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.SET_SOURCE, subscription)
    }
  },
  onApplyCrop: (callback: (cropRegion: CropRegion | null) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, region: CropRegion | null): void => callback(region)
    ipcRenderer.on(IPC_CHANNELS.APPLY_CROP, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.APPLY_CROP, subscription)
    }
  },
  onCropUpdated: (callback: (cropRegion: CropRegion | null) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, region: CropRegion | null): void => callback(region)
    ipcRenderer.on(IPC_CHANNELS.CROP_UPDATED, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.CROP_UPDATED, subscription)
    }
  },
  onNewAnnotation: (callback: (annotation: Annotation) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, annotation: Annotation): void => callback(annotation)
    ipcRenderer.on(IPC_CHANNELS.NEW_ANNOTATION, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.NEW_ANNOTATION, subscription)
    }
  },
  onClearAnnotations: (callback: () => void): (() => void) => {
    const subscription = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.CLEAR_ANNOTATIONS, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.CLEAR_ANNOTATIONS, subscription)
    }
  },
  onUndoAnnotation: (callback: () => void): (() => void) => {
    const subscription = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.UNDO_ANNOTATION, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.UNDO_ANNOTATION, subscription)
    }
  },
  onSyncAnnotations: (callback: (annotations: Annotation[]) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, list: Annotation[]): void => callback(list)
    ipcRenderer.on(IPC_CHANNELS.SYNC_ANNOTATIONS, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.SYNC_ANNOTATIONS, subscription)
    }
  },
  onUpdateViewerSettings: (callback: (settings: Partial<ViewerSettings>) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, s: Partial<ViewerSettings>): void => callback(s)
    ipcRenderer.on(IPC_CHANNELS.UPDATE_VIEWER_SETTINGS, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_VIEWER_SETTINGS, subscription)
    }
  },
  onActiveToolChanged: (callback: (settings: ActiveToolSettings) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, s: ActiveToolSettings): void => callback(s)
    ipcRenderer.on(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, subscription)
    }
  },
  onSourceAutoSelected: (callback: (sourceId: string) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, sourceId: string): void => callback(sourceId)
    ipcRenderer.on('source-auto-selected', subscription)
    return (): void => {
      ipcRenderer.removeListener('source-auto-selected', subscription)
    }
  },
  setSniperTransparency: (transparency: number): void =>
    ipcRenderer.send('set-sniper-transparency', transparency),
  onSniperTransparencyChanged: (callback: (transparency: number) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, transparency: number): void =>
      callback(transparency)
    ipcRenderer.on('sniper-transparency-changed', subscription)
    return (): void => {
      ipcRenderer.removeListener('sniper-transparency-changed', subscription)
    }
  },
  onWebViewersUpdated: (callback: (viewers: WebViewerInfo[]) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, viewers: WebViewerInfo[]): void =>
      callback(viewers)
    ipcRenderer.on(IPC_CHANNELS.WEB_VIEWERS_UPDATED, subscription)
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.WEB_VIEWERS_UPDATED, subscription)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
