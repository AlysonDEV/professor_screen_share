import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AboutModal } from './AboutModal'

describe('AboutModal component', () => {
  const openExternalMock = vi.fn()
  const onCloseMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      openExternal: openExternalMock
    } as unknown as typeof window.electronAPI
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(<AboutModal isOpen={false} onClose={onCloseMock} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders developer name and GitHub repository link when open', () => {
    render(<AboutModal isOpen={true} onClose={onCloseMock} />)

    expect(screen.getByText('AlysonDEV')).toBeTruthy()
    expect(screen.getByText('Aincrad Development')).toBeTruthy()
    expect(screen.getByText('https://github.com/AlysonDEV/professor_screen_share')).toBeTruthy()
  })

  it('calls openExternal with GitHub repository URL on click', () => {
    render(<AboutModal isOpen={true} onClose={onCloseMock} />)

    const githubBtn = screen.getByText('Abrir no GitHub')
    fireEvent.click(githubBtn)

    expect(openExternalMock).toHaveBeenCalledWith('https://github.com/AlysonDEV/professor_screen_share')
  })

  it('calls onClose when close button is clicked', () => {
    render(<AboutModal isOpen={true} onClose={onCloseMock} />)

    const closeBtn = screen.getByTitle('Fechar (Esc)')
    fireEvent.click(closeBtn)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
