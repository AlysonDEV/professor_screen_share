import http from 'http'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { WebSocketServer, WebSocket } from 'ws'
import type { WebViewerInfo, WebStreamStatus } from '../../shared/types'
import { logger } from '../utils/logger'

function getIconBuffer(): Buffer | null {
  const candidates = [
    path.join(__dirname, '../../resources/icon.png'),
    path.join(process.cwd(), 'resources/icon.png'),
    path.join(__dirname, '../resources/icon.png'),
    path.join(__dirname, '../../src/renderer/src/assets/icon.png')
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate)
      } catch {
        // Continue
      }
    }
  }
  return null
}

interface WebSession {
  id: string
  ws: WebSocket
  name: string
  ip: string
  status: 'WAITING' | 'APPROVED' | 'REJECTED'
  joinedAt: number
}

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('127.')) {
        return net.address
      }
    }
  }
  return 'localhost'
}

export class WebStreamServer {
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private sessions: Map<string, WebSession> = new Map()
  private port = 3000
  private ip: string = 'localhost'
  private isRunning = false
  private onViewersChangedCallback?: (viewers: WebViewerInfo[]) => void

  constructor(onViewersChanged?: (viewers: WebViewerInfo[]) => void) {
    this.onViewersChangedCallback = onViewersChanged
    this.ip = getLocalIpAddress()
  }

  public setOnViewersChanged(callback: (viewers: WebViewerInfo[]) => void): void {
    this.onViewersChangedCallback = callback
  }

