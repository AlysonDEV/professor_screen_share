import { join } from 'path'
import { existsSync } from 'fs'

export function getPreloadPath(): string {
  // Check for .mjs first (ESM build), then .js, then .cjs
  const mjsPath = join(__dirname, '../preload/index.mjs')
  if (existsSync(mjsPath)) {
    return mjsPath
  }

  const jsPath = join(__dirname, '../preload/index.js')
  if (existsSync(jsPath)) {
    return jsPath
  }

  const cjsPath = join(__dirname, '../preload/index.cjs')
  if (existsSync(cjsPath)) {
    return cjsPath
  }

  return mjsPath
}
