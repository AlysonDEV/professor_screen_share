import React, { useState, useEffect } from 'react'
import { X, RefreshCw, Trash2, Copy, FileText, Check } from 'lucide-react'

interface LogViewerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LogViewerModal: React.FC<LogViewerModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLogs = async (): Promise<void> => {
    setIsLoading(true)
    try {
      if (window.electronAPI?.getLogs) {
        const list = await window.electronAPI.getLogs(300)
        setLogs(list)
      }
    } catch (err) {
      console.error('Falha ao carregar logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen])

  const handleClearLogs = async (): Promise<void> => {
    if (window.electronAPI?.clearLogs) {
      await window.electronAPI.clearLogs()
      fetchLogs()
    }
  }

  const handleOpenFile = (): void => {
    if (window.electronAPI?.openLogFile) {
      window.electronAPI.openLogFile()
    }
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Falha ao copiar:', err)
    }
  }

  if (!isOpen) return null

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.includes(`[${filterLevel}]`)
    const matchesSearch = !searchQuery || log.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesLevel && matchesSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg h-[540px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-100">Histórico de Logs (logs/app.log)</h2>
              <p className="text-[10px] text-slate-400">Diagnóstico e rastreamento em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Filtrar por texto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as 'ALL' | 'ERROR' | 'WARN' | 'INFO')}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">Todos</option>
            <option value="ERROR">Apenas Erros</option>
            <option value="WARN">Avisos</option>
            <option value="INFO">Informações</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenFile}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Abrir arquivo logs/app.log no Bloco de Notas"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copiar logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 transition-colors border border-red-900/50"
            title="Limpar arquivo de log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Log Viewer Content */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-slate-950 select-text space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Nenhum log encontrado.
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isError = line.includes('[ERROR]')
              const isWarn = line.includes('[WARN]')
              const isInfo = line.includes('[INFO]')

              return (
                <div
                  key={idx}
                  className={`p-1 rounded whitespace-pre-wrap break-all ${
                    isError
                      ? 'bg-red-950/40 text-red-300 border-l-2 border-red-500'
                      : isWarn
                        ? 'bg-amber-950/30 text-amber-300 border-l-2 border-amber-500'
                        : isInfo
                          ? 'text-slate-300'
                          : 'text-slate-400'
                  }`}
                >
                  {line}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
          <span>{filteredLogs.length} linha(s) exibida(s)</span>
          <span className="font-mono">logs/app.log</span>
        </div>
      </div>
    </div>
  )
}
