import { app } from 'electron'
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

class AppLogger {
  private logDir: string
  private logFilePath: string
  private maxFileSize = 5 * 1024 * 1024 // 5 MB

  constructor() {
    // Save logs in project root /logs folder (or app data in production)
    const baseDir = app?.isPackaged ? app.getPath('userData') : process.cwd()
    this.logDir = join(baseDir, 'logs')
    this.logFilePath = join(this.logDir, 'app.log')

    this.ensureLogDir()
  }

  private ensureLogDir(): void {
    try {
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true })
      }
    } catch (err) {
      console.error('Falha ao criar diretório de logs:', err)
    }
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString()
    let metaStr = ''
    if (meta !== undefined) {
      if (meta instanceof Error) {
        metaStr = `\nStack: ${meta.stack || meta.message}`
      } else if (typeof meta === 'object') {
        try {
          metaStr = ` | Meta: ${JSON.stringify(meta)}`
        } catch {
          metaStr = ` | Meta: [Unserializable Object]`
        }
      } else {
        metaStr = ` | ${String(meta)}`
      }
    }

    return `[${timestamp}] [${level}] ${message}${metaStr}\n`
  }

  private checkRotation(): void {
    try {
      if (existsSync(this.logFilePath)) {
        const stats = statSync(this.logFilePath)
        if (stats.size > this.maxFileSize) {
          // Keep last 1000 lines
          const content = readFileSync(this.logFilePath, 'utf-8')
          const lines = content.split('\n')
          const trimmed = lines.slice(-500).join('\n')
          writeFileSync(this.logFilePath, trimmed, 'utf-8')
        }
      }
    } catch {
      // Ignore rotation errors
    }
  }

  public log(level: LogLevel, message: string, meta?: unknown): void {
    const formatted = this.formatMessage(level, message, meta)
    this.checkRotation()

    try {
      appendFileSync(this.logFilePath, formatted, 'utf-8')
    } catch (err) {
      console.error('Falha ao escrever no arquivo de log:', err)
    }

    // Also output to dev console
    if (level === 'ERROR') {
      console.error(`[${level}] ${message}`, meta || '')
    } else if (level === 'WARN') {
      console.warn(`[${level}] ${message}`, meta || '')
    } else {
      console.log(`[${level}] ${message}`, meta || '')
    }
  }

  public info(message: string, meta?: unknown): void {
    this.log('INFO', message, meta)
  }

  public warn(message: string, meta?: unknown): void {
    this.log('WARN', message, meta)
  }

  public error(message: string, meta?: unknown): void {
    this.log('ERROR', message, meta)
  }

  public debug(message: string, meta?: unknown): void {
    this.log('DEBUG', message, meta)
  }

  public getLogs(limit = 200): string[] {
    try {
      if (existsSync(this.logFilePath)) {
        const content = readFileSync(this.logFilePath, 'utf-8')
        const lines = content.split('\n').filter((l) => l.trim().length > 0)
        return lines.slice(-limit)
      }
    } catch (err) {
      console.error('Falha ao ler arquivo de logs:', err)
    }
    return []
  }

  public clearLogs(): void {
    try {
      writeFileSync(this.logFilePath, '', 'utf-8')
      this.info('Histórico de logs limpo pelo usuário.')
    } catch (err) {
      console.error('Falha ao limpar logs:', err)
    }
  }

  public getLogPath(): string {
    return this.logFilePath
  }
}

export const logger = new AppLogger()
