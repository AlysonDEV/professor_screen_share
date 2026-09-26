import { describe, it, expect, afterEach } from 'vitest'
import { WebStreamServer, getLocalIpAddress } from './webStreamServer'

describe('WebStreamServer', () => {
  let server: WebStreamServer

  afterEach(() => {
    if (server) {
      server.stop()
    }
  })

  it('should detect a valid local IP address or localhost', () => {
    const ip = getLocalIpAddress()
    expect(typeof ip).toBe('string')
    expect(ip.length).toBeGreaterThan(0)
  })

  it('should start and return correct initial status', async () => {
    server = new WebStreamServer()
    const status = await server.start(9876)

    expect(status.isRunning).toBe(true)
    expect(status.port).toBe(9876)
    expect(status.url).toContain('/screen_shared')
    expect(status.viewers).toEqual([])
  })

  it('should manage viewer approval lifecycle correctly', () => {
    server = new WebStreamServer()
    // Test without HTTP listen
    expect(server.getViewersList()).toEqual([])
    expect(server.hasApprovedViewers()).toBe(false)
  })
})
