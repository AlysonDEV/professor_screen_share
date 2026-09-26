export const IPC_CHANNELS = {
  // Capture & Sources
  GET_SOURCES: 'get-sources',
  GET_DISPLAYS: 'get-displays',
  SELECT_SOURCE: 'select-source',
  SET_SOURCE: 'set-source',

  // Sniper
  START_SNIPER: 'start-sniper',
  REGION_SELECTED: 'region-selected',
  CANCEL_SNIPER: 'cancel-sniper',
  APPLY_CROP: 'apply-crop',
  CROP_UPDATED: 'crop-updated',
  RESET_CROP: 'reset-crop',

  // Annotations
  SEND_ANNOTATION: 'send-annotation',
  NEW_ANNOTATION: 'new-annotation',
  CLEAR_ANNOTATIONS: 'clear-annotations',
  UNDO_ANNOTATION: 'undo-annotation',
  SYNC_ANNOTATIONS: 'sync-annotations',
  SET_ACTIVE_TOOL: 'set-active-tool',
  ACTIVE_TOOL_CHANGED: 'active-tool-changed',

  // Viewer Window Control
  MOVE_VIEWER_TO_DISPLAY: 'move-viewer-to-display',
  TOGGLE_VIEWER_FULLSCREEN: 'toggle-viewer-fullscreen',
  SET_VIEWER_SETTINGS: 'set-viewer-settings',
  UPDATE_VIEWER_SETTINGS: 'update-viewer-settings',

  // Logs & Diagnostics
  LOG_MESSAGE: 'log-message',
  GET_LOGS: 'get-logs',
  CLEAR_LOGS: 'clear-logs',
  OPEN_LOG_FILE: 'open-log-file',

  // Web Streaming & Viewer Approval
  GET_WEB_STREAM_STATUS: 'get-web-stream-status',
  WEB_VIEWERS_UPDATED: 'web-viewers-updated',
  APPROVE_WEB_VIEWER: 'approve-web-viewer',
  REJECT_WEB_VIEWER: 'reject-web-viewer',
  KICK_WEB_VIEWER: 'kick-web-viewer',
  BROADCAST_WEB_FRAME: 'broadcast-web-frame',

  // Window Management Controls
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  WINDOW_MAXIMIZED_STATE: 'window-maximized-state'
} as const
