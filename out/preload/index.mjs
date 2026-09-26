import { contextBridge, ipcRenderer } from "electron";
const IPC_CHANNELS = {
  // Capture & Sources
  GET_SOURCES: "get-sources",
  GET_DISPLAYS: "get-displays",
  SELECT_SOURCE: "select-source",
  SET_SOURCE: "set-source",
  // Sniper
  START_SNIPER: "start-sniper",
  REGION_SELECTED: "region-selected",
  CANCEL_SNIPER: "cancel-sniper",
  APPLY_CROP: "apply-crop",
  CROP_UPDATED: "crop-updated",
  RESET_CROP: "reset-crop",
  // Annotations
  SEND_ANNOTATION: "send-annotation",
  NEW_ANNOTATION: "new-annotation",
  CLEAR_ANNOTATIONS: "clear-annotations",
  UNDO_ANNOTATION: "undo-annotation",
  SYNC_ANNOTATIONS: "sync-annotations",
  SET_ACTIVE_TOOL: "set-active-tool",
  ACTIVE_TOOL_CHANGED: "active-tool-changed",
  // Viewer Window Control
  MOVE_VIEWER_TO_DISPLAY: "move-viewer-to-display",
  TOGGLE_VIEWER_FULLSCREEN: "toggle-viewer-fullscreen",
  SET_VIEWER_SETTINGS: "set-viewer-settings",
  UPDATE_VIEWER_SETTINGS: "update-viewer-settings",
  // Logs & Diagnostics
  LOG_MESSAGE: "log-message",
  GET_LOGS: "get-logs",
  CLEAR_LOGS: "clear-logs",
  OPEN_LOG_FILE: "open-log-file",
  // Web Streaming & Viewer Approval
  GET_WEB_STREAM_STATUS: "get-web-stream-status",
  WEB_VIEWERS_UPDATED: "web-viewers-updated",
  APPROVE_WEB_VIEWER: "approve-web-viewer",
  REJECT_WEB_VIEWER: "reject-web-viewer",
  KICK_WEB_VIEWER: "kick-web-viewer",
  BROADCAST_WEB_FRAME: "broadcast-web-frame",
  // Window Management Controls
  WINDOW_MINIMIZE: "window-minimize",
  WINDOW_MAXIMIZE: "window-maximize",
  WINDOW_CLOSE: "window-close",
  WINDOW_IS_MAXIMIZED: "window-is-maximized",
  WINDOW_MAXIMIZED_STATE: "window-maximized-state"
};
const api = {
  // Sources & Displays
  getSources: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SOURCES),
  getDisplays: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DISPLAYS),
  selectSource: (sourceId) => ipcRenderer.send(IPC_CHANNELS.SELECT_SOURCE, sourceId),
  // Sniper / Crop
  startSniper: (transparency) => ipcRenderer.send(IPC_CHANNELS.START_SNIPER, transparency),
  regionSelected: (region) => ipcRenderer.send(IPC_CHANNELS.REGION_SELECTED, region),
  cancelSniper: () => ipcRenderer.send(IPC_CHANNELS.CANCEL_SNIPER),
  resetCrop: () => ipcRenderer.send(IPC_CHANNELS.RESET_CROP),
  // Annotations
  sendAnnotation: (annotation) => ipcRenderer.send(IPC_CHANNELS.SEND_ANNOTATION, annotation),
  clearAnnotations: () => ipcRenderer.send(IPC_CHANNELS.CLEAR_ANNOTATIONS),
  undoAnnotation: () => ipcRenderer.send(IPC_CHANNELS.UNDO_ANNOTATION),
  setActiveTool: (settings) => ipcRenderer.send(IPC_CHANNELS.SET_ACTIVE_TOOL, settings),
  // Viewer Control
  moveViewerToDisplay: (displayId, fullscreen = false) => ipcRenderer.send(IPC_CHANNELS.MOVE_VIEWER_TO_DISPLAY, displayId, fullscreen),
  toggleViewerFullscreen: () => ipcRenderer.send(IPC_CHANNELS.TOGGLE_VIEWER_FULLSCREEN),
  setViewerSettings: (settings) => ipcRenderer.send(IPC_CHANNELS.SET_VIEWER_SETTINGS, settings),
  // Logs
  log: (level, message, meta) => ipcRenderer.send(IPC_CHANNELS.LOG_MESSAGE, level, message, meta),
  getLogs: (limit = 200) => ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS, limit),
  clearLogs: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS),
  openLogFile: () => ipcRenderer.send(IPC_CHANNELS.OPEN_LOG_FILE),
  // Web Streaming & Viewer Approval
  getWebStreamStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_WEB_STREAM_STATUS),
  approveWebViewer: (id) => ipcRenderer.send(IPC_CHANNELS.APPROVE_WEB_VIEWER, id),
  rejectWebViewer: (id) => ipcRenderer.send(IPC_CHANNELS.REJECT_WEB_VIEWER, id),
  kickWebViewer: (id) => ipcRenderer.send(IPC_CHANNELS.KICK_WEB_VIEWER, id),
  broadcastWebFrame: (frame) => ipcRenderer.send(IPC_CHANNELS.BROADCAST_WEB_FRAME, frame),
  // Window Controls
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  isWindowMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  onWindowMaximizedState: (callback) => {
    const subscription = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_MAXIMIZED_STATE, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_MAXIMIZED_STATE, subscription);
    };
  },
  // Listeners
  onSetSource: (callback) => {
    const subscription = (_event, sourceId) => callback(sourceId);
    ipcRenderer.on(IPC_CHANNELS.SET_SOURCE, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SET_SOURCE, subscription);
    };
  },
  onApplyCrop: (callback) => {
    const subscription = (_event, region) => callback(region);
    ipcRenderer.on(IPC_CHANNELS.APPLY_CROP, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.APPLY_CROP, subscription);
    };
  },
  onCropUpdated: (callback) => {
    const subscription = (_event, region) => callback(region);
    ipcRenderer.on(IPC_CHANNELS.CROP_UPDATED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CROP_UPDATED, subscription);
    };
  },
  onNewAnnotation: (callback) => {
    const subscription = (_event, annotation) => callback(annotation);
    ipcRenderer.on(IPC_CHANNELS.NEW_ANNOTATION, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NEW_ANNOTATION, subscription);
    };
  },
  onClearAnnotations: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on(IPC_CHANNELS.CLEAR_ANNOTATIONS, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CLEAR_ANNOTATIONS, subscription);
    };
  },
  onUndoAnnotation: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on(IPC_CHANNELS.UNDO_ANNOTATION, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UNDO_ANNOTATION, subscription);
    };
  },
  onSyncAnnotations: (callback) => {
    const subscription = (_event, list) => callback(list);
    ipcRenderer.on(IPC_CHANNELS.SYNC_ANNOTATIONS, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SYNC_ANNOTATIONS, subscription);
    };
  },
  onUpdateViewerSettings: (callback) => {
    const subscription = (_event, s) => callback(s);
    ipcRenderer.on(IPC_CHANNELS.UPDATE_VIEWER_SETTINGS, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_VIEWER_SETTINGS, subscription);
    };
  },
  onActiveToolChanged: (callback) => {
    const subscription = (_event, s) => callback(s);
    ipcRenderer.on(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, subscription);
    };
  },
  onSourceAutoSelected: (callback) => {
    const subscription = (_event, sourceId) => callback(sourceId);
    ipcRenderer.on("source-auto-selected", subscription);
    return () => {
      ipcRenderer.removeListener("source-auto-selected", subscription);
    };
  },
  setSniperTransparency: (transparency) => ipcRenderer.send("set-sniper-transparency", transparency),
  onSniperTransparencyChanged: (callback) => {
    const subscription = (_event, transparency) => callback(transparency);
    ipcRenderer.on("sniper-transparency-changed", subscription);
    return () => {
      ipcRenderer.removeListener("sniper-transparency-changed", subscription);
    };
  },
  onWebViewersUpdated: (callback) => {
    const subscription = (_event, viewers) => callback(viewers);
    ipcRenderer.on(IPC_CHANNELS.WEB_VIEWERS_UPDATED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WEB_VIEWERS_UPDATED, subscription);
    };
  }
};
contextBridge.exposeInMainWorld("electronAPI", api);
