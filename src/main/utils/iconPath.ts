import { join } from 'path'
import { existsSync } from 'fs'
import { nativeImage, NativeImage } from 'electron'

export function getAppIcon(): NativeImage | undefined {
  const candidates = [
    join(__dirname, '../../build/icon.ico'),
    join(__dirname, '../../resources/icon.ico'),
    join(process.cwd(), 'build/icon.ico'),
    join(process.cwd(), 'resources/icon.ico'),
    join(__dirname, '../../resources/icon.png'),
    join(process.cwd(), 'resources/icon.png'),
    join(__dirname, '../resources/icon.png'),
    join(__dirname, '../../src/renderer/src/assets/icon.png')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const img = nativeImage.createFromPath(candidate)
      if (!img.isEmpty()) {
        return img
      }
    }
  }

  return undefined
}
