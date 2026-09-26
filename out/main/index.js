import { app, session, ipcMain, BrowserWindow, nativeImage, screen, desktopCapturer, shell } from "electron";
import path, { join } from "path";
import fs, { existsSync, mkdirSync, statSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import http from "http";
import os from "os";
import { WebSocketServer, WebSocket } from "ws";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const is = {
  dev: !app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    ipcMain.on("win:invoke", (event, action) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
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
  WINDOW_IS_MAXIMIZED: "window-is-maximized"
};
function getPreloadPath() {
  const mjsPath = join(__dirname, "../preload/index.mjs");
  if (existsSync(mjsPath)) {
    return mjsPath;
  }
  const jsPath = join(__dirname, "../preload/index.js");
  if (existsSync(jsPath)) {
    return jsPath;
  }
  const cjsPath = join(__dirname, "../preload/index.cjs");
  if (existsSync(cjsPath)) {
    return cjsPath;
  }
  return mjsPath;
}
function getAppIcon() {
  const candidates = [
    join(__dirname, "../../resources/icon.png"),
    join(process.cwd(), "resources/icon.png"),
    join(__dirname, "../resources/icon.png"),
    join(__dirname, "../../src/renderer/src/assets/icon.png")
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const img = nativeImage.createFromPath(candidate);
      if (!img.isEmpty()) {
        return img;
      }
    }
  }
  return void 0;
}
let controlWindow = null;
function createControlWindow() {
  const icon = getAppIcon();
  controlWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 400,
    minHeight: 650,
    title: "Professor Screen Share - Menu",
    titleBarStyle: "hidden",
    backgroundColor: "#020617",
    icon,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  controlWindow.on("ready-to-show", () => {
    controlWindow?.show();
  });
  controlWindow.on("maximize", () => {
    controlWindow?.webContents.send("window-maximized-state", true);
  });
  controlWindow.on("unmaximize", () => {
    controlWindow?.webContents.send("window-maximized-state", false);
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    controlWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#control`);
  } else {
    controlWindow.loadFile(join(__dirname, "../renderer/index.html"), { hash: "control" });
  }
  controlWindow.on("closed", () => {
    controlWindow = null;
    app.quit();
  });
  return controlWindow;
}
function getControlWindow() {
  return controlWindow;
}
const sniperWindows = /* @__PURE__ */ new Map();
function createSniperWindows() {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  for (const [id, win] of sniperWindows.entries()) {
    if (!displays.some((d) => d.id === id)) {
      if (!win.isDestroyed()) win.destroy();
      sniperWindows.delete(id);
    }
  }
  displays.forEach((display, index) => {
    let win = sniperWindows.get(display.id);
    const isPrimary = display.id === primaryId;
    const displayName = `Monitor ${index + 1}${isPrimary ? " (Principal)" : ""}`;
    const query = `?displayId=${display.id}&index=${index}&name=${encodeURIComponent(displayName)}`;
    if (!win || win.isDestroyed()) {
      win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        transparent: true,
        backgroundColor: "#00000000",
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
      });
      win.setAlwaysOnTop(true, "screen-saver");
      if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        win.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#sniper${query}`);
      } else {
        win.loadFile(join(__dirname, "../renderer/index.html"), { hash: `sniper${query}` });
      }
      win.on("closed", () => {
        sniperWindows.delete(display.id);
      });
      sniperWindows.set(display.id, win);
    } else {
      win.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height
      });
    }
  });
}
function setSniperTransparency(transparency) {
  for (const win of sniperWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send("sniper-transparency-changed", transparency);
    }
  }
}
function showSniperWindows(targetDisplayId, transparency = 70) {
  createSniperWindows();
  for (const win of sniperWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send("sniper-transparency-changed", transparency);
      win.show();
    }
  }
  if (targetDisplayId && sniperWindows.has(targetDisplayId)) {
    sniperWindows.get(targetDisplayId)?.focus();
  } else {
    const cursor = screen.getCursorScreenPoint();
    const currentDisplay = screen.getDisplayNearestPoint(cursor);
    const targetWin = sniperWindows.get(currentDisplay.id);
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.focus();
    }
  }
}
function hideSniperWindows() {
  for (const win of sniperWindows.values()) {
    if (!win.isDestroyed()) {
      win.hide();
    }
  }
}
let viewerWindow = null;
function createViewerWindow() {
  const displays = screen.getAllDisplays();
  const secondaryDisplay = displays.find((d) => d.id !== screen.getPrimaryDisplay().id);
  const defaultBounds = secondaryDisplay ? {
    x: secondaryDisplay.bounds.x + 50,
    y: secondaryDisplay.bounds.y + 50,
    width: 1280,
    height: 720
  } : {
    width: 960,
    height: 540
  };
  const icon = getAppIcon();
  viewerWindow = new BrowserWindow({
    ...defaultBounds,
    title: "Professor Screen Share - Visualizador",
    backgroundColor: "#000000",
    icon,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  viewerWindow.on("ready-to-show", () => {
    viewerWindow?.show();
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    viewerWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#viewer`);
  } else {
    viewerWindow.loadFile(join(__dirname, "../renderer/index.html"), { hash: "viewer" });
  }
  viewerWindow.on("closed", () => {
    viewerWindow = null;
  });
  return viewerWindow;
}
function moveToDisplay(displayId, fullscreen = false) {
  if (!viewerWindow || viewerWindow.isDestroyed()) {
    createViewerWindow();
  }
  const displays = screen.getAllDisplays();
  const targetDisplay = displays.find((d) => d.id === displayId);
  if (targetDisplay && viewerWindow) {
    if (viewerWindow.isFullScreen()) {
      viewerWindow.setFullScreen(false);
    }
    const { x, y, width, height } = targetDisplay.bounds;
    viewerWindow.setPosition(x + 50, y + 50);
    viewerWindow.setSize(Math.min(1280, width - 100), Math.min(720, height - 100));
    if (fullscreen) {
      setTimeout(() => {
        viewerWindow?.setFullScreen(true);
      }, 100);
    }
    viewerWindow.show();
    viewerWindow.focus();
  }
}
function toggleViewerFullscreen() {
  if (viewerWindow && !viewerWindow.isDestroyed()) {
    viewerWindow.setFullScreen(!viewerWindow.isFullScreen());
  }
}
function getViewerWindow() {
  return viewerWindow;
}
class AppLogger {
  logDir;
  logFilePath;
  maxFileSize = 5 * 1024 * 1024;
  // 5 MB
  constructor() {
    const baseDir = app?.isPackaged ? app.getPath("userData") : process.cwd();
    this.logDir = join(baseDir, "logs");
    this.logFilePath = join(this.logDir, "app.log");
    this.ensureLogDir();
  }
  ensureLogDir() {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error("Falha ao criar diretório de logs:", err);
    }
  }
  formatMessage(level, message, meta) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    let metaStr = "";
    if (meta !== void 0) {
      if (meta instanceof Error) {
        metaStr = `
Stack: ${meta.stack || meta.message}`;
      } else if (typeof meta === "object") {
        try {
          metaStr = ` | Meta: ${JSON.stringify(meta)}`;
        } catch {
          metaStr = ` | Meta: [Unserializable Object]`;
        }
      } else {
        metaStr = ` | ${String(meta)}`;
      }
    }
    return `[${timestamp}] [${level}] ${message}${metaStr}
`;
  }
  checkRotation() {
    try {
      if (existsSync(this.logFilePath)) {
        const stats = statSync(this.logFilePath);
        if (stats.size > this.maxFileSize) {
          const content = readFileSync(this.logFilePath, "utf-8");
          const lines = content.split("\n");
          const trimmed = lines.slice(-500).join("\n");
          writeFileSync(this.logFilePath, trimmed, "utf-8");
        }
      }
    } catch {
    }
  }
  log(level, message, meta) {
    const formatted = this.formatMessage(level, message, meta);
    this.checkRotation();
    try {
      appendFileSync(this.logFilePath, formatted, "utf-8");
    } catch (err) {
      console.error("Falha ao escrever no arquivo de log:", err);
    }
    if (level === "ERROR") {
      console.error(`[${level}] ${message}`, meta || "");
    } else if (level === "WARN") {
      console.warn(`[${level}] ${message}`, meta || "");
    } else {
      console.log(`[${level}] ${message}`, meta || "");
    }
  }
  info(message, meta) {
    this.log("INFO", message, meta);
  }
  warn(message, meta) {
    this.log("WARN", message, meta);
  }
  error(message, meta) {
    this.log("ERROR", message, meta);
  }
  debug(message, meta) {
    this.log("DEBUG", message, meta);
  }
  getLogs(limit = 200) {
    try {
      if (existsSync(this.logFilePath)) {
        const content = readFileSync(this.logFilePath, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim().length > 0);
        return lines.slice(-limit);
      }
    } catch (err) {
      console.error("Falha ao ler arquivo de logs:", err);
    }
    return [];
  }
  clearLogs() {
    try {
      writeFileSync(this.logFilePath, "", "utf-8");
      this.info("Histórico de logs limpo pelo usuário.");
    } catch (err) {
      console.error("Falha ao limpar logs:", err);
    }
  }
  getLogPath() {
    return this.logFilePath;
  }
}
const logger = new AppLogger();
function getIconBuffer() {
  const candidates = [
    path.join(__dirname, "../../resources/icon.png"),
    path.join(process.cwd(), "resources/icon.png"),
    path.join(__dirname, "../resources/icon.png"),
    path.join(__dirname, "../../src/renderer/src/assets/icon.png")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate);
      } catch {
      }
    }
  }
  return null;
}
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("127.")) {
        return net.address;
      }
    }
  }
  return "localhost";
}
class WebStreamServer {
  server = null;
  wss = null;
  sessions = /* @__PURE__ */ new Map();
  port = 3e3;
  ip = "localhost";
  isRunning = false;
  onViewersChangedCallback;
  constructor(onViewersChanged) {
    this.onViewersChangedCallback = onViewersChanged;
    this.ip = getLocalIpAddress();
  }
  setOnViewersChanged(callback) {
    this.onViewersChangedCallback = callback;
  }
  start(preferredPort = 3e3) {
    return new Promise((resolve) => {
      this.port = preferredPort;
      this.ip = getLocalIpAddress();
      const tryListen = (currentPort) => {
        const srv = http.createServer((req, res) => {
          const url = req.url || "/";
          if (url.startsWith("/screen_shared")) {
            res.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            });
            res.end(this.getViewerHtml());
            return;
          }
          if (url === "/icon.png" || url === "/favicon.ico") {
            const iconBuf = getIconBuffer();
            if (iconBuf) {
              res.writeHead(200, {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400"
              });
              res.end(iconBuf);
              return;
            }
          }
          if (url === "/" || url === "") {
            res.writeHead(302, { Location: "/screen_shared" });
            res.end();
            return;
          }
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Página não encontrada. Acesse /screen_shared");
        });
        srv.on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            logger.warn(`Porta ${currentPort} já em uso. Tentando porta ${currentPort + 1}...`);
            tryListen(currentPort + 1);
          } else {
            logger.error(`Erro ao iniciar servidor HTTP: ${err.message}`);
            this.isRunning = false;
            resolve(this.getStatus());
          }
        });
        srv.listen(currentPort, "0.0.0.0", () => {
          this.port = currentPort;
          this.server = srv;
          this.isRunning = true;
          logger.info(`Servidor Screen Shared ativo em http://${this.ip}:${this.port}/screen_shared`);
          this.setupWebSocketServer(srv);
          resolve(this.getStatus());
        });
      };
      tryListen(this.port);
    });
  }
  setupWebSocketServer(httpServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.wss.on("connection", (ws, req) => {
      const rawIp = req.socket.remoteAddress || "Desconhecido";
      const clientIp = rawIp.replace(/^::ffff:/, "");
      const sessionId = `ws_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      ws.on("message", (data, isBinary) => {
        if (isBinary) return;
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "REQUEST_ACCESS") {
            const name = (message.name || "Convidado").trim().substring(0, 32);
            const session2 = {
              id: sessionId,
              ws,
              name: name || "Convidado",
              ip: clientIp,
              status: "WAITING",
              joinedAt: Date.now()
            };
            this.sessions.set(sessionId, session2);
            logger.info(`Solicitação de acesso web recebida: "${session2.name}" de ${session2.ip}`);
            ws.send(JSON.stringify({ type: "STATUS_UPDATE", status: "WAITING", id: sessionId }));
            this.notifyViewersChanged();
          }
        } catch (err) {
          logger.warn(`Mensagem inválida recebida do cliente web ${clientIp}:`, err);
        }
      });
      ws.on("close", () => {
        if (this.sessions.has(sessionId)) {
          const s = this.sessions.get(sessionId);
          logger.info(`Cliente web desconectou: "${s?.name}" (${s?.ip})`);
          this.sessions.delete(sessionId);
          this.notifyViewersChanged();
        }
      });
      ws.on("error", (err) => {
        logger.warn(`Erro no socket do cliente web (${clientIp}):`, err.message);
      });
    });
  }
  approveViewer(sessionId) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) return false;
    session2.status = "APPROVED";
    logger.info(`Usuário web aprovado pelo host: "${session2.name}" (${session2.ip})`);
    if (session2.ws.readyState === WebSocket.OPEN) {
      session2.ws.send(JSON.stringify({ type: "STATUS_UPDATE", status: "APPROVED" }));
    }
    this.notifyViewersChanged();
    return true;
  }
  rejectViewer(sessionId) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) return false;
    session2.status = "REJECTED";
    logger.info(`Usuário web recusado pelo host: "${session2.name}" (${session2.ip})`);
    if (session2.ws.readyState === WebSocket.OPEN) {
      session2.ws.send(JSON.stringify({ type: "STATUS_UPDATE", status: "REJECTED" }));
      setTimeout(() => {
        if (session2.ws.readyState === WebSocket.OPEN) {
          session2.ws.close();
        }
      }, 500);
    }
    this.sessions.delete(sessionId);
    this.notifyViewersChanged();
    return true;
  }
  kickViewer(sessionId) {
    const session2 = this.sessions.get(sessionId);
    if (!session2) return false;
    logger.info(`Usuário web desconectado pelo host: "${session2.name}" (${session2.ip})`);
    if (session2.ws.readyState === WebSocket.OPEN) {
      session2.ws.send(JSON.stringify({ type: "STATUS_UPDATE", status: "KICKED" }));
      setTimeout(() => {
        if (session2.ws.readyState === WebSocket.OPEN) {
          session2.ws.close();
        }
      }, 300);
    }
    this.sessions.delete(sessionId);
    this.notifyViewersChanged();
    return true;
  }
  broadcastFrame(frameBuffer) {
    if (!this.wss || this.sessions.size === 0) return;
    for (const session2 of this.sessions.values()) {
      if (session2.status === "APPROVED" && session2.ws.readyState === WebSocket.OPEN) {
        if (session2.ws.bufferedAmount < 1024 * 1024) {
          session2.ws.send(frameBuffer, { binary: true });
        }
      }
    }
  }
  hasApprovedViewers() {
    for (const session2 of this.sessions.values()) {
      if (session2.status === "APPROVED" && session2.ws.readyState === WebSocket.OPEN) {
        return true;
      }
    }
    return false;
  }
  getViewersList() {
    const list = [];
    for (const s of this.sessions.values()) {
      list.push({
        id: s.id,
        name: s.name,
        ip: s.ip,
        status: s.status,
        joinedAt: s.joinedAt
      });
    }
    return list.sort((a, b) => b.joinedAt - a.joinedAt);
  }
  getStatus() {
    return {
      url: `http://${this.ip}:${this.port}/screen_shared`,
      port: this.port,
      ip: this.ip,
      isRunning: this.isRunning,
      viewers: this.getViewersList()
    };
  }
  stop() {
    if (this.wss) {
      for (const session2 of this.sessions.values()) {
        try {
          session2.ws.close();
        } catch {
        }
      }
      this.sessions.clear();
      this.wss.close();
      this.wss = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.isRunning = false;
    this.notifyViewersChanged();
  }
  notifyViewersChanged() {
    if (this.onViewersChangedCallback) {
      this.onViewersChangedCallback(this.getViewersList());
    }
  }
  getViewerHtml() {
    const iconBuf = getIconBuffer();
    const iconDataUri = iconBuf ? `data:image/png;base64,${iconBuf.toString("base64")}` : "/icon.png";
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="icon" type="image/png" href="${iconDataUri}">
  <link rel="apple-touch-icon" href="${iconDataUri}">
  <title>Professor Screen Share - Transmissão Ao Vivo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #020617;
      color: #f8fafc;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 20;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-live {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      border-radius: 9999px;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: #000000;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px;
      -webkit-overflow-scrolling: touch;
    }
    #screenImage {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: none;
    }
    .overlay-card {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(51, 65, 85, 0.85);
      backdrop-filter: blur(16px);
      padding: clamp(16px, 4vw, 28px);
      border-radius: 20px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.8);
      margin: auto;
      transition: all 0.2s ease;
    }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #f8fafc; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; }
    .form-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    input[type="text"] {
      width: 100%;
      padding: 12px 16px;
      background: #020617;
      border: 1px solid #334155;
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: #6366f1; }
    button.primary-btn {
      width: 100%;
      padding: 12px 18px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
      transition: all 0.2s;
    }
    button.primary-btn:hover { opacity: 0.95; transform: translateY(-1px); }
    button.secondary-btn {
      margin-top: 10px;
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      cursor: pointer;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 14px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-height: 520px), (orientation: landscape) and (max-height: 600px) {
      main {
        padding: 8px;
      }
      .overlay-card {
        max-width: 500px;
        padding: 12px 18px;
        border-radius: 14px;
      }
      .overlay-card h2 {
        font-size: 16px;
        margin-bottom: 2px;
      }
      .overlay-card p {
        font-size: 11px;
        margin-bottom: 10px;
      }
      .form-row {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
      input[type="text"] {
        padding: 9px 12px;
        font-size: 13px;
        flex: 1;
        min-width: 0;
      }
      button.primary-btn {
        width: auto;
        padding: 9px 16px;
        font-size: 13px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .spinner {
        width: 28px;
        height: 28px;
        margin-bottom: 6px;
      }
      button.secondary-btn {
        margin-top: 6px;
        padding: 6px 12px;
      }
    }
    .status-hud {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(51, 65, 85, 0.7);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 11px;
      color: #cbd5e1;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      z-index: 30;
      user-select: none;
    }
    .hud-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(2, 6, 23, 0.6);
      padding: 2px 6px;
      border-radius: 8px;
      border: 1px solid rgba(51, 65, 85, 0.5);
    }
    .hud-btn {
      background: transparent;
      border: none;
      color: #cbd5e1;
      padding: 4px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .hud-btn:hover {
      background: rgba(99, 102, 241, 0.25);
      color: #fff;
    }
    .hud-btn.active {
      background: #4f46e5;
      color: #fff;
      box-shadow: 0 0 10px rgba(79, 70, 229, 0.5);
    }
    .zoom-badge {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      color: #818cf8;
      min-width: 38px;
      text-align: center;
      cursor: pointer;
    }
    .hud-divider {
      width: 1px;
      height: 16px;
      background: rgba(71, 85, 105, 0.6);
    }
    .fs-btn {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(71, 85, 105, 0.8);
      color: #fff;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .fs-btn:hover { background: rgba(51, 65, 85, 0.9); }
    #viewportContainer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: default;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="${iconDataUri}" alt="Logo" style="width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.4); object-fit: cover; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
      <span style="font-weight: 700; font-size: 14px; letter-spacing: -0.3px;">Professor Screen Share</span>
    </div>

    <!-- Prominent Top Zoom & Pan Controls in Header -->
    <div id="topZoomToolbar" style="display: none; align-items: center; gap: 8px;">
      <div class="hud-group">
        <button class="hud-btn" id="zoomOutBtn" title="Diminuir Zoom (-)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <span id="zoomValue" class="zoom-badge" title="Clique para resetar">100%</span>
        <button class="hud-btn" id="zoomInBtn" title="Aumentar Zoom (+)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button class="hud-btn" id="resetZoomBtn" title="Resetar Zoom (100%)">1:1</button>
      </div>

      <button class="hud-btn" id="panModeBtn" title="Modo Mover (Arraste para mover pela tela)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>
        <span style="margin-left: 4px;">Mover</span>
      </button>

      <button class="fs-btn" id="fullscreenBtn" title="Tela Cheia">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        <span style="margin-left: 3px;">Tela Cheia</span>
      </button>
    </div>

    <div class="badge-live">
      <span class="pulse-dot"></span>
      <span id="headerStatus">Pronto</span>
    </div>
  </header>

  <main id="mainContainer">
    <!-- View 1: Name Input -->
    <div id="joinView" class="overlay-card">
      <img src="${iconDataUri}" alt="Professor Screen Share" style="width: 68px; height: 68px; border-radius: 18px; margin: 0 auto 16px auto; display: block; border: 1px solid rgba(99, 102, 241, 0.4); box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35); object-fit: cover;">
      <h2>Entrar na Sessão</h2>
      <p>Digite seu nome para solicitar acesso ao compartilhamento de tela:</p>
      <div class="form-row">
        <input type="text" id="nameInput" placeholder="Ex: Lucas Silva" maxlength="28" autofocus>
        <button class="primary-btn" id="requestBtn">Solicitar Acesso</button>
      </div>
    </div>

    <!-- View 2: Waiting Approval -->
    <div id="waitingView" class="overlay-card" style="display: none;">
      <img src="${iconDataUri}" alt="Professor Screen Share" style="width: 52px; height: 52px; border-radius: 14px; margin: 0 auto 14px auto; display: block; border: 1px solid rgba(99, 102, 241, 0.3); opacity: 0.95; box-shadow: 0 4px 16px rgba(0,0,0,0.5); object-fit: cover;">
      <div class="spinner"></div>
      <h2>Aguardando Aprovação</h2>
      <p>Sua solicitação foi enviada como <strong id="submittedName" style="color: #818cf8;"></strong>.<br>O anfitrião precisa aprovar sua entrada no <strong>Menu</strong>.</p>
      <button class="secondary-btn" id="cancelWaitingBtn">Cancelar</button>
    </div>

    <!-- View 3: Rejected / Kicked -->
    <div id="rejectedView" class="overlay-card" style="display: none;">
      <h2 id="rejectedTitle" style="color: #f87171;">Acesso Negado</h2>
      <p id="rejectedMessage">Sua solicitação não foi aprovada pelo anfitrião.</p>
      <button class="primary-btn" id="retryBtn">Tentar Novamente</button>
    </div>

    <!-- View 4: Live Image Stream with Zoom and Pan Viewport -->
    <div id="viewportContainer">
      <img id="screenImage" alt="Transmissão de Tela">
    </div>

    <!-- Floating Hint when viewing -->
    <div id="streamHud" class="status-hud" style="display: none;">
      <span id="fpsCounter" style="font-family: monospace; font-size: 11px;">60 FPS</span>
      <span>•</span>
      <span style="font-size: 11px; color: #94a3b8;">Scroll para Zoom • Arraste para Mover</span>
    </div>
  </main>

  <script>
    let ws = null;
    let userName = localStorage.getItem('screen_shared_name') || '';
    let currentBlobUrl = null;
    let frameCount = 0;
    let lastFpsUpdate = Date.now();

    // Zoom & Pan state
    let zoom = 1.0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let isPanModeActive = false;
    let initialPinchDistance = null;
    let initialPinchZoom = 1.0;

    const joinView = document.getElementById('joinView');
    const waitingView = document.getElementById('waitingView');
    const rejectedView = document.getElementById('rejectedView');
    const viewportContainer = document.getElementById('viewportContainer');
    const screenImage = document.getElementById('screenImage');
    const streamHud = document.getElementById('streamHud');
    const topZoomToolbar = document.getElementById('topZoomToolbar');
    const headerStatus = document.getElementById('headerStatus');
    const submittedName = document.getElementById('submittedName');
    const nameInput = document.getElementById('nameInput');
    const requestBtn = document.getElementById('requestBtn');
    const cancelWaitingBtn = document.getElementById('cancelWaitingBtn');
    const retryBtn = document.getElementById('retryBtn');
    const rejectedTitle = document.getElementById('rejectedTitle');
    const rejectedMessage = document.getElementById('rejectedMessage');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fpsCounter = document.getElementById('fpsCounter');

    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const zoomValue = document.getElementById('zoomValue');
    const panModeBtn = document.getElementById('panModeBtn');

    if (userName) nameInput.value = userName;

    function updateTransform() {
      screenImage.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
      zoomValue.textContent = Math.round(zoom * 100) + '%';
      if (zoom > 1.0 || isPanModeActive) {
        viewportContainer.style.cursor = isDragging ? 'grabbing' : 'grab';
      } else {
        viewportContainer.style.cursor = 'default';
      }
    }

    function setZoom(newZoom, centerX, centerY) {
      const prevZoom = zoom;
      zoom = Math.max(0.5, Math.min(6.0, newZoom));

      if (zoom === 1.0) {
        panX = 0;
        panY = 0;
      } else if (centerX !== undefined && centerY !== undefined) {
        const factor = zoom / prevZoom;
        panX = centerX - factor * (centerX - panX);
        panY = centerY - factor * (centerY - panY);
      }
      updateTransform();
    }

    function resetZoom() {
      zoom = 1.0;
      panX = 0;
      panY = 0;
      updateTransform();
    }

    zoomInBtn.addEventListener('click', () => setZoom(zoom + 0.3));
    zoomOutBtn.addEventListener('click', () => setZoom(zoom - 0.3));
    resetZoomBtn.addEventListener('click', resetZoom);
    zoomValue.addEventListener('click', resetZoom);

    panModeBtn.addEventListener('click', () => {
      isPanModeActive = !isPanModeActive;
      panModeBtn.classList.toggle('active', isPanModeActive);
      updateTransform();
    });

    viewportContainer.addEventListener('mousedown', (e) => {
      if (zoom > 1.0 || isPanModeActive) {
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        updateTransform();
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        updateTransform();
      }
    });

    viewportContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = viewportContainer.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;
      const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom(zoom + zoomDelta, cursorX, cursorY);
    }, { passive: false });

    viewportContainer.addEventListener('dblclick', (e) => {
      if (zoom > 1.05) {
        resetZoom();
      } else {
        const rect = viewportContainer.getBoundingClientRect();
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;
        setZoom(2.0, cursorX, cursorY);
      }
    });

    viewportContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        if (zoom > 1.0 || isPanModeActive) {
          isDragging = true;
          startX = e.touches[0].clientX - panX;
          startY = e.touches[0].clientY - panY;
        }
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchZoom = zoom;
      }
    }, { passive: true });

    viewportContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2 && initialPinchDistance) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scaleFactor = currentDist / initialPinchDistance;
        setZoom(initialPinchZoom * scaleFactor);
      }
    }, { passive: true });

    viewportContainer.addEventListener('touchend', () => {
      isDragging = false;
      initialPinchDistance = null;
    });

    function showView(view) {
      joinView.style.display = view === 'join' ? 'block' : 'none';
      waitingView.style.display = view === 'waiting' ? 'block' : 'none';
      rejectedView.style.display = view === 'rejected' ? 'block' : 'none';
      viewportContainer.style.display = view === 'stream' ? 'flex' : 'none';
      screenImage.style.display = view === 'stream' ? 'block' : 'none';
      topZoomToolbar.style.display = view === 'stream' ? 'flex' : 'none';
      streamHud.style.display = view === 'stream' ? 'flex' : 'none';
    }

    function connectAndRequest(name) {
      userName = name;
      localStorage.setItem('screen_shared_name', name);
      submittedName.textContent = name;
      showView('waiting');
      headerStatus.textContent = 'Aguardando';

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = proto + '//' + window.location.host;

      if (ws) {
        try { ws.close(); } catch(e){}
      }

      ws = new WebSocket(wsUrl);
      ws.binaryType = 'blob';

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'REQUEST_ACCESS', name: userName }));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATUS_UPDATE') {
              if (msg.status === 'APPROVED') {
                showView('stream');
                headerStatus.textContent = 'Ao Vivo';
              } else if (msg.status === 'REJECTED') {
                rejectedTitle.textContent = 'Acesso Recusado';
                rejectedMessage.textContent = 'O anfitrião recusou seu pedido de participação.';
                showView('rejected');
                headerStatus.textContent = 'Recusado';
              } else if (msg.status === 'KICKED') {
                rejectedTitle.textContent = 'Desconectado';
                rejectedMessage.textContent = 'Você foi desconectado pelo anfitrião.';
                showView('rejected');
                headerStatus.textContent = 'Desconectado';
              }
            }
          } catch(e){}
        } else if (event.data instanceof Blob) {
          // Live frame received
          frameCount++;
          const now = Date.now();
          if (now - lastFpsUpdate >= 1000) {
            fpsCounter.textContent = frameCount + ' FPS';
            frameCount = 0;
            lastFpsUpdate = now;
          }

          if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
          }
          currentBlobUrl = URL.createObjectURL(event.data);
          screenImage.src = currentBlobUrl;
        }
      };

      ws.onclose = () => {
        if (headerStatus.textContent === 'Ao Vivo') {
          headerStatus.textContent = 'Desconectado';
          rejectedTitle.textContent = 'Sessão Encerrada';
          rejectedMessage.textContent = 'A conexão com o servidor foi encerrada.';
          showView('rejected');
        }
      };
    }

    requestBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      connectAndRequest(name);
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') requestBtn.click();
    });

    cancelWaitingBtn.addEventListener('click', () => {
      if (ws) ws.close();
      showView('join');
      headerStatus.textContent = 'Pronto';
    });

    retryBtn.addEventListener('click', () => {
      showView('join');
      headerStatus.textContent = 'Pronto';
    });

    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(()=>{});
        fullscreenBtn.textContent = 'Sair da Tela Cheia';
      } else {
        document.exitFullscreen().catch(()=>{});
        fullscreenBtn.textContent = 'Tela Cheia';
      }
    });
  <\/script>
