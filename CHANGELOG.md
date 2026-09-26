# 📋 Registro de Alterações (Changelog)

Todas as alterações notáveis no projeto **Professor Screen Share** serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.2] - 2026-09-26

### ✨ Adicionado
- **Tela de Sobre (About Modal)**:
  - Identificação completa do desenvolvedor principal (**AlysonDEV**) e organização (**Aincrad Development**).
  - Exibição destacada do repositório oficial no GitHub (`https://github.com/AlysonDEV/professor_screen_share`).
  - Botão de acesso direto com abertura segura no navegador padrão via `shell.openExternal`.
  - Botão para cópia rápida da URL do repositório com confirmação visual (*"Copiado!"*).
  - Informações técnicas da versão, tecnologias utilizadas e declaração de licença.
- **Tela Inicial estilo Splash Screen**:
  - Transição elegante de inicialização com logotipo da lousa e efeito de brilho pulsante (*ambient pulse*).
  - Barra de progresso linear em gradiente sincronizada com as etapas de carregamento do sistema.
  - Indicadores dinâmicos de status (módulos, monitores, servidor local e ambiente de anotações).
  - Suave esmaecimento (*fade-out*) ao concluir o carregamento dos recursos necessários.
- **Controles de Navegação e Ajuda**:
  - Botão de atalho para a tela de Sobre na barra de título (`Header`).
  - Botão dedicado de acesso ao Sobre no rodapé da janela de controle.
  - Canal IPC seguro `open-external` para acionamento de links da internet sem exposição indevida do processo de renderização.
- **Testes Unitários Automatizados**:
  - Testes cobrindo renderização, botões de ação e eventos de abertura do `AboutModal`.
  - Teste de disparo do evento `onOpenAbout` no componente `Header`.

### 🔄 Modificado
- Versão do projeto atualizada de `1.0.1` para `1.0.2` em todos os locais:
  - `package.json`
  - `package-lock.json`
  - `electron-builder.yml`
  - Componente `AboutModal.tsx`
  - Componente `SplashScreen.tsx`
  - Documentação `README.md`

---

## [1.0.1] - 2026-09-26

### ✨ Adicionado
- **Identidade Visual Oficial (Lousa com Caneta Digital)**:
  - Ícone de alta resolução com estética de lousa inteligente (*smartboard*), esquemas matemáticos e caneta digital com traço luminoso em neon infinito.
  - Geração de pacote multi-resolução `icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16) em `build/icon.ico` e `resources/icon.ico`.
  - Ícone aplicado na barra de tarefas do Windows, nas janelas nativas do Electron e no cabeçalho do aplicativo.
- **Configuração Oficial do Instalador Windows (`electron-builder.yml`)**:
  - Suporte completo ao instalador NSIS (`.exe`) com criação garantida de atalhos na Área de Trabalho e Menu Iniciar.
  - Vinculação do ícone da lousa ao executável, ao instalador e ao desinstalador.
  - Scripts no `package.json`: `npm run dist:win` e `npm run build:win`.
- **Favicon e Imagem no Servidor Web (`/screen_shared`)**:
  - O ícone da aplicação agora é transmitido para outros computadores e celulares conectados, aparecendo no cabeçalho e na aba do navegador.
  - Rotas automáticas para entrega de `/icon.png` e `/favicon.ico`.

### 🔄 Modificado
- **Nome Oficial do Software**:
  - Renomeado de *screen-mirror-app* para **Professor Screen Share** para melhor adequação e sonoridade natural.
  - Identificador de aplicação atualizado para `com.professorscreenshare.app`.

### 🐛 Corrigido
- **Ícone Padrão do Electron na Instalação**:
  - Corrigido o problema em que o atalho da Área de Trabalho exibia o ícone genérico do átomo do Electron após a instalação.
- **Git Ignore**:
  - Configuração do `.gitignore` para ignorar a pasta `dist/`, executáveis pesados `.exe` e o diretório `win-unpacked`.

---

## [1.0.0] - 2026-09-25

### ✨ Adicionado
- **Lançamento Inicial**:
  - Captura de tela inteira e janelas individuais a 60 FPS com aceleração por hardware (WGC).
  - Modo Sniper com seleção de área retangular arbitrária e regulagem de transparência (10% a 95%).
  - Barra de anotações interativa com seta, retângulo, círculo, caneta livre, marca-texto e texto.
  - Janela de visualização dedicada para o segundo monitor ou projetor com suporte a tela cheia (`F11`).
  - Servidor web local HTTP e WebSocket embutido para acompanhamento de alunos na rede local com sala de espera e aprovação manual.
  - Barra de título customizada com controles integrados de minimizar, maximizar e fechar sem emendas visuais.
  - Encerramento total e imediato de todas as instâncias em segundo plano ao fechar a janela do Menu.
