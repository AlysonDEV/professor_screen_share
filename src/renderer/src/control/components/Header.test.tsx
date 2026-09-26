import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Header } from './Header'

describe('Header component', () => {
  const minimizeMock = vi.fn()
  const maximizeMock = vi.fn()
  const closeMock = vi.fn()
  const isWindowMaximizedMock = vi.fn().mockResolvedValue(false)
  const onWindowMaximizedStateMock = vi.fn().mockReturnValue(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      minimizeWindow: minimizeMock,
      maximizeWindow: maximizeMock,
      closeWindow: closeMock,
      isWindowMaximized: isWindowMaximizedMock,
      onWindowMaximizedState: onWindowMaximizedStateMock
    } as unknown as typeof window.electronAPI
  })

  it('renders title and default Pronto status', () => {
    render(<Header isStreaming={false} />)
    expect(screen.getByText('Professor Screen Share')).toBeTruthy()
    expect(screen.getByText('Pronto')).toBeTruthy()
  })

  it('renders Ativo status when isStreaming is true', () => {
    render(<Header isStreaming={true} />)
    expect(screen.getByText('Ativo')).toBeTruthy()
  })

  it('triggers minimize, maximize, and close window actions', () => {
    render(<Header isStreaming={false} />)

    const minBtn = screen.getByTitle('Minimizar')
    fireEvent.click(minBtn)
    expect(minimizeMock).toHaveBeenCalledTimes(1)

    const maxBtn = screen.getByTitle('Maximizar')
    fireEvent.click(maxBtn)
    expect(maximizeMock).toHaveBeenCalledTimes(1)

    const closeBtn = screen.getByTitle('Fechar')
    fireEvent.click(closeBtn)
    expect(closeMock).toHaveBeenCalledTimes(1)
  })
})
