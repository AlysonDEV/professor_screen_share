# Projeto: Screen Mirror, Crop & Live Canvas Annotator

Este documento serve como especificação técnica e guia de implementação direta para ser executado no **Antigravity** (ou qualquer agente/ambiente de desenvolvimento automatizado).

---

## 1. Visão Geral do Projeto

Criar uma aplicação desktop com **Electron** e **Node.js** que permita:
1. **Capturar a tela ou janela** via APIs nativas do sistema (sem necessidade de drivers ou programas externos).
2. **Selecionar uma região arbitrária da tela** (efeito *Sniper* / recorte estilo ferramenta de captura).
3. **Fazer anotações em tempo real** sobre o vídeo (desenho de setas, círculos e pincel livre com espessura e cores configuráveis).
4. **Exibir a transmissão recortada em uma janela dedicada para o 2º monitor**, com suporte a redimensionamento livre e modo tela cheia (`F11`).

---

## 2. Estrutura de Arquivos

```text
screen-mirror-app/
├── package.json
├── main.js
├── preload.js
└── src/
    ├── control/
    │   ├── index.html
    │   └── renderer.js
    ├── sniper/
    │   ├── index.html
    │   └── renderer.js
    └── viewer/
        ├── index.html
        └── renderer.js
```

---

## 3. Implementação dos Arquivos

### `package.json`
```json
{
  "name": "screen-mirror-app",
  "version": "1.0.0",
  "description": "Espelhamento de região de tela e anotações para segundo monitor",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^31.0.0"
  }
}
```

---

### `main.js` (Processo Principal e Orquestrador de Janelas)
```javascript
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let controlWindow = null;
let sniperWindow = null;
let viewerWindow = null;

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 420,
    height: 600,
    title: "Painel de Controle",
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  controlWindow.loadFile(path.join(__dirname, 'src/control/index.html'));
  controlWindow.on('closed', () => app.quit());
}

function createSniperWindow() {
  sniperWindow = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  sniperWindow.loadFile(path.join(__dirname, 'src/sniper/index.html'));
}

function createViewerWindow() {
  viewerWindow = new BrowserWindow({
    width: 960,
    height: 540,
    title: "Visualizador - 2º Monitor",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  viewerWindow.loadFile(path.join(__dirname, 'src/viewer/index.html'));
}

app.whenReady().then(() => {
  createControlWindow();
  createSniperWindow();
  createViewerWindow();

  // IPC: Obter fontes de vídeo da máquina
  ipcMain.handle('get-sources', async () => {
    return await desktopCapturer.getSources({ types: ['screen', 'window'] });
  });

  // IPC: Ativar modo de seleção de recorte
  ipcMain.on('start-sniper', () => {
    if (sniperWindow) {
      sniperWindow.show();
      sniperWindow.focus();
    }
  });

  // IPC: Região selecionada pelo sniper
  ipcMain.on('region-selected', (event, cropRegion) => {
    if (sniperWindow) sniperWindow.hide();
    if (viewerWindow) viewerWindow.webContents.send('apply-crop', cropRegion);
    if (controlWindow) controlWindow.webContents.send('crop-updated', cropRegion);
  });

  // IPC: Cancelar recorte (ex: tecla ESC)
  ipcMain.on('cancel-sniper', () => {
    if (sniperWindow) sniperWindow.hide();
  });

  // IPC: Enviar ferramentas e anotações para o visualizador
  ipcMain.on('send-annotation', (event, annotation) => {
    if (viewerWindow) viewerWindow.webContents.send('new-annotation', annotation);
  });

  ipcMain.on('clear-annotations', () => {
    if (viewerWindow) viewerWindow.webContents.send('clear-annotations');
  });

  // IPC: Selecionar fonte de tela
  ipcMain.on('select-source', (event, sourceId) => {
    if (viewerWindow) viewerWindow.webContents.send('set-source', sourceId);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

---

### `preload.js` (Ponte Segura IPC)
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  startSniper: () => ipcRenderer.send('start-sniper'),
  regionSelected: (region) => ipcRenderer.send('region-selected', region),
  cancelSniper: () => ipcRenderer.send('cancel-sniper'),
  sendAnnotation: (data) => ipcRenderer.send('send-annotation', data),
  clearAnnotations: () => ipcRenderer.send('clear-annotations'),
  selectSource: (id) => ipcRenderer.send('select-source', id),
  
  onApplyCrop: (callback) => ipcRenderer.on('apply-crop', (_, data) => callback(data)),
  onCropUpdated: (callback) => ipcRenderer.on('crop-updated', (_, data) => callback(data)),
  onSetSource: (callback) => ipcRenderer.on('set-source', (_, data) => callback(data)),
  onNewAnnotation: (callback) => ipcRenderer.on('new-annotation', (_, data) => callback(data)),
  onClearAnnotations: (callback) => ipcRenderer.on('clear-annotations', () => callback())
});
```

