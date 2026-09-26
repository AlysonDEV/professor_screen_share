export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
  screenWidth?: number
  screenHeight?: number
  displayId?: number
}

export type AnnotationTool = 'arrow' | 'rect' | 'circle' | 'pen' | 'highlighter' | 'text'

export interface ActiveToolSettings {
  tool: AnnotationTool
  color: string
  width: number
}

export interface Point {
  x: number
  y: number
}

export interface BaseAnnotation {
  id: string
  color: string
  width: number
  tool: AnnotationTool
}

export interface ArrowAnnotation extends BaseAnnotation {
  tool: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface RectAnnotation extends BaseAnnotation {
  tool: 'rect'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface CircleAnnotation extends BaseAnnotation {
  tool: 'circle'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PenAnnotation extends BaseAnnotation {
  tool: 'pen' | 'highlighter'
  points: Point[]
}

export interface TextAnnotation extends BaseAnnotation {
  tool: 'text'
  x: number
  y: number
  text: string
  fontSize: number
}

export type Annotation =
  | ArrowAnnotation
  | RectAnnotation
  | CircleAnnotation
  | PenAnnotation
  | TextAnnotation

export interface DesktopSourceInfo {
  id: string
  name: string
  thumbnail: string
  displayId?: string
  isScreen: boolean
}

export interface DisplayInfo {
  id: number
  name: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isPrimary: boolean
  scaleFactor: number
}

export interface ViewerSettings {
  fitMode: 'contain' | 'cover' | 'fill'
  backgroundColor: string
  zoom: number
  flipHorizontal: boolean
}

export type WebViewerStatus = 'WAITING' | 'APPROVED' | 'REJECTED'

export interface WebViewerInfo {
  id: string
  name: string
  ip: string
  status: WebViewerStatus
  joinedAt: number
}

export interface WebStreamStatus {
  url: string
  port: number
  ip: string
  isRunning: boolean
  viewers: WebViewerInfo[]
}
