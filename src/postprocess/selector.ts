import { BoundingBox } from '../config/types'

export interface CapturedPhoto {
  dataUrl: string
  score: number
  width: number
  height: number
  timestamp: number
  label?: string
}

export interface PhotoFeatures {
  sharpness: number       // 0..1
  brightness: number      // 0..255
  faceArea: number        // 0..1
  compositionScore: number // 0..1
  faceBox: BoundingBox | null
}

function computeSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData
  let laplacian = 0
  const w = width, h = height

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114

      const top = ((y - 1) * w + x) * 4
      const bot = ((y + 1) * w + x) * 4
      const left = (y * w + (x - 1)) * 4
      const right = (y * w + (x + 1)) * 4

      const gTop = data[top] * 0.299 + data[top + 1] * 0.587 + data[top + 2] * 0.114
      const gBot = data[bot] * 0.299 + data[bot + 1] * 0.587 + data[bot + 2] * 0.114
      const gLeft = data[left] * 0.299 + data[left + 1] * 0.587 + data[left + 2] * 0.114
      const gRight = data[right] * 0.299 + data[right + 1] * 0.587 + data[right + 2] * 0.114

      const lap = Math.abs(4 * gray - gTop - gBot - gLeft - gRight)
      laplacian += lap
    }
  }

  // Normalize: higher = sharper
  const avg = laplacian / ((w - 2) * (h - 2))
  return Math.min(1, avg / 30)
}

function avgBrightness(imageData: ImageData): number {
  const { data } = imageData
  let sum = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }
  return sum / n
}

function compositionScore(faceBox: BoundingBox | null): number {
  if (!faceBox) return 0.5
  const cx = faceBox.x + faceBox.w / 2
  const cy = faceBox.y + faceBox.h / 2
  // Golden ratio thirds
  const thirdX = [1 / 3, 2 / 3]
  const thirdY = [1 / 3, 2 / 3]
  const distX = Math.min(...thirdX.map(t => Math.abs(cx - t)))
  const distY = Math.min(...thirdY.map(t => Math.abs(cy - t)))
  return Math.max(0, 1 - (distX + distY) * 2)
}

export function extractFeatures(
  canvas: HTMLCanvasElement,
  faceBox: BoundingBox | null
): PhotoFeatures {
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return {
    sharpness: computeSharpness(imageData),
    brightness: avgBrightness(imageData),
    faceArea: faceBox ? faceBox.w * faceBox.h : 0,
    compositionScore: compositionScore(faceBox),
    faceBox,
  }
}

export function scorePhoto(features: PhotoFeatures): number {
  const brightnessScore = 1 - Math.abs(features.brightness - 128) / 128
  return (
    0.30 * features.sharpness +
    0.20 * brightnessScore +
    0.20 * features.compositionScore +
    0.20 * Math.min(1, features.faceArea * 5) +
    0.10 * (features.faceBox ? 1 : 0)
  )
}

export function selectBestShots(photos: CapturedPhoto[], topK = 3): CapturedPhoto[] {
  const sorted = [...photos].sort((a, b) => b.score - a.score)
  const picks = sorted.slice(0, topK)

  const labels = ['最优', '次优', '备选']
  return picks.map((p, i) => ({ ...p, label: labels[i] ?? `第${i + 1}张` }))
}