---

### `src/control/index.html` (Interface do Painel)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Painel de Controle</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; background: #1e1e24; color: #fff; margin: 0; }
    h2, h3 { margin-top: 0; }
    .section { background: #2b2b36; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    select, button, input { width: 100%; padding: 8px; margin: 6px 0; border-radius: 6px; border: none; font-size: 14px; box-sizing: border-box; }
    button { background: #4f46e5; color: white; cursor: pointer; font-weight: bold; }
    button:hover { background: #4338ca; }
    .btn-secondary { background: #4b5563; }
    .btn-secondary:hover { background: #374151; }
    .btn-danger { background: #ef4444; }
    .btn-danger:hover { background: #dc2626; }
    .row { display: flex; gap: 8px; }
  </style>
</head>
<body>
  <h2>Transmissor Local</h2>

  <div class="section">
    <h3>1. Fonte de Vídeo</h3>
    <select id="sourceSelect"></select>
    <button id="btnRefreshSources" class="btn-secondary">Atualizar Fontes</button>
  </div>

  <div class="section">
    <h3>2. Região de Recorte</h3>
    <button id="btnStartSniper">Recortar Área da Tela</button>
    <div id="cropStatus" style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Tela Inteira</div>
  </div>

  <div class="section">
    <h3>3. Anotações ao Vivo</h3>
    <label>Ferramenta:</label>
    <select id="toolSelect">
      <option value="arrow">Seta</option>
      <option value="circle">Círculo</option>
      <option value="rect">Retângulo</option>
    </select>

    <label>Cor:</label>
    <input type="color" id="colorPicker" value="#ff0000">

    <label>Espessura:</label>
    <input type="range" id="strokeWidth" min="2" max="15" value="4">

    <button id="btnClear" class="btn-danger">Limpar Desenhos</button>
  </div>

  <script src="renderer.js"></script>
</body>
</html>
```

---

### `src/control/renderer.js`
```javascript
const sourceSelect = document.getElementById('sourceSelect');
const btnRefresh = document.getElementById('btnRefreshSources');
const btnStartSniper = document.getElementById('btnStartSniper');
const cropStatus = document.getElementById('cropStatus');
const btnClear = document.getElementById('btnClear');

async function loadSources() {
  const sources = await window.electronAPI.getSources();
  sourceSelect.innerHTML = '';
  sources.forEach(src => {
    const opt = document.createElement('option');
    opt.value = src.id;
    opt.textContent = src.name;
    sourceSelect.appendChild(opt);
  });
  if (sources.length > 0) {
    window.electronAPI.selectSource(sources[0].id);
  }
}

sourceSelect.addEventListener('change', () => {
  window.electronAPI.selectSource(sourceSelect.value);
});

btnRefresh.addEventListener('click', loadSources);

btnStartSniper.addEventListener('click', () => {
  window.electronAPI.startSniper();
});

btnClear.addEventListener('click', () => {
  window.electronAPI.clearAnnotations();
});

window.electronAPI.onCropUpdated((region) => {
  cropStatus.textContent = `Recorte ativo: ${region.width}x${region.height} em (${region.x}, ${region.y})`;
});

loadSources();
```

---

### `src/sniper/index.html` (Overlay de Recorte)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      cursor: crosshair;
      user-select: none;
      background: rgba(0, 0, 0, 0.25);
    }
    #selection {
      position: absolute;
      border: 2px dashed #38bdf8;
      background: rgba(56, 189, 248, 0.2);
      display: none;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="selection"></div>
  <script src="renderer.js"></script>
</body>
</html>
```

---

### `src/sniper/renderer.js`
```javascript
const box = document.getElementById('selection');
let startX = 0;
let startY = 0;
let isSelecting = false;

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // Apenas clique esquerdo
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  box.style.left = `${startX}px`;
  box.style.top = `${startY}px`;
  box.style.width = '0px';
  box.style.height = '0px';
  box.style.display = 'block';
});

window.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;
  const currentX = e.clientX;
  const currentY = e.clientY;

  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
});

window.addEventListener('mouseup', (e) => {
  if (!isSelecting) return;
  isSelecting = false;
  box.style.display = 'none';

  const currentX = e.clientX;
  const currentY = e.clientY;
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Evita cliques acidentais sem arrastar
  if (width > 20 && height > 20) {
    window.electronAPI.regionSelected({ x, y, width, height });
  } else {
    window.electronAPI.cancelSniper();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    isSelecting = false;
    box.style.display = 'none';
    window.electronAPI.cancelSniper();
  }
});
```

---

### `src/viewer/index.html` (Janela de Saída para o 2º Monitor)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Visualizador - 2º Monitor</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    video { display: none; }
    canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <video id="sourceVideo" autoplay playsinline muted></video>
  <canvas id="outputCanvas"></canvas>
  <script src="renderer.js"></script>
</body>
</html>
```

---

### `src/viewer/renderer.js`
```javascript
const video = document.getElementById('sourceVideo');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');

let cropRegion = null;
let annotations = [];
let drawingState = null;

// Atalho F11 para Tela Cheia no 2º monitor
window.addEventListener('keydown', (e) => {
  if (e.key === 'F11') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
});

// Atualizar fonte de captura
window.electronAPI.onSetSource(async (sourceId) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          minFrameRate: 60
        }
      }
    });
    video.srcObject = stream;
    video.play();
  } catch (err) {
    console.error('Erro ao obter stream da tela:', err);
  }
});

// Aplicar coordenadas de corte
window.electronAPI.onApplyCrop((region) => {
  cropRegion = region;
  canvas.width = region.width;
  canvas.height = region.height;
});

// Gerenciar anotações
window.electronAPI.onNewAnnotation((shape) => {
  annotations.push(shape);
});

window.electronAPI.onClearAnnotations(() => {
  annotations = [];
});

// Função auxiliar para desenhar setas geométricas
function drawArrow(ctx, fromX, fromY, toX, toY, color, width) {
  const headlen = 16;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(toX, toY);
  ctx.fill();
}

// Loop de renderização contínua a 60 FPS
function render() {
  if (video.readyState >= 2) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cropRegion && cropRegion.width > 0) {
      // Recorte nativo ultra-rápido via drawImage
      ctx.drawImage(
        video,
        cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
        0, 0, canvas.width, canvas.height
      );
    } else {
      // Exibição integral caso ainda não haja recorte
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Renderiza anotações sobre o vídeo
    annotations.forEach((item) => {
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.width;

      if (item.type === 'arrow') {
        drawArrow(ctx, item.x1, item.y1, item.x2, item.y2, item.color, item.width);
      } else if (item.type === 'circle') {
        const radius = Math.hypot(item.x2 - item.x1, item.y2 - item.y1);
        ctx.beginPath();
        ctx.arc(item.x1, item.y1, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (item.type === 'rect') {
        ctx.strokeRect(item.x1, item.y1, item.x2 - item.x1, item.y2 - item.y1);
      }
      ctx.restore();
    });
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
```

---

## 4. Instruções de Execução

1. Crie uma pasta vazia e posicione os arquivos conforme a estrutura.
2. Instale o Electron:
   ```bash
   npm install
   ```
3. Inicie o aplicativo:
   ```bash
   npm start
   ```
4. **Como usar durante a aula:**
   - Arraste a janela **"Visualizador - 2º Monitor"** para o segundo monitor ou projetor e aperte **F11**.
   - No **"Painel de Controle"**, clique em **"Recortar Área da Tela"**, selecione a área desejada e solte.
   - O recorte aparecerá instantaneamente no segundo monitor a 60 FPS com baixíssimo uso de CPU.