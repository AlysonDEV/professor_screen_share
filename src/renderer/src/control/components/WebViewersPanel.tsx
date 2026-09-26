import React, { useState, useEffect } from 'react'
import {
  Globe,
  Users,
  Check,
  X,
  UserX,
  Copy,
  CheckCheck,
  Radio,
  Clock
} from 'lucide-react'
import type { WebViewerInfo, WebStreamStatus } from '@shared/types'

export const WebViewersPanel: React.FC = () => {
  const [streamStatus, setStreamStatus] = useState<WebStreamStatus | null>(null)
  const [viewers, setViewers] = useState<WebViewerInfo[]>([])
  const [copied, setCopied] = useState(false)

  // Load initial status
  useEffect(() => {
    if (window.electronAPI?.getWebStreamStatus) {
      window.electronAPI.getWebStreamStatus().then((status) => {
        setStreamStatus(status)
        setViewers(status.viewers || [])
      }).catch((err) => {
        console.error('Erro ao obter status do servidor web:', err)
      })
    }

    // Subscribe to viewer changes
    const unsub = window.electronAPI?.onWebViewersUpdated?.((list) => {
      setViewers(list)
    })

    return (): void => {
      unsub?.()
    }
  }, [])

  const waitingViewers = viewers.filter((v) => v.status === 'WAITING')
  const approvedViewers = viewers.filter((v) => v.status === 'APPROVED')

  const handleCopyLink = (): void => {
    if (!streamStatus?.url) return
    navigator.clipboard.writeText(streamStatus.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApprove = (id: string): void => {
    window.electronAPI?.approveWebViewer?.(id)
  }

  const handleReject = (id: string): void => {
    window.electronAPI?.rejectWebViewer?.(id)
  }

  const handleKick = (id: string): void => {
    window.electronAPI?.kickWebViewer?.(id)
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold text-xs flex items-center justify-center border border-cyan-500/20">
            4
          </span>
          <h2 className="text-xs font-semibold text-slate-200">Screen Shared (Rede Local)</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Porta {streamStatus?.port || 3000}</span>
          </div>
        </div>
      </div>

      {/* URL Link Card */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Endereço de Acesso Local</span>
          </span>
          <span className="text-[10px] text-slate-500">Wi-Fi / LAN</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex-1 bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs font-mono text-cyan-300 truncate select-all">
            {streamStatus?.url || 'http://localhost:3000/screen_shared'}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Copiar link para enviar"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Waiting Room Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Esperando para Participar</span>
          </div>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
            waitingViewers.length > 0
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
              : 'text-slate-500'
          }`}>
            {waitingViewers.length}
          </span>
        </div>

        {waitingViewers.length === 0 ? (
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[11px] text-slate-500 text-center">
            Nenhuma solicitação de entrada pendente
          </div>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {waitingViewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center justify-between p-2 rounded-lg bg-amber-950/20 border border-amber-700/40 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-200 truncate">{viewer.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{viewer.ip}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(viewer.id)}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors shadow-sm shadow-emerald-600/30"
                    title="Aprovar entrada"
                  >
                    <Check className="w-3 h-3" />
                    <span>Aprovar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(viewer.id)}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700 transition-colors"
                    title="Recusar entrada"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Viewers Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <Users className="w-3.5 h-3.5" />
            <span>Visualizando Agora</span>
          </div>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-400">
            {approvedViewers.length}
          </span>
        </div>

        {approvedViewers.length === 0 ? (
          <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-[11px] text-slate-500 text-center">
            Nenhum usuário assistindo no momento
          </div>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {approvedViewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{viewer.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{viewer.ip}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleKick(viewer.id)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/80 text-[11px] flex items-center gap-1 transition-colors shrink-0"
                  title="Desconectar este usuário"
                >
                  <UserX className="w-3 h-3 text-rose-400" />
                  <span>Desconectar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
