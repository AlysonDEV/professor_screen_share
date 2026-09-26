import { spawn } from 'node:child_process'
import readline from 'node:readline'

// Spawn electron-vite dev with piped stdio to filter internal WebRTC Windows noise
const isWindows = process.platform === 'win32'
const cmd = isWindows ? 'npx.cmd' : 'npx'
const args = ['electron-vite', 'dev', ...process.argv.slice(2)]

const child = spawn(cmd, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: {
    ...process.env,
    FORCE_COLOR: '1'
  }
})

// Pipe stdout directly
child.stdout.pipe(process.stdout)

// Filter repetitive WebRTC desktop/cursor capture noise from stderr
const rl = readline.createInterface({
  input: child.stderr,
  terminal: false
})

rl.on('line', (line) => {
  // Filter out low-level Chromium WebRTC cursor monitor / desktop assignment / WGC frame repetition noise
  if (
    line.includes('mouse_cursor_monitor_win.cc') ||
    line.includes('desktop.cc') ||
    line.includes('wgc_capture_session.cc') ||
    line.includes('ProcessFrame failed') ||
    line.includes('Unable to get cursor info') ||
    line.includes('Failed to assign the desktop to the current thread')
  ) {
    return
  }
  process.stderr.write(line + '\n')
})

child.on('close', (code) => {
  process.exit(code ?? 0)
})

process.on('SIGINT', () => {
  child.kill('SIGINT')
})
process.on('SIGTERM', () => {
  child.kill('SIGTERM')
})