  public start(preferredPort = 3000): Promise<WebStreamStatus> {
    return new Promise((resolve) => {
      this.port = preferredPort
      this.ip = getLocalIpAddress()

      const tryListen = (currentPort: number): void => {
        const srv = http.createServer((req, res) => {
          const url = req.url || '/'

          if (url.startsWith('/screen_shared')) {
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            })
            res.end(this.getViewerHtml())
            return
          }

          if (url === '/icon.png' || url === '/favicon.ico') {
            const iconBuf = getIconBuffer()
            if (iconBuf) {
              res.writeHead(200, {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=86400'
              })
              res.end(iconBuf)
              return
            }
          }

          if (url === '/' || url === '') {
            res.writeHead(302, { Location: '/screen_shared' })
            res.end()
            return
          }

          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('Página não encontrada. Acesse /screen_shared')
        })

        srv.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            logger.warn(`Porta ${currentPort} já em uso. Tentando porta ${currentPort + 1}...`)
            tryListen(currentPort + 1)
          } else {
            logger.error(`Erro ao iniciar servidor HTTP: ${err.message}`)
            this.isRunning = false
            resolve(this.getStatus())
          }
        })

        srv.listen(currentPort, '0.0.0.0', () => {
          this.port = currentPort
          this.server = srv
          this.isRunning = true
          logger.info(`Servidor Screen Shared ativo em http://${this.ip}:${this.port}/screen_shared`)

          this.setupWebSocketServer(srv)
          resolve(this.getStatus())
        })
      }

      tryListen(this.port)
    })
  }

  private setupWebSocketServer(httpServer: http.Server): void {
    this.wss = new WebSocketServer({ server: httpServer })

    this.wss.on('connection', (ws: WebSocket, req) => {
      const rawIp = req.socket.remoteAddress || 'Desconhecido'
      const clientIp = rawIp.replace(/^::ffff:/, '')
      const sessionId = `ws_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`

      ws.on('message', (data, isBinary) => {
        if (isBinary) return

        try {
          const message = JSON.parse(data.toString())

          if (message.type === 'REQUEST_ACCESS') {
            const name = (message.name || 'Convidado').trim().substring(0, 32)
            const session: WebSession = {
              id: sessionId,
              ws,
              name: name || 'Convidado',
              ip: clientIp,
              status: 'WAITING',
              joinedAt: Date.now()
            }

            this.sessions.set(sessionId, session)
            logger.info(`Solicitação de acesso web recebida: "${session.name}" de ${session.ip}`)

            ws.send(JSON.stringify({ type: 'STATUS_UPDATE', status: 'WAITING', id: sessionId }))
            this.notifyViewersChanged()
          }
        } catch (err) {
          logger.warn(`Mensagem inválida recebida do cliente web ${clientIp}:`, err)
        }
      })

      ws.on('close', () => {
        if (this.sessions.has(sessionId)) {
          const s = this.sessions.get(sessionId)
          logger.info(`Cliente web desconectou: "${s?.name}" (${s?.ip})`)
          this.sessions.delete(sessionId)
          this.notifyViewersChanged()
        }
      })

      ws.on('error', (err) => {
        logger.warn(`Erro no socket do cliente web (${clientIp}):`, err.message)
      })
    })
  }

  public approveViewer(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.status = 'APPROVED'
    logger.info(`Usuário web aprovado pelo host: "${session.name}" (${session.ip})`)

    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'STATUS_UPDATE', status: 'APPROVED' }))
    }

    this.notifyViewersChanged()
    return true
  }

  public rejectViewer(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.status = 'REJECTED'
    logger.info(`Usuário web recusado pelo host: "${session.name}" (${session.ip})`)

    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'STATUS_UPDATE', status: 'REJECTED' }))
      setTimeout(() => {
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.close()
        }
      }, 500)
    }

    this.sessions.delete(sessionId)
    this.notifyViewersChanged()
    return true
  }

  public kickViewer(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    logger.info(`Usuário web desconectado pelo host: "${session.name}" (${session.ip})`)

    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: 'STATUS_UPDATE', status: 'KICKED' }))
      setTimeout(() => {
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.close()
        }
      }, 300)
    }

    this.sessions.delete(sessionId)
    this.notifyViewersChanged()
    return true
  }

  public broadcastFrame(frameBuffer: Buffer | ArrayBuffer): void {
    if (!this.wss || this.sessions.size === 0) return

    for (const session of this.sessions.values()) {
      if (session.status === 'APPROVED' && session.ws.readyState === WebSocket.OPEN) {
        // Drop frame if client has more than 1MB buffered to avoid latency buildup
        if (session.ws.bufferedAmount < 1024 * 1024) {
          session.ws.send(frameBuffer, { binary: true })
        }
      }
    }
  }

  public hasApprovedViewers(): boolean {
    for (const session of this.sessions.values()) {
      if (session.status === 'APPROVED' && session.ws.readyState === WebSocket.OPEN) {
        return true
      }
    }
    return false
  }

  public getViewersList(): WebViewerInfo[] {
    const list: WebViewerInfo[] = []
    for (const s of this.sessions.values()) {
      list.push({
        id: s.id,
        name: s.name,
        ip: s.ip,
        status: s.status,
        joinedAt: s.joinedAt
      })
    }
    return list.sort((a, b) => b.joinedAt - a.joinedAt)
  }

  public getStatus(): WebStreamStatus {
    return {
      url: `http://${this.ip}:${this.port}/screen_shared`,
      port: this.port,
      ip: this.ip,
      isRunning: this.isRunning,
      viewers: this.getViewersList()
    }
  }

  public stop(): void {
    if (this.wss) {
      for (const session of this.sessions.values()) {
        try {
          session.ws.close()
        } catch {
          // Ignore
        }
      }
      this.sessions.clear()
      this.wss.close()
      this.wss = null
    }

    if (this.server) {
      this.server.close()
      this.server = null
    }

    this.isRunning = false
    this.notifyViewersChanged()
  }

  private notifyViewersChanged(): void {
    if (this.onViewersChangedCallback) {
      this.onViewersChangedCallback(this.getViewersList())
    }
  }

  private getViewerHtml(): string {
    const iconBuf = getIconBuffer()
    const iconDataUri = iconBuf
      ? `data:image/png;base64,${iconBuf.toString('base64')}`
      : '/icon.png'

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
  </script>
</body>
</html>`
  }
}

let serverInstance: WebStreamServer | null = null

export function getWebStreamServer(): WebStreamServer {
  if (!serverInstance) {
    serverInstance = new WebStreamServer()
  }
  return serverInstance
}