</body>
</html>`;
  }
}
let serverInstance = null;
function getWebStreamServer() {
  if (!serverInstance) {
    serverInstance = new WebStreamServer();
  }
  return serverInstance;
}
app.commandLine.appendSwitch("enable-features", "WebRtcAllowWgcScreenCapturer,WebRtcAllowWgcWindowCapturer");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("log-level", "3");
let activeAnnotations = [];
let currentSourceId = null;
process.on("uncaughtException", (err) => {
  logger.error("Exceção não tratada no Main Process:", err);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Promessa rejeitada não tratada no Main Process:", reason);
});
function setupIPC() {
  ipcMain.handle(IPC_CHANNELS.GET_SOURCES, async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });
      logger.info(`Capturadas ${sources.length} fontes de vídeo (${sources.filter((s) => s.id.startsWith("screen:")).length} telas, ${sources.filter((s) => !s.id.startsWith("screen:")).length} janelas)`);
      return sources.map((src) => ({
        id: src.id,
        name: src.name,
        thumbnail: src.thumbnail.toDataURL(),
        displayId: src.display_id,
        isScreen: src.id.startsWith("screen:")
      }));
    } catch (error) {
      logger.error("Erro ao capturar fontes de vídeo:", error);
      return [];
    }
  });
  ipcMain.handle(IPC_CHANNELS.GET_DISPLAYS, async () => {
    try {
      const displays = screen.getAllDisplays();
      const primaryId = screen.getPrimaryDisplay().id;
      logger.info(`Detectados ${displays.length} monitor(es) físicos`);
      return displays.map((d, index) => ({
        id: d.id,
        name: `Monitor ${index + 1}${d.id === primaryId ? " (Principal)" : ""} - ${d.bounds.width}x${d.bounds.height}`,
        bounds: d.bounds,
        isPrimary: d.id === primaryId,
        scaleFactor: d.scaleFactor
      }));
    } catch (err) {
      logger.error("Erro ao listar monitores físicos:", err);
      return [];
    }
  });
  ipcMain.on(IPC_CHANNELS.SELECT_SOURCE, (_event, sourceId) => {
    currentSourceId = sourceId;
    logger.info(`Fonte de vídeo selecionada: ${sourceId}`);
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.SET_SOURCE, sourceId);
    }
  });
  ipcMain.on(IPC_CHANNELS.START_SNIPER, (_event, transparency) => {
    const t = typeof transparency === "number" && !isNaN(transparency) ? transparency : 70;
    logger.info(`Modo Sniper iniciado pelo usuário em todos os monitores (Transparência: ${t}%)`);
    showSniperWindows(void 0, t);
  });
  ipcMain.on("set-sniper-transparency", (_event, transparency) => {
    if (typeof transparency === "number" && !isNaN(transparency)) {
      setSniperTransparency(transparency);
    }
  });
  ipcMain.on(IPC_CHANNELS.REGION_SELECTED, (_event, region) => {
    hideSniperWindows();
    logger.info(`Região de recorte aplicada: ${region.width}x${region.height} em (${region.x}, ${region.y}) displayId=${region.displayId}`);
    if (region.displayId !== void 0) {
      const displays = screen.getAllDisplays();
      const displayIndex = displays.findIndex((d) => d.id === region.displayId);
      if (displayIndex !== -1) {
        const expectedSourceId = `screen:${displayIndex}:0`;
        if (currentSourceId !== expectedSourceId) {
          currentSourceId = expectedSourceId;
          logger.info(`Alternando automaticamente fonte de captura para ${expectedSourceId} (Monitor ${displayIndex + 1})`);
          const viewer2 = getViewerWindow();
          if (viewer2 && !viewer2.isDestroyed()) {
            viewer2.webContents.send(IPC_CHANNELS.SET_SOURCE, expectedSourceId);
          }
          const control2 = getControlWindow();
          if (control2 && !control2.isDestroyed()) {
            control2.webContents.send("source-auto-selected", expectedSourceId);
          }
        }
      }
    }
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.APPLY_CROP, region);
    }
    const control = getControlWindow();
    if (control && !control.isDestroyed()) {
      control.webContents.send(IPC_CHANNELS.CROP_UPDATED, region);
    }
  });
  ipcMain.on(IPC_CHANNELS.CANCEL_SNIPER, () => {
    logger.info("Modo Sniper cancelado");
    hideSniperWindows();
  });
  ipcMain.on(IPC_CHANNELS.RESET_CROP, () => {
    logger.info("Recorte resetado para tela inteira");
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.APPLY_CROP, null);
    }
    const control = getControlWindow();
    if (control && !control.isDestroyed()) {
      control.webContents.send(IPC_CHANNELS.CROP_UPDATED, null);
    }
  });
  ipcMain.on(IPC_CHANNELS.SEND_ANNOTATION, (_event, annotation) => {
    activeAnnotations.push(annotation);
    logger.debug(`Nova anotação adicionada: ${annotation.tool} (total: ${activeAnnotations.length})`);
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.NEW_ANNOTATION, annotation);
    }
  });
  ipcMain.on(IPC_CHANNELS.CLEAR_ANNOTATIONS, () => {
    activeAnnotations = [];
    logger.info("Anotações limpas");
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.CLEAR_ANNOTATIONS);
    }
  });
  ipcMain.on(IPC_CHANNELS.UNDO_ANNOTATION, () => {
    if (activeAnnotations.length > 0) {
      activeAnnotations.pop();
      logger.info(`Anotação desfeita (restantes: ${activeAnnotations.length})`);
      const viewer = getViewerWindow();
      if (viewer && !viewer.isDestroyed()) {
        viewer.webContents.send(IPC_CHANNELS.SYNC_ANNOTATIONS, activeAnnotations);
      }
    }
  });
  ipcMain.on(IPC_CHANNELS.SET_ACTIVE_TOOL, (event, settings) => {
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed() && viewer.webContents !== event.sender) {
      viewer.webContents.send(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, settings);
    }
    const control = getControlWindow();
    if (control && !control.isDestroyed() && control.webContents !== event.sender) {
      control.webContents.send(IPC_CHANNELS.ACTIVE_TOOL_CHANGED, settings);
    }
  });
  ipcMain.on(IPC_CHANNELS.MOVE_VIEWER_TO_DISPLAY, (_event, displayId, fullscreen = false) => {
    logger.info(`Movendo janela do Visualizador para monitor ${displayId} (fullscreen=${fullscreen})`);
    moveToDisplay(displayId, fullscreen);
  });
  ipcMain.on(IPC_CHANNELS.TOGGLE_VIEWER_FULLSCREEN, () => {
    logger.info("Alternando tela cheia da janela do Visualizador");
    toggleViewerFullscreen();
  });
  ipcMain.on(IPC_CHANNELS.SET_VIEWER_SETTINGS, (_event, settings) => {
    const viewer = getViewerWindow();
    if (viewer && !viewer.isDestroyed()) {
      viewer.webContents.send(IPC_CHANNELS.UPDATE_VIEWER_SETTINGS, settings);
    }
  });
  ipcMain.on(IPC_CHANNELS.LOG_MESSAGE, (_event, level, msg, meta) => {
    logger.log(level, `[Renderer] ${msg}`, meta);
  });
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, (_event, limit) => {
    return logger.getLogs(limit);
  });
  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, () => {
    logger.clearLogs();
    return true;
  });
  ipcMain.on(IPC_CHANNELS.OPEN_LOG_FILE, () => {
    shell.openPath(logger.getLogPath());
  });
  const webServer = getWebStreamServer();
  webServer.setOnViewersChanged((viewers) => {
    const control = getControlWindow();
    if (control && !control.isDestroyed()) {
      control.webContents.send(IPC_CHANNELS.WEB_VIEWERS_UPDATED, viewers);
    }
  });
  ipcMain.handle(IPC_CHANNELS.GET_WEB_STREAM_STATUS, () => {
    return webServer.getStatus();
  });
  ipcMain.on(IPC_CHANNELS.APPROVE_WEB_VIEWER, (_event, id) => {
    webServer.approveViewer(id);
  });
  ipcMain.on(IPC_CHANNELS.REJECT_WEB_VIEWER, (_event, id) => {
    webServer.rejectViewer(id);
  });
  ipcMain.on(IPC_CHANNELS.KICK_WEB_VIEWER, (_event, id) => {
    webServer.kickViewer(id);
  });
  ipcMain.on(IPC_CHANNELS.BROADCAST_WEB_FRAME, (_event, frameData) => {
    if (frameData && webServer.hasApprovedViewers()) {
      webServer.broadcastFrame(Buffer.from(frameData));
    }
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized() ?? false;
  });
}
const isDev = is.dev || Boolean(process.env["ELECTRON_RENDERER_URL"]);
const gotTheLock = isDev ? true : app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  if (!isDev) {
    app.on("second-instance", () => {
      const control = getControlWindow();
      if (control) {
        if (control.isMinimized()) control.restore();
        control.focus();
      }
    });
  }
  app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.professorscreenshare.app");
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
    setupIPC();
    const webServer = getWebStreamServer();
    webServer.start(3e3).catch((err) => {
      logger.error("Falha ao iniciar servidor web stream:", err);
    });
    createControlWindow();
    createSniperWindows();
    createViewerWindow();
    app.on("activate", function() {
      if (BrowserWindow.getAllWindows().length === 0) {
        createControlWindow();
        createSniperWindows();
        createViewerWindow();
      }
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
